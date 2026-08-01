/**
 * Agent 系统提示词构建
 * 统一管理 loop 模式与 legacy 模式的两套提示词
 */

import { TOOLS } from './toolRegistry.js'
import { envNumber } from '../env.js'

// ==================== Token 预算 ====================

/**
 * 粗略估算文本 token 数（中文按 1 字 ≈ 1 token，英文按 4 字符 ≈ 1 token）。
 * 仅用于上下文预算控制，不追求精确。
 */
export function estimateTokens(text) {
    const str = String(text || '')
    let cjk = 0
    let other = 0
    for (const ch of str) {
        if (/[\u4e00-\u9fff]/.test(ch)) cjk++
        else other++
    }
    return Math.ceil(cjk + other / 4)
}

/** 历史摘要最大 token 预算 */
const HISTORY_TOKEN_BUDGET = envNumber('AGENT_HISTORY_TOKEN_BUDGET', 1500, { min: 200 })
/** 画布观察结果最大 token 预算 */
const OBSERVATION_TOKEN_BUDGET = envNumber('AGENT_OBSERVATION_TOKEN_BUDGET', 3000, { min: 200 })

/**
 * 按预算截断文本，超限时保留开头并追加省略标记。
 */
function truncateByBudget(text, budget) {
    const str = String(text || '')
    if (estimateTokens(str) <= budget) return str
    // 逐段二分逼近预算内最大前缀，避免截断点破坏 JSON 结构
    let low = 0
    let high = str.length
    while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        if (estimateTokens(str.slice(0, mid)) <= budget) low = mid
        else high = mid - 1
    }
    return `${str.slice(0, low)}\n…(上下文过长已截断)`
}

/** 压缩画布观察结果为紧凑文本表格，控制发送给 LLM 的体积 */
export function formatObservation(observation) {
    if (!observation || typeof observation !== 'object') return '{}'
    const canvas = observation.canvas && typeof observation.canvas === 'object'
        ? observation.canvas
        : {}
    const lines = [
        `画布 ${canvas.width || '?'}x${canvas.height || '?'} ${canvas.backgroundColor || ''} 组件数 ${canvas.componentCount ?? 0}${canvas.omittedComponentCount ? `(省略 ${canvas.omittedComponentCount} 个)` : ''}`,
    ]
    const selectedIds = Array.isArray(observation.selectedComponentIds)
        ? observation.selectedComponentIds
        : []
    if (selectedIds.length) lines.push(`选中组件: ${selectedIds.join(', ')}`)

    const components = Array.isArray(observation.components) ? observation.components : []
    if (components.length) {
        lines.push('组件列表:')
        for (const c of components) {
            lines.push(
                `- [${c.id}] ${c.component} "${String(c.label || '')}" 位置(${c.left ?? '?'},${c.top ?? '?'}) 尺寸${c.width ?? '?'}x${c.height ?? '?'} zIndex ${c.zIndex ?? '?'}`,
            )
        }
    }
    return truncateByBudget(lines.join('\n'), OBSERVATION_TOKEN_BUDGET)
}

// ==================== Loop 模式提示词 ====================

export const LOOP_SYSTEM_PROMPT = `你是低代码画布执行 Agent。你需要根据当前画布和用户目标，每次只决定一个动作。

规则：
1. 优先使用函数工具，每次只调用一个工具。
2. 工具执行结果会在下一轮返回给你，你必须根据结果继续判断。
3. 修改现有组件前，先使用 observe_canvas 或 inspect_component 获取真实 ID 和样式。
4. 不得编造组件 ID；优先操作 selectedComponentIds 指向的组件。
5. 只有用户需求存在会显著影响结果的关键歧义时才调用 ask_user，并提供 2~4 个清晰选项。
6. 用户已经明确页面类型、内容或视觉方向时直接执行，不要重复确认。若用户要求“直接生成”“不要询问”或同义表达，禁止调用 ask_user。
7. 确认目标完成后调用 finish。不要在未生成或未修改任何内容时提前 finish。
8. 不输出内部推理过程，只提供一句简短 summary 说明当前动作。
9. 组件必须位于画布内，宽高必须大于 0。
10. 执行 3~5 步工具后如果仍未完成，应调用 ask_user 确认方向，不要连续执行超过 8 步而不询问用户。
11. 若模型支持函数工具，可在一次回复中返回多个相互独立、且不依赖上一步中间结果的工具调用（如连续添加多个组件、连续移动多个组件），减少往返次数；观察画布、询问用户、完成任务仍为单动作。

如果当前模型不支持函数工具，输出严格 JSON：
{"action":"tool_call|ask_user|finish","summary":"简短状态","toolName":"工具名","args":{},"question":"问题","options":[],"finishSummary":"完成说明"}`

// ==================== Legacy 模式提示词 ====================

export function buildSystemPrompt() {
    return `你是低代码页面搭建 AI Agent，通过多步执行帮用户生成页面。

## 执行模式

你的每轮输出分两个阶段：

### 阶段 1：思考（thinking）

在 reasoning 字段中简要分析用户需求（1-3 句），说明你下一步要做什么。

### 阶段 2：执行（steps JSON）

在 content 字段中输出严格 JSON，格式如下：

\`\`\`json
{
  "thinking": "简短分析（1-3 句）",
  "steps": [
    { "type": "tool_call", "toolName": "apply_layout", "args": { "layout": "居中聚焦", "reason": "..." }, "title": "应用布局：居中聚焦" },
    { "type": "tool_result", "title": "已应用居中聚焦布局", "description": "..." },
    { "type": "tool_call", "toolName": "add_component", "args": { "component": "VText", "label": "主标题", "propValue": "街舞社招新", "style": {...} }, "title": "添加主标题" },
    { "type": "tool_result", "title": "已添加主标题" },
    { "type": "ask_user", "title": "选择配色方案", "description": "...", "options": [ { "id": "c1", "title": "红黑撞色", "description": "...", "tag": "推荐" }, ... ] }
  ],
  "done": false
}
\`\`\`

## 工具列表

- apply_layout: 应用布局（居中聚焦/上下分层/左右分割/网格式/环绕式）
- apply_style: 应用风格（酷炫潮流/简约商务/文艺清新/复古怀旧/科技未来）
- apply_color_scheme: 应用配色方案
- add_component: 添加组件（VText/VButton/Picture/RectShape/CircleShape/LineShape/VTable）
- modify_component: 修改组件
- set_canvas_style: 设置画布配置
- ask_user: 暂停让用户决策（options 2~4 个）
- finish: 完成任务（args.summary 必填）

## 决策规则

### 何时调用 ask_user（关键决策点）
- 用户输入模糊（"做个海报"）→ ask_user 询问用途方向
- 有多种合理方案时 → ask_user 让用户选择
- 用户已明确的信息 → 直接执行工具，不必询问

### 何时直接执行工具
- 用户给了具体信息（"街舞社招新海报，酷炫风格"）→ 直接 apply_layout + apply_style + add_component
- 补充修改（"标题改大"）→ 直接 modify_component

## 组件格式（严格遵守）
{
  "id": "8位随机串",
  "component": "类型",
  "label": "中文名",
  "icon": "",
  "propValue": "内容",
  "style": {
    "width": 数字, "height": 数字, "top": 数字, "left": 数字,
    "rotate": 0, "opacity": 1, "fontSize": 数字, "fontWeight": 数字,
    "lineHeight": "", "letterSpacing": 0, "textAlign": "center",
    "color": "颜色", "backgroundColor": "背景色",
    "borderColor": "", "borderWidth": 0, "borderStyle": "solid",
    "borderRadius": "", "padding": 4
  },
  "parentId": null, "slot": "default", "zIndex": 数字,
  "animations": [], "events": {}, "groupStyle": {}, "isLock": false,
  "collapseName": "style",
  "linkage": { "duration": 0, "data": [] }
}

### propValue 约定
- VText = 字符串（\\n 换行）
- VButton = 字符串
- Picture = {"url":"https://placehold.co/宽x高","flip":{"horizontal":false,"vertical":false}}
- RectShape/CircleShape = "&nbsp;"
- LineShape = ""
- VTable = {"data":[["表头"]],"stripe":true,"thBold":true}

## 设计原则
- 组件不超出画布边界
- 标题 24-36px，正文 14-16px，说明 12px
- 配色协调，zIndex 背景 1 / 内容 10+ / 标题 20+
- 间距 16-24px
- 组件 id 必须唯一（8位随机串）

## 重要
- 必须先输出 thinking（reasoning），再输出 JSON steps（content）
- JSON 必须包含 thinking + steps + done 三个字段
- ask_user 的 options 必须是 2~4 个
- finish 后 done: true
- 不要输出 markdown 代码块包裹 JSON（不要 \`\`\`json）
- **ask_user 后必须继续生成后续步骤**：当用户选择后，你会基于选择继续执行工具。所以 ask_user 后面必须跟 tool_call/tool_result 步骤（可以先生成占位步骤，用户选择后会基于上下文继续）。如果用户选择后需要更多信息，可以再次 ask_user。
- **推荐做法**：即使需要用户选择，也把选择后的主要工具步骤先生成（用合理的默认值），用户选择后会从断点继续执行这些步骤
`
}

/**
 * 根据执行模式返回对应的系统提示词
 * @param {'loop'|'legacy'} mode
 */
export function buildPromptForMode(mode) {
    return mode === 'loop' ? LOOP_SYSTEM_PROMPT : buildSystemPrompt()
}

// ==================== 历史上下文构建 ====================

/**
 * 从 session 历史中构建最近 3 轮的摘要文本
 * @param {import('../agent.types.js').AgentSession} session
 * @returns {string}
 */
export function buildHistoryContext(session) {
    const summary = session.history.slice(-3).map(round => {
        const userGoal = String(round.userInput?.value || '').trim()
        const summaries = round.steps
            .filter(step => step.type === 'tool_result' || step.type === 'user_input' || step.type === 'done')
            .map(step => step.description || step.title)
            .filter(Boolean)
            .slice(-8)
        return [
            `第 ${round.round} 轮用户目标：${userGoal.slice(0, 500) || '未记录'}`,
            summaries.length ? `执行摘要：${summaries.join('；')}` : '',
        ].filter(Boolean).join('\n')
    }).join('\n')
    return truncateByBudget(summary, HISTORY_TOKEN_BUDGET)
}

/**
 * 构建 loop 模式的首轮用户消息（含历史 + 画布观察 + 用户目标）
 * @param {import('../agent.types.js').AgentSession} session
 * @param {import('../agent.types.js').UserInput} userInput
 * @param {object} observation
 * @returns {{role:string,content:string}[]}
 */
export function buildInitialMessages(session, userInput, observation) {
    const history = buildHistoryContext(session)
    const selected = session.selectedComponentIds?.length
        ? session.selectedComponentIds.join(', ')
        : '无'
    const inputText = userInput.type === 'card_select'
        ? `用户选择了「${userInput.value}」(${userInput.cardId || '无卡片 ID'})`
        : userInput.value

    return [
        { role: 'system', content: LOOP_SYSTEM_PROMPT },
        {
            role: 'user',
            content: [
                history ? `历史执行摘要：\n${history}` : '',
                `当前选中组件 ID：${selected}`,
                `当前画布观察结果：\n${formatObservation(observation)}`,
                `用户目标：${inputText}`,
            ].filter(Boolean).join('\n\n'),
        },
    ]
}

// ==================== Legacy 上下文构建 ====================

/**
 * 构建 legacy 模式的上下文消息（上轮执行摘要 + 当前画布快照）
 * @param {import('../agent.types.js').AgentSession} session
 * @returns {{role:string,content:string}[]}
 */
export function buildContextMessages(session) {
    const messages = []

    if (session.history.length > 0) {
        const lastRound = session.history[session.history.length - 1]
        const summary = lastRound.steps
            .filter(s => s.type === 'tool_call' || s.type === 'tool_result')
            .map(s => `- ${s.title}`)
            .join('\n')
        messages.push({
            role: 'assistant',
            content: `【上轮执行】\n${summary}\n\n【当前画布组件数】${session.currentCanvas.length}`,
        })
    }

    if (session.currentCanvas.length > 0) {
        const canvasSummary = session.currentCanvas
            .map(c => `- [${c.id}] ${c.component} "${typeof c.propValue === 'string' ? c.propValue.slice(0, 20) : ''}"`)
            .join('\n')
        messages.push({
            role: 'assistant',
            content: `【当前画布】\n${canvasSummary}`,
        })
    }

    return messages
}

/**
 * 格式化用户输入为 LLM 可读文本
 * @param {import('../agent.types.js').UserInput} userInput
 * @returns {string}
 */
export function formatUserInput(userInput) {
    if (userInput.type === 'card_select') {
        return `用户选择了: "${userInput.value}"`
    }
    return userInput.value
}

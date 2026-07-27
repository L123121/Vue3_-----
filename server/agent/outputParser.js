import { validateToolCall } from './toolRegistry.js'

/**
 * LLM 输出解析器
 * 统一管理 agent 的决策解析和 JSON 提取逻辑
 * 覆盖 loop 模式的 function-calling 决策和 legacy 模式的 steps JSON 解析
 */

// ==================== 通用 JSON 工具 ====================

/**
 * 安全 JSON 解析，失败时返回 fallback
 * @param {string} value
 * @param {object} [fallback={}]
 */
export function safeJsonParse(value, fallback = {}) {
    if (typeof value !== 'string' || !value.trim()) return fallback
    try {
        return JSON.parse(value)
    } catch {
        return fallback
    }
}

/**
 * 尝试解析 JSON，失败返回 null
 * @param {string} [text]
 * @returns {object|null}
 */
export function tryParseJSON(text) {
    if (!text) return null
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

/**
 * 从文本中提取最大的合法 JSON 对象。
 * 使用括号平衡扫描避免贪心正则的灾难性回溯。
 * @param {string} text
 * @returns {string|null}
 */
export function extractLargestJSON(text) {
    if (typeof text !== 'string') return null
    const results = []
    for (let i = 0; i < text.length; i++) {
        if (text[i] !== '{') continue
        let depth = 0
        let inString = false
        let escape = false
        for (let j = i; j < text.length; j++) {
            const ch = text[j]
            if (inString) {
                if (escape) { escape = false }
                else if (ch === '\\') { escape = true }
                else if (ch === '"') { inString = false }
                continue
            }
            if (ch === '"') { inString = true; continue }
            if (ch === '{') { depth++ }
            else if (ch === '}') {
                depth--
                if (depth === 0) {
                    const candidate = text.slice(i, j + 1)
                    try {
                        JSON.parse(candidate)
                        results.push(candidate)
                    } catch { /* skip */ }
                    break
                }
            }
        }
    }
    if (results.length === 0) return null
    return results.sort((a, b) => b.length - a.length)[0]
}

/**
 * 从文本中提取 JSON 对象，支持 markdown 代码块围栏清理
 * @param {string} text
 * @returns {object|null}
 */
export function extractJsonObject(text) {
    if (typeof text !== 'string') return null
    const cleaned = text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim()
    try {
        return JSON.parse(cleaned)
    } catch {
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start === -1 || end <= start) return null
        try {
            return JSON.parse(cleaned.slice(start, end + 1))
        } catch {
            return null
        }
    }
}

// ==================== 决策解析（loop 模式） ====================

/**
 * 将 LLM 函数调用或 JSON 决策标准化为统一格式
 * @param {string} name — 工具名或 'ask_user' / 'finish'
 * @param {object} args
 * @param {string} [summary='']
 * @returns {object} { type, summary, toolName?, args?, question?, options?, finishSummary? }
 */
export function normalizeFunctionDecision(name, args, summary = '') {
    if (name === 'ask_user') {
        return {
            type: 'ask_user',
            summary: summary || String(args.question || '需要你的选择'),
            question: String(args.question || '请选择下一步方向'),
            description: typeof args.description === 'string' ? args.description : '',
            options: normalizeAskUserOptions(args.options),
        }
    }
    if (name === 'finish') {
        return {
            type: 'finish',
            summary: summary || String(args.summary || '任务已完成'),
            finishSummary: String(args.summary || '任务已完成'),
        }
    }
    return {
        type: 'tool_call',
        summary: summary || `准备执行 ${name}`,
        toolName: name,
        args: validateToolCall(name, args),
    }
}

export function normalizeAskUserOptions(options) {
    const normalized = (Array.isArray(options) ? options : [])
        .map((option, index) => {
            if (typeof option === 'string' && option.trim()) {
                return {
                    id: `option_${index + 1}`,
                    title: option.trim(),
                    description: `选择「${option.trim()}」继续生成`,
                }
            }
            if (!option || typeof option !== 'object') return null

            const title = String(option.title || option.label || option.value || '').trim()
            if (!title) return null
            return {
                id: String(option.id || `option_${index + 1}`),
                title,
                description: String(option.description || option.desc || `选择「${title}」继续生成`),
                ...(option.tag ? { tag: String(option.tag) } : {}),
            }
        })
        .filter(Boolean)
        .slice(0, 4)

    const fallbackOptions = [
        {
            id: 'continue_recommended',
            title: '按推荐方案继续',
            description: '保留当前方向，由 AI 完成剩余设计',
            tag: '推荐',
        },
        {
            id: 'refine_layout',
            title: '优先优化布局',
            description: '先调整信息层级、留白和组件位置',
        },
        {
            id: 'refine_visual',
            title: '优先强化视觉',
            description: '加强配色、对比和整体氛围',
        },
    ]

    const usedIds = new Set(normalized.map(option => option.id))
    for (const fallback of fallbackOptions) {
        if (normalized.length >= 2) break
        if (!usedIds.has(fallback.id)) normalized.push(fallback)
    }
    return normalized
}

/**
 * 从 LLM 消息中解析决策（支持 function-calling + JSON fallback）
 * @param {object} message — LLM 返回的 message 对象
 * @returns {object} 标准化决策 { type, summary, ... }
 */
export function parseDecision(message) {
    const toolCall = message?.tool_calls?.[0]
    if (toolCall?.function?.name) {
        const args = safeJsonParse(toolCall.function.arguments, {})
        return normalizeFunctionDecision(toolCall.function.name, args, message.content || '')
    }

    const parsed = extractJsonObject(message?.content || '')
    if (parsed?.action === 'ask_user') {
        return normalizeFunctionDecision('ask_user', {
            question: parsed.question,
            description: parsed.description,
            options: parsed.options,
        }, parsed.summary)
    }
    if (parsed?.action === 'finish') {
        return normalizeFunctionDecision('finish', {
            summary: parsed.finishSummary || parsed.summary,
        }, parsed.summary)
    }
    if (parsed?.action === 'tool_call' && parsed.toolName) {
        return normalizeFunctionDecision(parsed.toolName, parsed.args || {}, parsed.summary)
    }

    // 最后兜底：legacy parseAgentOutput
    const legacy = parseAgentOutput(message?.content || '')
    const nextStep = legacy?.steps?.find(step => (
        step.type === 'tool_call'
        || step.type === 'ask_user'
        || step.type === 'user_input'
        || step.type === 'finish'
        || step.type === 'done'
    ))
    if (!nextStep) throw new Error('模型没有返回可执行动作')
    if (nextStep.type === 'ask_user' || nextStep.type === 'user_input') {
        return normalizeFunctionDecision('ask_user', {
            question: nextStep.title,
            description: nextStep.description,
            options: nextStep.options || nextStep.cards,
        }, legacy.thinking)
    }
    if (nextStep.type === 'finish' || nextStep.type === 'done') {
        return normalizeFunctionDecision('finish', {
            summary: nextStep.title || nextStep.args?.summary,
        }, legacy.thinking)
    }
    return normalizeFunctionDecision(
        nextStep.toolName,
        nextStep.toolArgs || nextStep.args || {},
        legacy.thinking || nextStep.title,
    )
}

// ==================== Steps 解析（legacy 模式） ====================

/**
 * 解析模型 content 为 AgentOutput（{ thinking, steps, done }）
 * 采用"严格优先 + 单一容错"策略
 * @param {string} content
 * @returns {{ thinking: string, steps: any[], done: boolean } | null}
 */
export function parseAgentOutput(content) {
    if (!content || typeof content !== 'string') {
        console.error('[Agent] Empty content')
        return null
    }

    // 尝试 1：直接解析
    let raw = tryParseJSON(content)
    if (raw && Array.isArray(raw.steps)) {
        return normalizeOutput(raw)
    }

    // 尝试 2：清理 markdown 代码块后解析
    const cleaned = content.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim()
    if (cleaned !== content.trim()) {
        raw = tryParseJSON(cleaned)
        if (raw && Array.isArray(raw.steps)) {
            return normalizeOutput(raw)
        }
    }

    // 尝试 3：从混乱文本中提取最大合法 JSON
    const jsonMatch = extractLargestJSON(cleaned)
    if (jsonMatch) {
        raw = tryParseJSON(jsonMatch)
        if (raw && Array.isArray(raw.steps)) {
            console.warn('[Agent] Parsed from extracted JSON subset')
            return normalizeOutput(raw)
        }
    }

    console.error('[Agent] Failed to parse. First 500 chars:', content.slice(0, 500))
    return null
}

function normalizeOutput(raw) {
    return {
        thinking: raw.thinking || '',
        steps: Array.isArray(raw.steps) ? raw.steps : [],
        done: !!raw.done,
    }
}

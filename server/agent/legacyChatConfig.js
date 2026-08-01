/**
 * 旧版 AI 聊天路由（/api/ai/chat）的提示词与工具定义。
 * 从 routes/ai.js 中抽离，保持路由文件聚焦请求处理逻辑。
 */

// ==================== 系统提示词 ====================

export const SYSTEM_PROMPT = `你是一个低代码页面搭建 AI Agent，为大学社团运营部生成海报和报名表。

## 你的 5 个工具

1. **ask_question** — 开放式提问。当你需要用户提供具体信息时使用（如"海报标题写什么？""需要放哪些信息？"）。用户会自由输入回答。
2. **propose_options** — 选择题。当有 2~3 个明确方案可选时使用（如布局方式、配色风格）。用户点击选择。
3. **confirm_plan** — 方案确认。生成前展示你的设计方案摘要，让用户确认或提出修改意见。
4. **generate_page** — 生成页面。用户确认后执行。
5. **edit_page** — 修改页面。画布已有组件时，用户给出修改指令直接执行。

## 决策逻辑（你是 Agent，自主判断）

**核心原则：永远优先给选项让用户点击，而不是让用户打字。**

分析用户输入，然后**自主选择**最合适的工具：

- 用户描述模糊（"做个海报"）→ propose_options 给出 2~3 种方向（如"招新海报 / 活动宣传 / 报名表"），让用户点选
- 用户选了方向但细节不明 → propose_options 继续给选项（如风格"酷炫 / 文艺 / 简约"）
- 方向明确了 → confirm_plan 展示方案让用户确认
- 用户确认了 → generate_page 生成
- 用户说"直接生成"/"不用确认了" → 跳过确认直接 generate_page
- 画布有组件 + 用户要改 → edit_page 直接执行
- 用户描述非常具体 → 可以跳过选项直接 confirm_plan 或 generate_page
- **只有**当用户意图完全无法猜测、且无法给出合理选项时，才用 ask_question（极少使用）

**禁止连续 ask_question。能猜就猜，能给选项就给选项。**

## 关键规则
- 每次必须调用一个工具，不要只回复文字
- ask_question 一次只问一个问题，不要一次问多个
- propose_options 给 2~3 个选项，description 要具体
- confirm_plan 的 summary 要简洁，details 列出 3~5 个要点
- 生成时严格遵循用户之前表达的所有偏好
- 修改时只改用户提到的部分

## 组件类型
VText(文字) VButton(按钮) Picture(图片,用https://placehold.co/宽x高) RectShape(矩形/色块) CircleShape(圆形) LineShape(直线) VTable(表格)

## 组件格式
{ "id": "8位随机串", "component": "类型", "label": "中文名", "icon": "", "propValue": "内容",
  "style": { "width": 数字, "height": 数字, "top": 数字, "left": 数字, "rotate": 0, "opacity": 1, "fontSize": 数字, "fontWeight": 数字, "lineHeight": "", "letterSpacing": 0, "textAlign": "center", "color": "颜色", "backgroundColor": "背景色", "borderColor": "", "borderWidth": 0, "borderStyle": "solid", "borderRadius": "", "padding": 4 },
  "parentId": null, "slot": "default", "zIndex": 数字,
  "animations": [], "events": {}, "groupStyle": {}, "isLock": false, "collapseName": "style",
  "linkage": { "duration": 0, "data": [{ "id": "", "label": "", "event": "", "style": [{ "key": "", "value": "" }] }] } }

propValue: VText=字符串(\\n换行) VButton=字符串 Picture={"url":"","flip":{"horizontal":false,"vertical":false}} RectShape/CircleShape="&nbsp;" LineShape="" VTable={"data":[["表头"]],"stripe":true,"thBold":true}

## 设计原则
组件不超画布 | 标题24-36px 正文14-16px 说明12px | 配色协调 | zIndex背景1内容10+标题20+ | 间距16-24px`

// ==================== Tool 定义 ====================

export const LEGACY_CHAT_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'ask_question',
            description: '向用户提出一个开放式问题（极少使用，优先用 propose_options）。附带 2~3 个快捷回复建议供用户点选。',
            parameters: {
                type: 'object',
                properties: {
                    question: { type: 'string', description: '要问用户的问题' },
                    suggestions: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2~3 个快捷回复建议，用户可点击直接发送',
                    },
                },
                required: ['question', 'suggestions'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'propose_options',
            description: '给出 2~3 种方案供用户点击选择（布局、风格等有明确选项的场景）',
            parameters: {
                type: 'object',
                properties: {
                    reply: { type: 'string', description: '引导语' },
                    options: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                tag: { type: 'string' },
                            },
                            required: ['id', 'title', 'description'],
                        },
                    },
                },
                required: ['reply', 'options'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'confirm_plan',
            description: '生成前展示设计方案摘要，让用户确认或提出修改',
            parameters: {
                type: 'object',
                properties: {
                    summary: { type: 'string', description: '方案一句话概述' },
                    details: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '3~5 个设计要点',
                    },
                },
                required: ['summary', 'details'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'generate_page',
            description: '生成全新页面（用户确认方案后执行）',
            parameters: {
                type: 'object',
                properties: {
                    reply: { type: 'string' },
                    canvasStyle: {
                        type: 'object',
                        properties: {
                            width: { type: 'number' },
                            height: { type: 'number' },
                            backgroundColor: { type: 'string' },
                        },
                        required: ['width', 'height', 'backgroundColor'],
                    },
                    components: { type: 'array', items: { type: 'object' } },
                },
                required: ['reply', 'canvasStyle', 'components'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'edit_page',
            description: '增量修改现有页面',
            parameters: {
                type: 'object',
                properties: {
                    reply: { type: 'string' },
                    operations: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['add', 'modify', 'delete', 'move'] },
                                id: { type: 'string' },
                                component: { type: 'object' },
                                style: { type: 'object' },
                                propValue: {},
                                top: { type: 'number' },
                                left: { type: 'number' },
                            },
                            required: ['type'],
                        },
                    },
                },
                required: ['reply', 'operations'],
            },
        },
    },
]

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/
const USER_INPUT_TYPES = new Set(['free_text', 'card_select'])
const MODES = new Set(['loop', 'legacy'])

export function validateAgentRequest(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: '请求体必须是对象', status: 400 }
    }

    const userInput = body.userInput
    if (!userInput || typeof userInput !== 'object') {
        return { error: '请提供 userInput', status: 400 }
    }
    const value = String(userInput.value || '').trim()
    if (!value) return { error: '输入内容不能为空', status: 400 }
    if (value.length > 4000) return { error: '输入内容过长，请控制在 4000 字以内', status: 413 }
    const type = USER_INPUT_TYPES.has(userInput.type) ? userInput.type : 'free_text'

    const sessionId = body.sessionId === null || body.sessionId === undefined
        ? null
        : String(body.sessionId)
    if (sessionId && !SESSION_ID_PATTERN.test(sessionId)) {
        return { error: 'sessionId 格式无效', status: 400 }
    }

    const mode = MODES.has(body.mode) ? body.mode : 'loop'
    const context = body.context && typeof body.context === 'object' ? body.context : undefined
    if (context?.components && (!Array.isArray(context.components) || context.components.length > 200)) {
        return { error: '画布组件数量不能超过 200', status: 413 }
    }
    if (context?.selectedComponentIds
        && (!Array.isArray(context.selectedComponentIds) || context.selectedComponentIds.length > 200)) {
        return { error: '选中组件数量无效', status: 400 }
    }

    return {
        data: {
            sessionId,
            userInput: {
                type,
                value,
                ...(userInput.cardId ? { cardId: String(userInput.cardId).slice(0, 100) } : {}),
            },
            stream: body.stream === true,
            resume: body.resume === true,
            context,
            mode,
        },
    }
}

export function validateLegacyChatRequest(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: '请求体必须是对象', status: 400 }
    }
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) return { error: '请提供 prompt 字段', status: 400 }
    if (prompt.length > 4000) return { error: '输入内容过长，请控制在 4000 字以内', status: 413 }
    if (body.components && (!Array.isArray(body.components) || body.components.length > 200)) {
        return { error: '画布组件数量不能超过 200', status: 413 }
    }
    return {
        data: {
            ...body,
            prompt,
            history: Array.isArray(body.history) ? body.history.slice(-10) : [],
            components: Array.isArray(body.components) ? body.components : [],
        },
    }
}

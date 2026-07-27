/**
 * AI Agent 多轮决策 API（流式版 + 兼容批处理）
 */

import type { CanvasStyleData, ComponentData } from '@/types'
import { buildApiHeaders, buildApiUrl, createApiClient } from '@/api/client'
import type {
    AgentCard,
    AgentValidationReport,
    RoundRequest,
    RoundResponse,
    StepStatus,
    StepType,
} from '@/types/agent'

const api = createApiClient(180000)

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const msg = error.response?.data?.error || error.message || '请求失败'
        return Promise.reject(new Error(msg))
    },
)

/**
 * 发送一轮决策请求（批处理模式，兼容旧逻辑）
 */
export async function agentRound(params: RoundRequest): Promise<RoundResponse> {
    return await api.post('/api/ai/agent/round', { ...params, stream: false })
}

export type AgentStreamEvent =
    | { event: 'thinking_start'; data: Record<string, never> }
    | { event: 'thinking_delta'; data: { text: string } }
    | { event: 'thinking'; data: { text: string } }
    | { event: 'tool_call'; data: { step: AgentStreamStep } }
    | { event: 'tool_result'; data: { step: AgentStreamStep } }
    | { event: 'user_input'; data: { step: AgentStreamStep } }
    | { event: 'done'; data: RoundResponse }
    | { event: 'error'; data: { message: string; code: string; debug?: string } }

export interface AgentStreamStep {
    id: string
    type: StepType
    title: string
    description?: string
    status: StepStatus
    toolName?: string
    toolArgs?: Record<string, unknown>
    result?: string
    cards?: AgentCard[]
    preview?: ComponentData[]
    canvasStyle?: CanvasStyleData
    observation?: Record<string, unknown>
    validation?: AgentValidationReport
}

export interface AgentStreamHandlers {
    onThinkingStart?: () => void
    onThinkingDelta?: (text: string) => void
    onThinking?: (text: string) => void
    onToolCall?: (step: AgentStreamStep) => void
    onToolResult?: (step: AgentStreamStep) => void
    onUserInput?: (step: AgentStreamStep) => void
    onDone?: (response: RoundResponse) => void
    onError?: (message: string, code: string, debug?: string) => void
}

export interface AgentStreamOptions {
    /** 是否恢复断点（用户选择卡片时） */
    resume?: boolean
    signal?: AbortSignal
}

export interface AgentSSEParser {
    push: (chunk: string) => void
    finish: () => void
}

/**
 * 创建可跨网络分块工作的 SSE 解析器。
 * event/data 可能被拆到不同 chunk，因此事件状态必须持续保留。
 */
export function createAgentSSEParser(onEvent: (event: string, data: unknown) => void): AgentSSEParser {
    let buffer = ''
    let eventName = ''
    let dataLines: string[] = []

    const dispatch = () => {
        if (!dataLines.length) {
            eventName = ''
            return
        }

        const rawData = dataLines.join('\n')
        let data: unknown = rawData
        try {
            data = JSON.parse(rawData)
        } catch {
            // 非 JSON 数据按原文本透传，交给事件处理器决定是否忽略。
        }

        onEvent(eventName || 'message', data)
        eventName = ''
        dataLines = []
    }

    const consumeLine = (rawLine: string) => {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
        if (!line) {
            dispatch()
            return
        }
        if (line.startsWith(':')) return

        const colonIndex = line.indexOf(':')
        const field = colonIndex === -1 ? line : line.slice(0, colonIndex)
        let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1)
        if (value.startsWith(' ')) value = value.slice(1)

        if (field === 'event') eventName = value
        if (field === 'data') dataLines.push(value)
    }

    return {
        push(chunk: string) {
            buffer += chunk
            let newlineIndex = buffer.indexOf('\n')
            while (newlineIndex !== -1) {
                consumeLine(buffer.slice(0, newlineIndex))
                buffer = buffer.slice(newlineIndex + 1)
                newlineIndex = buffer.indexOf('\n')
            }
        },
        finish() {
            if (buffer) consumeLine(buffer)
            buffer = ''
            dispatch()
        },
    }
}

/**
 * 流式执行一轮决策（SSE）。
 * 使用 fetch + ReadableStream 原生解析，避免 EventSource 的 GET 限制。
 */
export async function agentStreamRound(
    params: Omit<RoundRequest, 'stream'>,
    handlers: AgentStreamHandlers,
    options: AgentStreamOptions = {},
): Promise<void> {
    const { resume, signal } = options
    const response = await fetch(buildApiUrl('/api/ai/agent/round'), {
        method: 'POST',
        headers: buildApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...params, mode: params.mode || 'loop', stream: true, resume: !!resume }),
        signal,
    })

    if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '')
        let msg = text.slice(0, 200) || `HTTP ${response.status}`
        try {
            const payload = JSON.parse(text)
            msg = payload.error || payload.message || msg
        } catch {
            // 保留文本错误信息。
        }
        handlers.onError?.(msg, 'HTTP_ERROR')
        return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const parser = createAgentSSEParser((event, data) => dispatchEvent(event, data, handlers))

    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        parser.push(decoder.decode(value, { stream: true }))
    }

    parser.push(decoder.decode())
    parser.finish()
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function dispatchEvent(event: string, data: unknown, handlers: AgentStreamHandlers) {
    const payload = isRecord(data) ? data : {}
    switch (event) {
        case 'thinking_start':
            handlers.onThinkingStart?.()
            break
        case 'thinking_delta':
            if (typeof payload.text === 'string') handlers.onThinkingDelta?.(payload.text)
            break
        case 'thinking':
            if (typeof payload.text === 'string') handlers.onThinking?.(payload.text)
            break
        case 'tool_call':
            if (isRecord(payload.step)) handlers.onToolCall?.(payload.step as unknown as AgentStreamStep)
            break
        case 'tool_result':
            if (isRecord(payload.step)) handlers.onToolResult?.(payload.step as unknown as AgentStreamStep)
            break
        case 'user_input':
            if (isRecord(payload.step)) handlers.onUserInput?.(payload.step as unknown as AgentStreamStep)
            break
        case 'done':
            if (isRecord(data)) handlers.onDone?.(data as unknown as RoundResponse)
            break
        case 'error':
            handlers.onError?.(
                typeof payload.message === 'string' ? payload.message : 'Agent 请求失败',
                typeof payload.code === 'string' ? payload.code : 'UNKNOWN_ERROR',
                typeof payload.debug === 'string' ? payload.debug : undefined,
            )
            break
        default:
            break
    }
}
export default api

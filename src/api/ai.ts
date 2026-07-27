/**
 * AI 页面生成 API 服务（多轮对话）
 */
import type { ComponentData, CanvasStyleData } from '@/types'
import { createApiClient } from '@/api/client'

export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface AIAction {
    type: 'generate' | 'add' | 'modify' | 'delete' | 'move'
    components?: ComponentData[]
    canvasStyle?: CanvasStyleData
    component?: ComponentData
    id?: string
    style?: Record<string, unknown>
    propValue?: unknown
    top?: number
    left?: number
}

export interface AIOption {
    id: string
    title: string
    description: string
    tag?: string
}

export interface AIPlan {
    summary: string
    details: string[]
}

export interface AIChatResponse {
    reply: string
    actions: AIAction[]
    options?: AIOption[]
    question?: string
    suggestions?: string[]
    plan?: AIPlan
}

const api = createApiClient(60000)

/**
 * 多轮对话：生成或增量编辑页面
 */
export async function chatWithAI(params: {
    prompt: string
    history: ChatMessage[]
    components: ComponentData[]
    canvasStyle: CanvasStyleData
    canvasWidth?: number
    canvasHeight?: number
}): Promise<AIChatResponse> {
    const { data } = await api.post<AIChatResponse>('/api/ai/chat', params)
    return data
}

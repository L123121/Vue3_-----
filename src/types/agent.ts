/**
 * AI Agent 多轮执行类型定义
 */

import type { ComponentData, CanvasStyleData } from '@/types'

export type StreamEventType =
    | 'thinking_start'
    | 'thinking_delta'
    | 'thinking'
    | 'tool_call'
    | 'tool_result'
    | 'user_input'
    | 'done'
    | 'error'

export interface StreamEvent {
    event: StreamEventType
    data: unknown
}

export interface AgentCard {
    id: string
    title: string
    description: string
    tag?: string
    icon?: string
}

export interface UserInput {
    type: 'card_select' | 'free_text'
    value: string
    cardId?: string
}

export type StepType = 'thinking' | 'tool_call' | 'tool_result' | 'user_input' | 'done'
export type StepStatus = 'pending' | 'running' | 'success' | 'error'

export interface AgentValidationIssue {
    code: 'DUPLICATE_ID' | 'INVALID_SIZE' | 'OUT_OF_BOUNDS' | 'SEVERE_OVERLAP' | 'MISSING_COMPONENT'
    severity: 'warning' | 'error'
    componentIds: string[]
    message: string
    suggestion?: string
}

export interface AgentValidationReport {
    valid: boolean
    errors: AgentValidationIssue[]
    warnings: AgentValidationIssue[]
}

/** 步骤增量 diff 摘要（服务端 attachStepDiffs 生成，供审批 UI 展示） */
export interface AgentStepDiff {
    added: string[]
    modified: string[]
    removed: string[]
    summary: string
}

export interface AgentStep {
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
    diff?: AgentStepDiff
}

export interface AgentViewport {
    width: number
    height: number
    scale: number
}

export interface AgentContext {
    components: ComponentData[]
    canvasStyle: CanvasStyleData
    selectedComponentIds: string[]
    viewport: AgentViewport
    dataVersion: number
}

export interface AgentSession {
    id: string
    createdAt: number
    updatedAt: number
    history: RoundRecord[]
    decisions: Record<string, string>
    currentCanvas: ComponentData[]
    canvasStyle: CanvasStyleData
    currentDimension: string
    round: number
    status: 'active' | 'completed' | 'expired'
    selectedComponentIds: string[]
    viewport: AgentViewport
    sourceDataVersion?: number
    pendingSteps?: AgentStep[]
    pendingStepIndex?: number
}

export interface RoundRecord {
    round: number
    userInput: UserInput
    steps: AgentStep[]
    canvasAfter: ComponentData[]
}

export interface RoundRequest {
    sessionId: string | null
    userInput: UserInput
    context?: AgentContext
    mode?: 'loop' | 'legacy'
}

/** token 用量统计（服务端 llmProvider 透出 + session 累计） */
export interface TokenUsage {
    promptTokens: number
    completionTokens: number
    totalTokens: number
}

export interface RoundResponse {
    sessionId: string
    steps: AgentStep[]
    preview: ComponentData[]
    canvasStyle: CanvasStyleData
    done: boolean
    waitingForInput: boolean
    currentDimension: string
    stepLimitReached?: boolean
    validation?: AgentValidationReport
    tokenUsage?: TokenUsage
    progress: {
        currentStep: number
        totalSteps: number
        dimensions: string[]
    }
}

export interface AgentOutput {
    thinking?: string
    steps: AgentStep[]
    done: boolean
}

export interface ToolDefinition {
    name: string
    description: string
    parameters: Record<string, unknown>
}

export interface DimensionMeta {
    key: string
    label: string
    icon: string
}

export const DIMENSION_META: Record<string, DimensionMeta> = {
    layout: { key: 'layout', label: '布局方式', icon: 'layout' },
    style: { key: 'style', label: '视觉风格', icon: 'palette' },
    color: { key: 'color', label: '配色方案', icon: 'contrast' },
    content: { key: 'content', label: '内容细节', icon: 'edit' },
    typography: { key: 'typography', label: '字体风格', icon: 'text' },
    decoration: { key: 'decoration', label: '装饰元素', icon: 'sparkles' },
    purpose: { key: 'purpose', label: '用途方向', icon: 'question' },
}

export function getDimensionLabel(key: string): string {
    return DIMENSION_META[key]?.label ?? key
}

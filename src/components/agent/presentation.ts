import type { AgentStep } from '@/types/agent'

export interface MessageGroup {
    id: string
    type: 'user' | 'agent' | 'ask_user' | 'done'
    steps: AgentStep[]
    thinking?: AgentStep
}

const TOOL_LABELS: Record<string, string> = {
    observe_canvas: '读取画布',
    inspect_component: '检查组件',
    apply_layout: '设置布局',
    apply_style: '设置风格',
    apply_color_scheme: '设置配色',
    set_canvas_style: '设置画布',
    add_component: '添加组件',
    modify_component: '修改组件',
    move_component: '移动组件',
    resize_component: '调整尺寸',
    delete_component: '删除组件',
    reorder_layer: '调整图层',
}

export function toolLabel(toolName = ''): string {
    return TOOL_LABELS[toolName] || toolName || '执行操作'
}

export function localizeToolNames(text = ''): string {
    return Object.entries(TOOL_LABELS).reduce(
        (result, [toolName, label]) => result.split(toolName).join(label),
        text,
    )
}

export function toolStepTitle(step: AgentStep): string {
    const title = String(step.title || '').trim()
    if (!step.toolName) return localizeToolNames(title)
    if (!title || (title.includes(step.toolName) && /(准备执行|执行|调用)/.test(title))) {
        return toolLabel(step.toolName)
    }
    return localizeToolNames(title)
}

export function resultStepTitle(step: AgentStep, allSteps: AgentStep[]): string {
    const callId = step.id.startsWith('result_') ? step.id.slice('result_'.length) : ''
    const callStep = allSteps.find(item => item.type === 'tool_call' && item.id === callId)
    if (!callStep) return localizeToolNames(step.title)
    return `${step.status === 'error' ? '执行失败' : '已完成'}：${toolStepTitle(callStep)}`
}

export function isRedundantThinking(group: MessageGroup): boolean {
    const thinking = String(group.thinking?.description || group.thinking?.title || '').trim()
    if (!thinking) return true

    return group.steps.some(step => {
        if (step.type !== 'tool_call') return false
        const stepTitle = String(step.title || '').trim()
        if (thinking === stepTitle) return true
        return Boolean(step.toolName
            && thinking.includes(step.toolName)
            && /(准备执行|执行|调用)/.test(thinking))
    })
}

export function formatToolArgs(toolName: string, args: Record<string, unknown>): string {
    if (!args || typeof args !== 'object') return ''
    switch (toolName) {
        case 'add_component':
            return `${args.component || ''} ${args.label ? `"${args.label}"` : ''}`
        case 'modify_component':
        case 'move_component':
        case 'resize_component':
        case 'delete_component':
        case 'inspect_component':
            return Object.entries(args).slice(0, 3)
                .map(([key, value]) => key === 'style' && typeof value === 'object'
                    ? JSON.stringify(value)
                    : `${key}: ${value}`)
                .join(' ')
        case 'apply_layout':
            return `布局: ${args.layout || ''}`
        case 'apply_style':
            return `风格: ${args.style || ''}`
        case 'apply_color_scheme':
            return `配色: ${args.scheme || ''}`
        case 'set_canvas_style':
            return `背景: ${args.backgroundColor || '—'}`
        case 'reorder_layer':
            return `id: ${args.id || ''} → ${args.action || ''}`
        default:
            return Object.entries(args).slice(0, 2)
                .map(([key, value]) => `${key}=${value}`)
                .join(' ')
    }
}

export function groupTitle(group: MessageGroup): string {
    if (group.type === 'agent') {
        const summary = group.steps
            .filter(step => step.type === 'tool_call')
            .map(step => toolLabel(step.toolName))
            .filter((label, index, labels) => labels.indexOf(label) === index)
            .join('、')
        return summary ? `执行：${summary}` : localizeToolNames(group.thinking?.title || '思考中...')
    }
    return group.steps[0]?.title || ''
}

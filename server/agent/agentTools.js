/**
 * Agent 画布工具注册与执行
 */

import { normalizeComponent } from '../agentHelper.js'
import { envNumber } from '../env.js'
import { ToolError, ToolErrorCode } from './toolError.js'
import { validateComponentPlacement } from './canvasValidator.js'
import { computeLayoutPositions, nextFreePosition, applyStyleDefaults } from './layoutEngine.js'

const SUPPORTED_COMPONENTS = new Set([
    'VText',
    'VButton',
    'Picture',
    'RectShape',
    'CircleShape',
    'LineShape',
    'VTable',
])
const MAX_CONTEXT_COMPONENTS = envNumber('AGENT_MAX_CONTEXT_COMPONENTS', 100, { min: 10, max: 200 })

function clone(value) {
    return JSON.parse(JSON.stringify(value))
}

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function requireId(args, toolName) {
    if (!args.id || typeof args.id !== 'string') {
        throw new ToolError(
            ToolErrorCode.MISSING_ARG,
            `${toolName} 缺少 id 参数`,
            '请提供画布上已存在组件的真实 id（可先用 observe_canvas 获取）',
        )
    }
    return args.id
}

function normalizeLayers(components) {
    components.forEach((component, index) => {
        component.zIndex = index + 1
    })
}

function summarizeComponent(component) {
    return {
        id: component.id,
        component: component.component,
        label: component.label,
        propValue: typeof component.propValue === 'string'
            ? component.propValue.slice(0, 120)
            : component.propValue,
        style: component.style,
        parentId: component.parentId,
        zIndex: component.zIndex,
        isLock: component.isLock,
    }
}

/**
 * 紧凑组件摘要（观察画布时使用，控制上下文 token 开销）。
 * 只保留定位/尺寸/图层等决策必需字段，不携带完整 style 与 propValue。
 */
function compactComponent(component) {
    return {
        id: component.id,
        component: component.component,
        label: component.label,
        left: component.style?.left,
        top: component.style?.top,
        width: component.style?.width,
        height: component.style?.height,
        zIndex: component.zIndex,
    }
}

export function observeCanvas(preview, canvasStyle, session) {
    const selectedIds = new Set(session.selectedComponentIds || [])
    const summarizedComponents = preview.map(summarizeComponent)
    const visibleComponents = summarizedComponents.slice(0, MAX_CONTEXT_COMPONENTS)
    const visibleIds = new Set(visibleComponents.map(component => component.id))
    for (const component of summarizedComponents) {
        if (selectedIds.has(component.id) && !visibleIds.has(component.id)) {
            visibleComponents.push(component)
            visibleIds.add(component.id)
        }
    }
    return {
        canvas: {
            width: canvasStyle.width,
            height: canvasStyle.height,
            backgroundColor: canvasStyle.backgroundColor,
            componentCount: preview.length,
            omittedComponentCount: Math.max(0, preview.length - visibleComponents.length),
        },
        selectedComponentIds: [...selectedIds],
        // 选中组件保留完整详情，便于精确修改
        selectedComponents: preview.filter(component => selectedIds.has(component.id)).map(summarizeComponent),
        // 全量组件列表用紧凑摘要，控制上下文体积
        components: visibleComponents.map(compactComponent),
    }
}

export function executeTool(toolName, rawArgs, preview, canvasStyle, session) {
    const args = asObject(rawArgs)
    const newPreview = clone(preview || [])
    const newCanvasStyle = { ...canvasStyle }
    let currentDimension = session.currentDimension
    let summary = ''
    let observation

    switch (toolName) {
        case 'observe_canvas':
            observation = observeCanvas(newPreview, newCanvasStyle, session)
            summary = `已读取画布：${newPreview.length} 个组件`
            break
        case 'inspect_component': {
            const id = requireId(args, toolName)
            const component = newPreview.find(item => item.id === id)
            if (!component) throw new ToolError(ToolErrorCode.COMPONENT_NOT_FOUND, `组件 ${id} 不存在`, `画布上没有 id 为 ${id} 的组件，请先用 observe_canvas 获取真实 id`)
            observation = { component: summarizeComponent(component) }
            summary = `已读取组件「${component.label || component.component}」`
            break
        }
        case 'apply_layout':
            currentDimension = '布局方式'
            session.decisions.layout = String(args.layout || '')
            // 由服务端计算各组件坐标并落盘，而不是只记录决策
            {
                const positions = computeLayoutPositions(newPreview, newCanvasStyle, session.decisions.layout)
                for (const position of positions) {
                    const component = newPreview.find(item => item.id === position.id)
                    if (component) {
                        component.style.top = position.top
                        component.style.left = position.left
                    }
                }
                summary = `已应用「${args.layout}」布局，重新排版 ${positions.length} 个组件`
                observation = { layout: session.decisions.layout, repositioned: positions.length }
            }
            break
        case 'apply_style':
            currentDimension = '视觉风格'
            session.decisions.style = String(args.style || '')
            // 应用风格的确定性默认值（如背景色）
            {
                const stylePatch = applyStyleDefaults(newCanvasStyle, session.decisions.style)
                Object.assign(newCanvasStyle, stylePatch)
                summary = `已应用「${args.style}」视觉风格`
                observation = {
                    style: session.decisions.style,
                    applied: Object.keys(stylePatch),
                }
            }
            break
        case 'apply_color_scheme':
            currentDimension = '配色方案'
            session.decisions.color = String(args.scheme || '')
            if (typeof args.background === 'string') newCanvasStyle.backgroundColor = args.background
            summary = `已应用「${args.scheme}」配色`
            break
        case 'set_canvas_style':
            if (typeof args.backgroundColor === 'string') newCanvasStyle.backgroundColor = args.backgroundColor
            if (Number.isFinite(Number(args.width)) && Number(args.width) > 0) newCanvasStyle.width = Number(args.width)
            if (Number.isFinite(Number(args.height)) && Number(args.height) > 0) newCanvasStyle.height = Number(args.height)
            summary = '已更新画布配置'
            break
        case 'add_component': {
            if (!SUPPORTED_COMPONENTS.has(String(args.component))) {
                throw new ToolError(
                    ToolErrorCode.UNSUPPORTED_TYPE,
                    `不支持的组件类型: ${args.component}`,
                    `仅支持: ${[...SUPPORTED_COMPONENTS].join(', ')}`,
                )
            }
            if (newPreview.length >= 200) throw new ToolError(ToolErrorCode.LIMIT_REACHED, '画布组件数量已达到上限', '请先删除部分组件，或缩小本次任务范围')
            const component = normalizeComponent({
                id: args.id || undefined,
                component: args.component,
                label: args.label || args.component,
                propValue: args.propValue ?? '',
                style: asObject(args.style),
            })
            newPreview.push(component)
            normalizeLayers(newPreview)
            // 已设定布局模式且 LLM 未显式给出坐标时，由服务端自动补位，避免组件堆叠在 0,0
            if (session.decisions.layout
                && (args.style?.top === undefined || args.style?.left === undefined)) {
                const position = nextFreePosition(
                    newPreview,
                    newCanvasStyle,
                    session.decisions.layout,
                    { width: component.style.width, height: component.style.height },
                )
                component.style.top = position.top
                component.style.left = position.left
            }
            const placementIssues = validateComponentPlacement(component, newCanvasStyle)
            summary = `已添加「${component.label}」`
            observation = {
                component: summarizeComponent(component),
                ...(placementIssues.length ? { validation: { issues: placementIssues } } : {}),
            }
            break
        }
        case 'modify_component': {
            const id = requireId(args, toolName)
            const component = newPreview.find(item => item.id === id)
            if (!component) throw new ToolError(ToolErrorCode.COMPONENT_NOT_FOUND, `组件 ${id} 不存在`, `画布上没有 id 为 ${id} 的组件，请先用 observe_canvas 获取真实 id`)
            if (args.style) Object.assign(component.style, asObject(args.style))
            if (args.propValue !== undefined) component.propValue = args.propValue
            if (typeof args.label === 'string') component.label = args.label
            const modifyIssues = validateComponentPlacement(component, newCanvasStyle)
            summary = `已修改组件「${component.label}」`
            observation = {
                component: summarizeComponent(component),
                ...(modifyIssues.length ? { validation: { issues: modifyIssues } } : {}),
            }
            break
        }
        case 'move_component': {
            const id = requireId(args, toolName)
            const component = newPreview.find(item => item.id === id)
            if (!component) throw new ToolError(ToolErrorCode.COMPONENT_NOT_FOUND, `组件 ${id} 不存在`, `画布上没有 id 为 ${id} 的组件，请先用 observe_canvas 获取真实 id`)
            if (Number.isFinite(Number(args.top))) component.style.top = Number(args.top)
            if (Number.isFinite(Number(args.left))) component.style.left = Number(args.left)
            const moveIssues = validateComponentPlacement(component, newCanvasStyle)
            summary = `已移动组件「${component.label}」`
            observation = {
                component: summarizeComponent(component),
                ...(moveIssues.length ? { validation: { issues: moveIssues } } : {}),
            }
            break
        }
        case 'resize_component': {
            const id = requireId(args, toolName)
            const component = newPreview.find(item => item.id === id)
            if (!component) throw new ToolError(ToolErrorCode.COMPONENT_NOT_FOUND, `组件 ${id} 不存在`, `画布上没有 id 为 ${id} 的组件，请先用 observe_canvas 获取真实 id`)
            if (Number.isFinite(Number(args.width)) && Number(args.width) > 0) component.style.width = Number(args.width)
            if (Number.isFinite(Number(args.height)) && Number(args.height) > 0) component.style.height = Number(args.height)
            const resizeIssues = validateComponentPlacement(component, newCanvasStyle)
            summary = `已调整组件「${component.label}」尺寸`
            observation = {
                component: summarizeComponent(component),
                ...(resizeIssues.length ? { validation: { issues: resizeIssues } } : {}),
            }
            break
        }
        case 'delete_component': {
            const id = requireId(args, toolName)
            const target = newPreview.find(component => component.id === id)
            if (!target) throw new ToolError(ToolErrorCode.COMPONENT_NOT_FOUND, `组件 ${id} 不存在`, `画布上没有 id 为 ${id} 的组件，请先用 observe_canvas 获取真实 id`)
            const deletingIds = new Set([id])
            let changed = true
            while (changed) {
                changed = false
                for (const component of newPreview) {
                    if (component.parentId && deletingIds.has(component.parentId) && !deletingIds.has(component.id)) {
                        deletingIds.add(component.id)
                        changed = true
                    }
                }
            }
            const remaining = newPreview.filter(component => !deletingIds.has(component.id))
            normalizeLayers(remaining)
            summary = `已删除组件「${target.label || target.component}」及其子组件`
            return {
                preview: remaining,
                canvasStyle: newCanvasStyle,
                currentDimension,
                summary,
                observation: { deletedComponentIds: [...deletingIds] },
            }
        }
        case 'reorder_layer': {
            const id = requireId(args, toolName)
            const index = newPreview.findIndex(component => component.id === id)
            if (index === -1) throw new ToolError(ToolErrorCode.COMPONENT_NOT_FOUND, `组件 ${id} 不存在`, `画布上没有 id 为 ${id} 的组件，请先用 observe_canvas 获取真实 id`)
            const action = String(args.action || '')
            let targetIndex = index
            if (action === 'up') targetIndex = Math.min(newPreview.length - 1, index + 1)
            if (action === 'down') targetIndex = Math.max(0, index - 1)
            if (action === 'top') targetIndex = newPreview.length - 1
            if (action === 'bottom') targetIndex = 0
            const [component] = newPreview.splice(index, 1)
            newPreview.splice(targetIndex, 0, component)
            normalizeLayers(newPreview)
            summary = `已调整组件「${component.label}」图层`
            observation = { component: summarizeComponent(component), action }
            break
        }
        default:
            throw new ToolError(
                ToolErrorCode.UNKNOWN_TOOL,
                `未知工具: ${toolName}`,
                `可用工具: ${['observe_canvas', 'inspect_component', 'apply_layout', 'apply_style', 'apply_color_scheme', 'set_canvas_style', 'add_component', 'modify_component', 'move_component', 'resize_component', 'delete_component', 'reorder_layer'].join(', ')}`,
            )
    }

    return {
        preview: newPreview,
        canvasStyle: newCanvasStyle,
        currentDimension,
        summary,
        observation,
    }
}

export default executeTool

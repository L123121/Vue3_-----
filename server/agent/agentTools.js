/**
 * Agent 画布工具注册与执行
 */

import { normalizeComponent } from '../agentHelper.js'
import { envNumber } from '../env.js'

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
        throw new Error(`${toolName} 缺少 id 参数`)
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
        selectedComponents: preview.filter(component => selectedIds.has(component.id)).map(summarizeComponent),
        components: visibleComponents,
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
            if (!component) throw new Error(`组件 ${id} 不存在`)
            observation = { component: summarizeComponent(component) }
            summary = `已读取组件「${component.label || component.component}」`
            break
        }
        case 'apply_layout':
            currentDimension = '布局方式'
            session.decisions.layout = String(args.layout || '')
            summary = `已记录「${args.layout}」布局方向`
            break
        case 'apply_style':
            currentDimension = '视觉风格'
            session.decisions.style = String(args.style || '')
            summary = `已记录「${args.style}」视觉风格`
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
                throw new Error(`不支持的组件类型: ${args.component}`)
            }
            if (newPreview.length >= 200) throw new Error('画布组件数量已达到上限')
            const component = normalizeComponent({
                id: args.id || undefined,
                component: args.component,
                label: args.label || args.component,
                propValue: args.propValue ?? '',
                style: asObject(args.style),
            })
            newPreview.push(component)
            normalizeLayers(newPreview)
            summary = `已添加「${component.label}」`
            observation = { component: summarizeComponent(component) }
            break
        }
        case 'modify_component': {
            const id = requireId(args, toolName)
            const component = newPreview.find(item => item.id === id)
            if (!component) throw new Error(`组件 ${id} 不存在`)
            if (args.style) Object.assign(component.style, asObject(args.style))
            if (args.propValue !== undefined) component.propValue = args.propValue
            if (typeof args.label === 'string') component.label = args.label
            summary = `已修改组件「${component.label}」`
            observation = { component: summarizeComponent(component) }
            break
        }
        case 'move_component': {
            const id = requireId(args, toolName)
            const component = newPreview.find(item => item.id === id)
            if (!component) throw new Error(`组件 ${id} 不存在`)
            if (Number.isFinite(Number(args.top))) component.style.top = Number(args.top)
            if (Number.isFinite(Number(args.left))) component.style.left = Number(args.left)
            summary = `已移动组件「${component.label}」`
            observation = { component: summarizeComponent(component) }
            break
        }
        case 'resize_component': {
            const id = requireId(args, toolName)
            const component = newPreview.find(item => item.id === id)
            if (!component) throw new Error(`组件 ${id} 不存在`)
            if (Number.isFinite(Number(args.width)) && Number(args.width) > 0) component.style.width = Number(args.width)
            if (Number.isFinite(Number(args.height)) && Number(args.height) > 0) component.style.height = Number(args.height)
            summary = `已调整组件「${component.label}」尺寸`
            observation = { component: summarizeComponent(component) }
            break
        }
        case 'delete_component': {
            const id = requireId(args, toolName)
            const target = newPreview.find(component => component.id === id)
            if (!target) throw new Error(`组件 ${id} 不存在`)
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
            if (index === -1) throw new Error(`组件 ${id} 不存在`)
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
            throw new Error(`未知工具: ${toolName}`)
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

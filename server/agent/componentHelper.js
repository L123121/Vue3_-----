/**
 * Agent 组件标准化、校验与摘要工具
 * 统一管理组件的创建、校验和摘要逻辑
 */

import { nanoid } from '../utils/nanoid.js'

/**
 * 克隆一个值（深度拷贝）
 * @template T
 * @param {T} value
 * @returns {T}
 */
function clone(value) {
    return JSON.parse(JSON.stringify(value))
}

/**
 * 对组件按索引重置 zIndex，确保图层顺序连续
 * @param {import('../agent.types.js').ComponentData[]} components
 */
export function normalizeLayers(components) {
    components.forEach((component, index) => {
        component.zIndex = index + 1
    })
}

/**
 * 生成组件摘要（轻量信息，不包含完整样式细节）
 * @param {import('../agent.types.js').ComponentData} component
 * @returns {object}
 */
export function summarizeComponent(component) {
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
 * 校验单个组件是否合法
 * @param {any} c
 * @returns {boolean}
 */
export function validateComponent(c) {
    if (!c || typeof c !== 'object') return false
    if (!c.id || !c.component) return false
    if (!c.style || typeof c.style !== 'object') return false
    return true
}

/**
 * 标准化组件数据（LLM 输出可能缺失字段或类型错误）
 * @param {object} c
 * @param {number} [index]
 * @returns {import('../agent.types.js').ComponentData}
 */
export function normalizeComponent(c, index) {
    const borderRadius = c.style?.borderRadius === undefined || c.style?.borderRadius === null
        ? ''
        : String(c.style.borderRadius)
    const fontWeight = (() => {
        const fw = c.style?.fontWeight
        if (fw === undefined || fw === null) return 400
        if (typeof fw === 'number') return fw
        if (fw === 'bold') return 700
        if (fw === 'normal') return 400
        const n = Number(fw)
        return isNaN(n) ? 400 : n
    })()

    return {
        id: c.id || nanoid(8),
        component: c.component || 'VText',
        label: c.label || '组件',
        icon: c.icon || '',
        propValue: c.propValue ?? '',
        style: {
            width: Number(c.style?.width) || 100,
            height: Number(c.style?.height) || 40,
            top: Number(c.style?.top) || 0,
            left: Number(c.style?.left) || 0,
            rotate: Number(c.style?.rotate) || 0,
            opacity: Number(c.style?.opacity) || 1,
            fontSize: Number(c.style?.fontSize) || 14,
            fontWeight,
            lineHeight: c.style?.lineHeight || '',
            letterSpacing: Number(c.style?.letterSpacing) || 0,
            textAlign: c.style?.textAlign || 'left',
            color: c.style?.color || '#333',
            backgroundColor: c.style?.backgroundColor || '',
            borderColor: c.style?.borderColor || '',
            borderWidth: Number(c.style?.borderWidth) || 0,
            borderStyle: c.style?.borderStyle || 'solid',
            borderRadius,
            padding: Number(c.style?.padding) || 0,
        },
        parentId: null,
        slot: 'default',
        zIndex: c.zIndex ?? (index !== undefined ? index + 1 : 1),
        animations: [],
        events: {},
        groupStyle: {},
        isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    }
}

/**
 * 创建画布观察结果（用于 observe_canvas 工具）
 * @param {import('../agent.types.js').ComponentData[]} preview
 * @param {import('../agent.types.js').CanvasStyleData} canvasStyle
 * @param {import('../agent.types.js').AgentSession} session
 * @returns {object}
 */
export function observeCanvas(preview, canvasStyle, session) {
    const selectedIds = new Set(session.selectedComponentIds || [])
    return {
        canvas: {
            width: canvasStyle.width,
            height: canvasStyle.height,
            backgroundColor: canvasStyle.backgroundColor,
            componentCount: preview.length,
        },
        selectedComponentIds: [...selectedIds],
        selectedComponents: preview.filter(component => selectedIds.has(component.id)).map(summarizeComponent),
        components: preview.map(summarizeComponent),
    }
}

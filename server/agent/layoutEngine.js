/**
 * 确定性布局引擎
 *
 * 让 LLM 只声明「布局方式 + 内容」，坐标计算由服务端完成：
 * - computeLayoutPositions：对画布上已有根组件重新排版
 * - nextFreePosition：新增组件时的自动补位（避免全部堆在 0,0）
 * - applyStyleDefaults：视觉风格的确定性默认值（背景色等）
 */

const LAYOUT_PRESETS = {
    '居中聚焦': { type: 'column-center', spacing: 24, margin: 40 },
    '上下分层': { type: 'column-full', spacing: 24, margin: 40 },
    '左右分割': { type: 'two-column', spacing: 24, margin: 40 },
    '网格式': { type: 'grid', columns: 2, spacing: 20, margin: 40 },
    '环绕式': { type: 'ring', margin: 40 },
}

const STYLE_PRESETS = {
    '酷炫潮流': { backgroundColor: '#12121c' },
    '简约商务': { backgroundColor: '#f5f7fa' },
    '文艺清新': { backgroundColor: '#eef7f2' },
    '复古怀旧': { backgroundColor: '#f5ead6' },
    '科技未来': { backgroundColor: '#0b1e3a' },
}

function getCanvasBounds(canvasStyle) {
    return {
        width: Number(canvasStyle?.width) || 1200,
        height: Number(canvasStyle?.height) || 740,
    }
}

function getHeight(component, fallback = 40) {
    return Number(component?.style?.height) || fallback
}

function getWidth(component, fallback = 100) {
    return Number(component?.style?.width) || fallback
}

function rootComponents(components) {
    return (Array.isArray(components) ? components : []).filter(c => !c.parentId)
}

/**
 * 计算各根组件在指定布局下的坐标（保持组件宽高不变）。
 * @param {import('../agent.types.js').ComponentData[]} components
 * @param {import('../agent.types.js').CanvasStyleData} canvasStyle
 * @param {string} layoutName
 * @returns {Array<{id:string,top:number,left:number}>}
 */
export function computeLayoutPositions(components, canvasStyle, layoutName) {
    const mode = LAYOUT_PRESETS[layoutName]
    if (!mode) return []
    const { width, height } = getCanvasBounds(canvasStyle)
    const roots = rootComponents(components)
    const spacing = mode.spacing ?? 24
    const margin = mode.margin ?? 40

    switch (mode.type) {
        case 'column-center': {
            const totalHeight = roots.reduce((sum, c) => sum + getHeight(c) + spacing, 0) - spacing
            const startY = Math.max(margin, (height - totalHeight) / 2)
            let cursorY = startY
            return roots.map(c => {
                const left = Math.max(margin, Math.round((width - getWidth(c)) / 2))
                const top = Math.round(cursorY)
                cursorY += getHeight(c) + spacing
                return { id: c.id, top, left }
            })
        }
        case 'column-full': {
            let cursorY = margin
            return roots.map(c => {
                const top = Math.round(cursorY)
                cursorY += getHeight(c) + spacing
                return { id: c.id, top, left: Math.round(margin) }
            })
        }
        case 'two-column': {
            const colWidth = (width - margin * 2 - spacing) / 2
            const cursors = [margin, margin]
            return roots.map((c, index) => {
                const column = index % 2
                const left = column === 0 ? margin : Math.round(margin + colWidth + spacing)
                const top = Math.round(cursors[column])
                cursors[column] += getHeight(c) + spacing
                return { id: c.id, top, left }
            })
        }
        case 'grid': {
            const columns = mode.columns || 2
            const gap = spacing
            const colWidth = (width - margin * 2 - gap * (columns - 1)) / columns
            return roots.map((c, index) => {
                const column = index % columns
                const row = Math.floor(index / columns)
                const rowStart = row * columns
                const rowComponents = roots.slice(rowStart, rowStart + columns)
                const rowHeight = Math.max(...rowComponents.map(r => getHeight(r)))
                const top = Math.round(margin + row * (rowHeight + gap))
                const left = Math.round(margin + column * (colWidth + gap))
                return { id: c.id, top, left }
            })
        }
        case 'ring': {
            const centerX = width / 2
            const centerY = height / 2
            const radius = Math.min(width, height) * 0.3
            return roots.map((c, index) => {
                const angle = (index / Math.max(roots.length, 1)) * Math.PI * 2 - Math.PI / 2
                const left = Math.round(centerX + Math.cos(angle) * radius - getWidth(c) / 2)
                const top = Math.round(centerY + Math.sin(angle) * radius - getHeight(c) / 2)
                return { id: c.id, top, left }
            })
        }
        default:
            return []
    }
}

/**
 * 计算新组件在指定布局下的下一个可用位置（自动补位）。
 * @param {import('../agent.types.js').ComponentData[]} components
 * @param {import('../agent.types.js').CanvasStyleData} canvasStyle
 * @param {string} layoutName
 * @param {{width?:number,height?:number}} [size]
 * @returns {{top:number,left:number}}
 */
export function nextFreePosition(components, canvasStyle, layoutName, size = {}) {
    const mode = LAYOUT_PRESETS[layoutName]
    if (!mode) return { top: 0, left: 0 }
    const { width, height } = getCanvasBounds(canvasStyle)
    const roots = rootComponents(components)
    const spacing = mode.spacing ?? 24
    const margin = mode.margin ?? 40
    const w = size.width || 100
    const h = size.height || 40

    switch (mode.type) {
        case 'column-center': {
            const existingHeight = roots.reduce((sum, c) => sum + getHeight(c) + spacing, 0)
            const totalHeight = existingHeight + h
            const startY = Math.max(margin, (height - totalHeight) / 2)
            return {
                top: Math.round(startY + existingHeight),
                left: Math.max(margin, Math.round((width - w) / 2)),
            }
        }
        case 'column-full': {
            const top = margin + roots.reduce((sum, c) => sum + getHeight(c) + spacing, 0)
            return { top: Math.round(top), left: Math.round(margin) }
        }
        case 'two-column': {
            const colWidth = (width - margin * 2 - spacing) / 2
            const nextColumn = roots.length % 2
            const left = nextColumn === 0 ? margin : Math.round(margin + colWidth + spacing)
            // 该列当前高度
            const columnHeights = [0, 0]
            roots.forEach((c, index) => {
                columnHeights[index % 2] += getHeight(c) + spacing
            })
            return { top: Math.round(margin + columnHeights[nextColumn]), left }
        }
        case 'grid': {
            const columns = mode.columns || 2
            const gap = spacing
            const colWidth = (width - margin * 2 - gap * (columns - 1)) / columns
            const column = roots.length % columns
            const row = Math.floor(roots.length / columns)
            const rowStart = row * columns
            const rowComponents = roots.slice(rowStart, rowStart + columns)
            const rowHeight = Math.max(...rowComponents.map(r => getHeight(r)), h)
            return {
                top: Math.round(margin + row * (rowHeight + gap)),
                left: Math.round(margin + column * (colWidth + gap)),
            }
        }
        case 'ring': {
            const centerX = width / 2
            const centerY = height / 2
            const radius = Math.min(width, height) * 0.3
            const index = roots.length
            const angle = (index / Math.max(roots.length + 1, 1)) * Math.PI * 2 - Math.PI / 2
            return {
                top: Math.round(centerY + Math.sin(angle) * radius - h / 2),
                left: Math.round(centerX + Math.cos(angle) * radius - w / 2),
            }
        }
        default:
            return { top: 0, left: 0 }
    }
}

/**
 * 应用视觉风格的确定性默认值（如背景色）。
 * @param {import('../agent.types.js').CanvasStyleData} canvasStyle
 * @param {string} styleName
 * @returns {Partial<import('../agent.types.js').CanvasStyleData>} 需要合并到画布样式的补丁
 */
export function applyStyleDefaults(canvasStyle, styleName) {
    const preset = STYLE_PRESETS[styleName]
    if (!preset) return {}
    const patch = {}
    // 仅在用户未显式设置背景时应用预设背景，避免覆盖 apply_color_scheme 的结果
    if (!canvasStyle?.backgroundColor || canvasStyle.backgroundColor === '#fff' || canvasStyle.backgroundColor === '#ffffff') {
        patch.backgroundColor = preset.backgroundColor
    }
    return patch
}

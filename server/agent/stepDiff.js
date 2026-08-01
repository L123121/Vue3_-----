/**
 * Agent 步骤增量 diff 摘要
 *
 * 对比相邻两幅画布快照，为每个 tool_result 步骤生成
 * { added, modified, removed, summary } 供前端审批 UI 直接展示。
 */

/**
 * 生成组件稳定指纹（用于判断是否被修改）
 * @param {import('../canvas.types.js').ComponentData} component
 * @returns {string}
 */
function componentFingerprint(component) {
    return JSON.stringify({
        component: component?.component,
        label: component?.label,
        propValue: component?.propValue,
        style: component?.style,
        parentId: component?.parentId,
        zIndex: component?.zIndex,
    })
}

/**
 * 计算两个画布快照之间的增量
 * @param {import('../canvas.types.js').ComponentData[]} prev
 * @param {import('../canvas.types.js').ComponentData[]} next
 * @returns {{added:string[],modified:string[],removed:string[],summary:string}}
 */
export function computeStepDiff(prev = [], next = []) {
    const prevMap = new Map(prev.map(component => [component?.id, component]))
    const nextMap = new Map(next.map(component => [component?.id, component]))

    const added = []
    const modified = []
    const removed = []

    for (const [id, component] of nextMap) {
        if (!prevMap.has(id)) {
            added.push(component?.label || component?.component || id)
        } else if (componentFingerprint(prevMap.get(id)) !== componentFingerprint(component)) {
            modified.push(component?.label || component?.component || id)
        }
    }
    for (const [id, component] of prevMap) {
        if (!nextMap.has(id)) {
            removed.push(component?.label || component?.component || id)
        }
    }

    const parts = []
    if (added.length) parts.push(`新增 ${added.length} 个组件`)
    if (modified.length) parts.push(`修改 ${modified.length} 个组件`)
    if (removed.length) parts.push(`删除 ${removed.length} 个组件`)
    if (!parts.length) parts.push('无变化')

    return {
        added,
        modified,
        removed,
        summary: parts.join('，'),
    }
}

/**
 * 为步骤数组生成逐步骤 diff（相邻快照对比）。
 * 返回新数组，不修改原始步骤对象（避免污染 session.history 中的快照）。
 * @param {Array<import('./eval.types.js').EvalStepRecord & {preview?:Array,canvasStyle?:object}>} steps
 * @returns {Array}
 */
export function attachStepDiffs(steps) {
    let lastPreview = null
    return steps.map(step => {
        if (step?.type === 'tool_result' && Array.isArray(step.preview)) {
            const diff = computeStepDiff(lastPreview, step.preview)
            lastPreview = step.preview
            return { ...step, diff }
        }
        if (Array.isArray(step?.preview)) {
            lastPreview = step.preview
        }
        return step
    })
}

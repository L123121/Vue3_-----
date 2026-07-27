/**
 * Agent 画布确定性验证器
 */

function finiteNumber(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback
}

function getBounds(component) {
    return {
        left: finiteNumber(component.style?.left),
        top: finiteNumber(component.style?.top),
        width: finiteNumber(component.style?.width),
        height: finiteNumber(component.style?.height),
    }
}

function getOverlapRatio(first, second) {
    const firstBounds = getBounds(first)
    const secondBounds = getBounds(second)
    const overlapWidth = Math.max(0, Math.min(
        firstBounds.left + firstBounds.width,
        secondBounds.left + secondBounds.width,
    ) - Math.max(firstBounds.left, secondBounds.left))
    const overlapHeight = Math.max(0, Math.min(
        firstBounds.top + firstBounds.height,
        secondBounds.top + secondBounds.height,
    ) - Math.max(firstBounds.top, secondBounds.top))
    const overlapArea = overlapWidth * overlapHeight
    const smallerArea = Math.min(
        firstBounds.width * firstBounds.height,
        secondBounds.width * secondBounds.height,
    )
    return smallerArea > 0 ? overlapArea / smallerArea : 0
}

function shouldCheckOverlap(component) {
    return (component.parentId === null || component.parentId === undefined)
        && !['RectShape', 'CircleShape', 'LineShape'].includes(component.component)
}

export function validateCanvas(components, canvasStyle) {
    const errors = []
    const warnings = []
    const ids = new Set()
    const canvasWidth = finiteNumber(canvasStyle?.width)
    const canvasHeight = finiteNumber(canvasStyle?.height)
    const safeComponents = Array.isArray(components) ? components : []

    for (const component of safeComponents) {
        if (!component?.id || !component?.component) {
            errors.push({
                code: 'MISSING_COMPONENT',
                severity: 'error',
                componentIds: component?.id ? [component.id] : [],
                message: '存在缺少 ID 或组件类型的数据',
                suggestion: '重新创建该组件并补齐基础字段',
            })
            continue
        }

        if (ids.has(component.id)) {
            errors.push({
                code: 'DUPLICATE_ID',
                severity: 'error',
                componentIds: [component.id],
                message: `组件 ID ${component.id} 重复`,
                suggestion: '为重复组件生成新的唯一 ID',
            })
        }
        ids.add(component.id)

        const { width, height, top, left } = getBounds(component)
        if (width <= 0 || height <= 0) {
            errors.push({
                code: 'INVALID_SIZE',
                severity: 'error',
                componentIds: [component.id],
                message: `组件「${component.label || component.component}」宽高必须大于 0`,
                suggestion: '设置合理的 width 和 height',
            })
            continue
        }

        if (left < 0 || top < 0 || left + width > canvasWidth || top + height > canvasHeight) {
            warnings.push({
                code: 'OUT_OF_BOUNDS',
                severity: 'warning',
                componentIds: [component.id],
                message: `组件「${component.label || component.component}」超出画布边界`,
                suggestion: `将组件限制在 ${canvasWidth}×${canvasHeight} 画布内`,
            })
        }
    }

    const overlapCandidates = safeComponents.filter(shouldCheckOverlap).slice(0, 100)
    for (let firstIndex = 0; firstIndex < overlapCandidates.length; firstIndex++) {
        for (let secondIndex = firstIndex + 1; secondIndex < overlapCandidates.length; secondIndex++) {
            const first = overlapCandidates[firstIndex]
            const second = overlapCandidates[secondIndex]
            if (getOverlapRatio(first, second) < 0.7) continue
            warnings.push({
                code: 'SEVERE_OVERLAP',
                severity: 'warning',
                componentIds: [first.id, second.id],
                message: `组件「${first.label}」与「${second.label}」存在严重重叠`,
                suggestion: '调整位置、尺寸或图层关系',
            })
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    }
}

export default validateCanvas

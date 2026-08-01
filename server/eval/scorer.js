/**
 * Eval 评分器
 *
 * 将一次 Agent 运行结果与任务期望标准比对，输出：
 *   - 细粒度得分（0~100，按检查项加权）
 *   - 通过/未通过的检查项明细（便于复盘）
 *   - 是否整体通过（pass）
 *
 * 检查项覆盖：组件数量、组件类型、文本关键字、禁止组件、
 * 画布验证器、步数预算、标题字号、初始方向确认、布局应用。
 */

import { validateCanvas } from '../agent/canvasValidator.js'

/**
 * 收集组件文本内容（VText/VButton 的 propValue 为字符串）
 * @param {import('../canvas.types.js').ComponentData[]} components
 * @returns {string[]}
 */
function collectTexts(components) {
    const texts = []
    for (const component of components) {
        if (typeof component?.propValue === 'string' && component.propValue.trim()) {
            texts.push(component.propValue)
        }
    }
    return texts
}

/**
 * 检查组件是否被重新排布（布局已应用）：
 * 至少一个根组件的位置不再是 (0,0) 或初始位置。
 * @param {import('../canvas.types.js').ComponentData[]} components
 * @param {number} tolerance
 * @returns {boolean}
 */
function hasRelayout(components, tolerance = 30) {
    return components.some(component => {
        if (component.parentId) return false
        const left = Number(component.style?.left) || 0
        const top = Number(component.style?.top) || 0
        return Math.abs(left) > tolerance || Math.abs(top) > tolerance
    })
}

/**
 * 检查标题是否水平居中（left 与画布中心接近）
 * @param {import('../canvas.types.js').ComponentData[]} components
 * @param {import('../canvas.types.js').CanvasStyleData} canvasStyle
 * @param {number} tolerance
 * @returns {boolean}
 */
function hasCenteredTitle(components, canvasStyle, tolerance) {
    const centerX = (Number(canvasStyle?.width) || 375) / 2
    return components.some(component => {
        const width = Number(component.style?.width) || 0
        const left = Number(component.style?.left) || 0
        return Math.abs(left + width / 2 - centerX) <= tolerance
    })
}

/**
 * 评分一次运行结果
 * @param {import('./eval.types.js').EvalTask} task
 * @param {Partial<import('./eval.types.js').EvalRunResult>} run
 * @returns {import('./eval.types.js').EvalRunResult}
 */
export function scoreRun(task, run) {
    const expected = task.expected || {}
    const finalCanvas = Array.isArray(run.finalCanvas) ? run.finalCanvas : []
    const canvasStyle = run.canvasStyle || task.canvasStyle
    const steps = Array.isArray(run.steps) ? run.steps : []
    const failures = []
    const passedChecks = []
    const counts = { checked: 0, passed: 0 }

    const check = (code, pass, message) => {
        counts.checked++
        if (pass) {
            counts.passed++
            passedChecks.push({ code, message })
        } else {
            failures.push({ code, message })
        }
    }

    // 运行异常：直接判失败，不再做后续期望比对
    if (run.error) {
        failures.push({ code: 'RUN_ERROR', message: run.error })
        return {
            taskId: task.id,
            taskName: task.name,
            pass: false,
            score: 0,
            failures,
            passedChecks,
            finalCanvas,
            canvasStyle,
            steps,
            durationMs: run.durationMs || 0,
            tokenUsage: run.tokenUsage || null,
            provider: run.provider,
            error: run.error,
        }
    }

    // ==================== 常规检查项 ====================

    if (typeof expected.minComponents === 'number') {
        check(
            'MIN_COMPONENTS',
            finalCanvas.length >= expected.minComponents,
            `组件数 ${finalCanvas.length} >= ${expected.minComponents}`,
        )
    }

    for (const componentType of expected.requireComponents || []) {
        const present = finalCanvas.some(component => component.component === componentType)
        check(
            `REQUIRE_COMPONENT_${componentType}`,
            present,
            `存在组件类型 ${componentType}`,
        )
    }

    const texts = collectTexts(finalCanvas)
    for (const keyword of expected.requireText || []) {
        const found = texts.some(text => text.includes(keyword))
        check(
            `REQUIRE_TEXT_${keyword}`,
            found,
            `文本内容包含「${keyword}」`,
        )
    }

    for (const componentType of expected.forbidComponents || []) {
        const absent = !finalCanvas.some(component => component.component === componentType)
        check(
            `FORBID_COMPONENT_${componentType}`,
            absent,
            `未包含组件类型 ${componentType}`,
        )
    }

    if (expected.validatorPass) {
        const validation = validateCanvas(finalCanvas, canvasStyle)
        check(
            'VALIDATOR_PASS',
            validation.errors.length === 0,
            `画布通过验证器（errors=${validation.errors.length}, warnings=${validation.warnings.length}）`,
        )
    }

    if (typeof expected.maxSteps === 'number') {
        const toolSteps = steps.filter(step => step.type === 'tool_call').length
        check(
            'MAX_STEPS',
            toolSteps <= expected.maxSteps,
            `工具步数 ${toolSteps} <= ${expected.maxSteps}`,
        )
    }

    if (typeof expected.titleFontSizeMin === 'number') {
        const fontSize = finalCanvas
            .filter(component => component.component === 'VText')
            .map(component => Number(component.style?.fontSize) || 0)
            .sort((a, b) => b - a)[0] || 0
        check(
            'TITLE_FONT_SIZE',
            fontSize >= expected.titleFontSizeMin,
            `标题字号 ${fontSize} >= ${expected.titleFontSizeMin}`,
        )
    }

    if (expected.requireInitialChoice) {
        const asked = steps.some(step => step.type === 'ask_user' || step.type === 'user_input')
        check('REQUIRE_INITIAL_CHOICE', asked, '模糊需求触发了方向确认')
    }

    if (expected.layoutApplied) {
        check('LAYOUT_APPLIED', hasRelayout(finalCanvas), '组件被重新排布（布局已应用）')
    }

    if (typeof expected.centeredLeftTolerance === 'number') {
        check(
            'CENTERED_TITLE',
            hasCenteredTitle(finalCanvas, canvasStyle, expected.centeredLeftTolerance),
            `标题水平居中（容差 ${expected.centeredLeftTolerance}px）`,
        )
    }

    // ==================== 汇总 ====================

    const score = counts.checked === 0
        ? 100
        : Math.round((counts.passed / counts.checked) * 100)

    return {
        taskId: task.id,
        taskName: task.name,
        pass: failures.length === 0,
        score,
        failures,
        passedChecks,
        finalCanvas,
        canvasStyle,
        steps,
        durationMs: run.durationMs || 0,
        tokenUsage: run.tokenUsage || null,
        provider: run.provider,
    }
}

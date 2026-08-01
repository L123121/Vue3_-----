import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scoreRun } from '../scorer.js'

function textComponent(id, propValue, style = {}) {
    return {
        id,
        component: 'VText',
        label: id,
        propValue,
        style: { width: 100, height: 40, top: 0, left: 0, fontSize: 14, ...style },
        parentId: null, slot: 'default', zIndex: 1,
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style', linkage: { duration: 0, data: [] },
    }
}

function buttonComponent(id, label = id) {
    return {
        id,
        component: 'VButton',
        label,
        propValue: label,
        style: { width: 120, height: 40, top: 100, left: 100, fontSize: 16 },
        parentId: null, slot: 'default', zIndex: 2,
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style', linkage: { duration: 0, data: [] },
    }
}

const canvasStyle = {
    width: 375, height: 667, scale: 100, color: '#000',
    opacity: 1, backgroundColor: '#fff', fontSize: 14,
}

const baseTask = {
    id: 't1',
    name: '测试任务',
    prompt: '做个测试',
    canvasStyle,
    initialCanvas: [],
    expected: {},
}

describe('scorer - 基础检查项', () => {
    it('空期望时默认通过', () => {
        const result = scoreRun(baseTask, {
            finalCanvas: [],
            canvasStyle,
            steps: [],
        })
        assert.equal(result.pass, true)
        assert.equal(result.score, 100)
    })

    it('运行异常直接判失败且得分为 0', () => {
        const result = scoreRun(baseTask, {
            finalCanvas: [],
            canvasStyle,
            steps: [],
            error: 'LLM 超时',
        })
        assert.equal(result.pass, false)
        assert.equal(result.score, 0)
        assert.ok(result.failures.some(f => f.code === 'RUN_ERROR'))
    })

    it('组件数量检查', () => {
        const task = { ...baseTask, expected: { minComponents: 2 } }
        const ok = scoreRun(task, {
            finalCanvas: [textComponent('a', 'x'), textComponent('b', 'y')],
            canvasStyle,
            steps: [],
        })
        assert.equal(ok.pass, true)

        const fail = scoreRun(task, {
            finalCanvas: [textComponent('a', 'x')],
            canvasStyle,
            steps: [],
        })
        assert.equal(fail.pass, false)
        assert.ok(fail.failures.some(f => f.code === 'MIN_COMPONENTS'))
    })

    it('组件类型与文本关键字检查', () => {
        const task = {
            ...baseTask,
            expected: {
                requireComponents: ['VText', 'VButton'],
                requireText: ['街舞', '招新'],
            },
        }
        const ok = scoreRun(task, {
            finalCanvas: [textComponent('a', '街舞社招新'), buttonComponent('b')],
            canvasStyle,
            steps: [],
        })
        assert.equal(ok.pass, true)

        const fail = scoreRun(task, {
            finalCanvas: [textComponent('a', '街舞社'), buttonComponent('b')],
            canvasStyle,
            steps: [],
        })
        assert.equal(fail.pass, false)
        assert.ok(fail.failures.some(f => f.code === 'REQUIRE_TEXT_招新'))
    })

    it('禁止组件检查', () => {
        const task = { ...baseTask, expected: { forbidComponents: ['Picture'] } }
        const fail = scoreRun(task, {
            finalCanvas: [textComponent('a', 'x'), {
                ...buttonComponent('p'),
                component: 'Picture',
                propValue: { url: 'https://x.com/a.png', flip: { horizontal: false, vertical: false } },
            }],
            canvasStyle,
            steps: [],
        })
        assert.equal(fail.pass, false)
        assert.ok(fail.failures.some(f => f.code === 'FORBID_COMPONENT_Picture'))
    })
})

describe('scorer - 画布验证器检查', () => {
    it('非法尺寸组件导致 validatorPass 失败', () => {
        const task = { ...baseTask, expected: { validatorPass: true } }
        // validateCanvas 中越界属于 warning；宽高 <= 0 才是 error
        const result = scoreRun(task, {
            finalCanvas: [{
                ...textComponent('a', 'x'),
                style: { width: 0, height: 40, top: 0, left: 0, fontSize: 14 },
            }],
            canvasStyle,
            steps: [],
        })
        assert.equal(result.pass, false)
        assert.ok(result.failures.some(f => f.code === 'VALIDATOR_PASS'))
    })

    it('越界（warning）不导致 validatorPass 失败', () => {
        const task = { ...baseTask, expected: { validatorPass: true } }
        const result = scoreRun(task, {
            finalCanvas: [{
                ...textComponent('a', 'x'),
                style: { width: 100, height: 40, top: -10, left: 0, fontSize: 14 },
            }],
            canvasStyle,
            steps: [],
        })
        assert.equal(result.pass, true)
    })
})

describe('scorer - 编辑类检查项', () => {
    it('标题字号下限', () => {
        const task = { ...baseTask, expected: { titleFontSizeMin: 28 } }
        const ok = scoreRun(task, {
            finalCanvas: [textComponent('a', '标题', { fontSize: 32 })],
            canvasStyle,
            steps: [],
        })
        assert.equal(ok.pass, true)

        const fail = scoreRun(task, {
            finalCanvas: [textComponent('a', '标题', { fontSize: 20 })],
            canvasStyle,
            steps: [],
        })
        assert.equal(fail.pass, false)
    })

    it('初始方向确认（ask_user）', () => {
        const task = { ...baseTask, expected: { requireInitialChoice: true } }
        const ok = scoreRun(task, {
            finalCanvas: [],
            canvasStyle,
            steps: [{ type: 'user_input', title: '请选择方向' }],
        })
        assert.equal(ok.pass, true)

        const fail = scoreRun(task, {
            finalCanvas: [],
            canvasStyle,
            steps: [{ type: 'tool_call', toolName: 'add_component' }],
        })
        assert.equal(fail.pass, false)
    })

    it('布局应用与居中检查', () => {
        const task = {
            ...baseTask,
            expected: { layoutApplied: true, centeredLeftTolerance: 30 },
        }
        // 375 画布中心 x=187.5；组件宽 100 时 left 需在 137.5±30 内
        const ok = scoreRun(task, {
            finalCanvas: [textComponent('a', 'x', { left: 140, top: 60 })],
            canvasStyle,
            steps: [],
        })
        assert.equal(ok.pass, true)

        const fail = scoreRun(task, {
            finalCanvas: [textComponent('a', 'x', { left: 0, top: 0 })],
            canvasStyle,
            steps: [],
        })
        assert.equal(fail.pass, false)
        assert.ok(fail.failures.some(f => f.code === 'LAYOUT_APPLIED'))
    })
})

describe('scorer - 步数预算', () => {
    it('超过 maxSteps 判失败', () => {
        const task = { ...baseTask, expected: { maxSteps: 3 } }
        const steps = [
            { type: 'tool_call', toolName: 'a' },
            { type: 'tool_call', toolName: 'b' },
            { type: 'tool_call', toolName: 'c' },
            { type: 'tool_call', toolName: 'd' },
        ]
        const result = scoreRun(task, {
            finalCanvas: [],
            canvasStyle,
            steps,
        })
        assert.equal(result.pass, false)
        assert.ok(result.failures.some(f => f.code === 'MAX_STEPS'))
    })
})

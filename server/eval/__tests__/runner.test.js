import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createMockProvider, runEvalTask, runEvalSuite } from '../runner.js'
import { getEvalTask } from '../tasks.js'

describe('createMockProvider - 脚本化 mock LLM', () => {
    it('按脚本顺序返回 tool_call 决策', async () => {
        const provider = createMockProvider([
            { toolName: 'add_component', args: { component: 'VText', label: '标题', propValue: 'Hello' } },
            { type: 'finish', args: { summary: '完成' } },
        ])
        const first = await provider.fetchChat({}, {})
        const firstMessage = (await first.response.json()).choices[0].message
        assert.equal(firstMessage.tool_calls[0].function.name, 'add_component')
        assert.equal(first.provider.name, 'mock')
        assert.ok(first.usage.totalTokens > 0)

        const second = await provider.fetchChat({}, {})
        const secondMessage = (await second.response.json()).choices[0].message
        assert.equal(secondMessage.tool_calls[0].function.name, 'finish')
    })

    it('脚本耗尽时返回 finish（防死循环）', async () => {
        const provider = createMockProvider([])
        const result = await provider.fetchChat({}, {})
        const message = (await result.response.json()).choices[0].message
        assert.equal(message.tool_calls[0].function.name, 'finish')
    })
})

describe('runEvalTask - mock 模式', () => {
    it('脚本化执行生成任务并通过期望', async () => {
        const task = getEvalTask('poster_dance_recruit')
        const result = await runEvalTask(task, { mode: 'mock' })
        assert.equal(result.pass, true)
        assert.equal(result.score, 100)
        assert.ok(result.finalCanvas.length >= 3)
        assert.ok(result.tokenUsage.totalTokens > 0)
        assert.ok(result.steps.some(step => step.type === 'tool_call'))
    })

    it('可覆盖脚本：错误脚本导致失败', async () => {
        const task = getEvalTask('poster_dance_recruit')
        const result = await runEvalTask(task, {
            mode: 'mock',
            script: [{ type: 'finish', args: { summary: '什么都没做' } }],
        })
        assert.equal(result.pass, false)
        assert.ok(result.failures.some(failure => failure.code === 'MIN_COMPONENTS'))
    })

    it('模糊需求任务触发方向确认', async () => {
        const task = getEvalTask('empty_canvas_vague')
        const result = await runEvalTask(task, { mode: 'mock' })
        assert.equal(result.pass, true)
        assert.ok(result.steps.some(step => step.type === 'ask_user' || step.type === 'user_input'))
    })
})

describe('runEvalSuite - 汇总报告', () => {
    it('汇总通过率/平均分/token 与轨迹', async () => {
        const report = await runEvalSuite({ mode: 'mock' })
        assert.equal(report.mode, 'mock')
        assert.equal(report.total, 7)
        assert.equal(report.passed, 7)
        assert.equal(report.passRate, 1)
        assert.equal(report.avgScore, 100)
        assert.ok(report.totalTokens > 0)
        assert.ok(report.totalDurationMs >= 0)
        assert.ok(report.results.every(result => Array.isArray(result.steps)))
        assert.ok(report.createdAt)
    })

    it('可按 taskIds 过滤', async () => {
        const report = await runEvalSuite({
            mode: 'mock',
            taskIds: ['delete_component', 'edit_title_font'],
        })
        assert.equal(report.total, 2)
        assert.equal(report.passed, 2)
    })
})

import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import sessionStore from '../sessionStore.js'

test('generateId 使用 crypto.randomUUID（不可预测）', () => {
    const id = sessionStore.generateId()
    assert.match(id, /^sess_[0-9a-f]{32}$/)

    // 连续生成不重复
    const seen = new Set()
    for (let i = 0; i < 100; i++) {
        const next = sessionStore.generateId()
        assert.equal(seen.has(next), false)
        seen.add(next)
    }
})

test('create 生成完整会话快照', () => {
    const session = sessionStore.create()
    assert.ok(session.id)
    assert.equal(session.status, 'active')
    assert.equal(session.round, 0)
    assert.deepEqual(session.history, [])
    assert.ok(Array.isArray(session.currentCanvas))
})

test('update 合并补丁并刷新 updatedAt', () => {
    const session = sessionStore.create()
    const before = session.updatedAt
    sessionStore.update(session.id, { round: 3 })
    const stored = sessionStore.sessions.get(session.id)
    assert.equal(stored.round, 3)
    assert.ok(stored.updatedAt >= before)
})

test('saveBreakpoint / takeBreakpoint 往返', async () => {
    const session = sessionStore.create()
    sessionStore.saveBreakpoint(session.id, {
        pendingSteps: [{ id: 'step_1' }],
        pendingStepIndex: 0,
        pendingContext: { foo: 'bar' },
    })
    const breakpoint = await sessionStore.takeBreakpoint(session.id)
    assert.deepEqual(breakpoint.pendingSteps, [{ id: 'step_1' }])
    assert.equal(breakpoint.pendingStepIndex, 0)
    assert.deepEqual(breakpoint.pendingContext, { foo: 'bar' })

    // 取出后清空
    const empty = await sessionStore.takeBreakpoint(session.id)
    assert.equal(empty.pendingSteps, undefined)
})

after(async () => {
    await sessionStore.close()
})

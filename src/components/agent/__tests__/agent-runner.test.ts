import { describe, expect, it } from 'vitest'
import { shouldRequireInitialChoice } from '../../../../server/agent/agentRunner.js'

function createSession() {
    return {
        currentCanvas: [],
        history: [],
        decisions: {},
    }
}

describe('Agent initial choice policy', () => {
    it('allows an explicit direct-generation request to execute immediately', () => {
        expect(shouldRequireInitialChoice(
            createSession(),
            { type: 'free_text', value: '直接生成一个街舞社招新海报，酷炫黑红风格，不要再问我' },
        )).toBe(false)
    })

    it('allows a sufficiently specific brief to execute immediately', () => {
        expect(shouldRequireInitialChoice(
            createSession(),
            { type: 'free_text', value: '街舞社招新海报，酷炫黑红风格' },
        )).toBe(false)
    })

    it('still asks for direction when the first request is vague', () => {
        expect(shouldRequireInitialChoice(
            createSession(),
            { type: 'free_text', value: '做个海报' },
        )).toBe(true)
    })

    it('does not force another choice for an existing canvas', () => {
        const session = {
            ...createSession(),
            currentCanvas: [{ id: 'existing' }],
        }
        expect(shouldRequireInitialChoice(
            session,
            { type: 'free_text', value: '调整一下' },
        )).toBe(false)
    })
})

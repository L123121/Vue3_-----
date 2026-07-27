import { describe, expect, it } from 'vitest'
import { createAgentSSEParser } from '@/api/agent'

describe('createAgentSSEParser', () => {
    it('保留跨 chunk 拆分的 event 和 data', () => {
        const events: Array<[string, unknown]> = []
        const parser = createAgentSSEParser((event, data) => events.push([event, data]))

        parser.push('event: tool_')
        parser.push('result\ndata: {"step":')
        parser.push('{"id":"s1"}}\n\n')
        parser.finish()

        expect(events).toEqual([
            ['tool_result', { step: { id: 's1' } }],
        ])
    })

    it('合并多行 data，并支持无尾部换行的最后一帧', () => {
        const events: Array<[string, unknown]> = []
        const parser = createAgentSSEParser((event, data) => events.push([event, data]))

        parser.push('event: message\ndata: {"text":')
        parser.push('\ndata: "hello"}')
        parser.finish()

        expect(events).toEqual([
            ['message', { text: 'hello' }],
        ])
    })

    it('忽略注释并透传非 JSON 数据', () => {
        const events: Array<[string, unknown]> = []
        const parser = createAgentSSEParser((event, data) => events.push([event, data]))

        parser.push(': heartbeat\n\nevent: error\ndata: unavailable\n\n')
        parser.finish()

        expect(events).toEqual([
            ['error', 'unavailable'],
        ])
    })
})

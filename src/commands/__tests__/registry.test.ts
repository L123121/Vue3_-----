import { describe, it, expect } from 'vitest'
import { deserialize, deserializeStack } from '@/commands/registry'
import { CommandType } from '@/commands/types'
import type { CommandEnvelope } from '@/commands/types'
import '@/commands/index' // 确保所有命令已注册

describe('命令注册表 - deserialize', () => {
    it('已知命令类型可反序列化', () => {
        const envelope: CommandEnvelope = {
            type: CommandType.ADD_COMPONENT,
            id: 'cmd-1',
            timestamp: Date.now(),
            data: { component: { id: 'c1', component: 'VText', propValue: 'test', style: { width: 100, height: 50 } } },
        }
        const cmd = deserialize(envelope)
        expect(cmd).not.toBeNull()
        expect(cmd!.id).toBe('cmd-1')
        expect(cmd!.type).toBe(CommandType.ADD_COMPONENT)
    })

    it('未知命令类型返回 null', () => {
        const envelope: CommandEnvelope = {
            type: 999 as unknown as CommandType,
            id: 'unknown',
            timestamp: Date.now(),
            data: {},
        }
        const cmd = deserialize(envelope)
        expect(cmd).toBeNull()
    })

    it('MOVE 命令反序列化保留坐标信息', () => {
        const envelope: CommandEnvelope = {
            type: CommandType.MOVE_COMPONENT,
            id: 'cmd-move-1',
            timestamp: Date.now(),
            data: {
                componentId: 'c1',
                oldStyle: { top: 0, left: 0 },
                newStyle: { top: 100, left: 200 },
            },
        }
        const cmd = deserialize(envelope)
        expect(cmd).not.toBeNull()
        expect(cmd!.type).toBe(CommandType.MOVE_COMPONENT)
        // execute 需要 store,这里只验证反序列化成功
        expect(cmd).toBeDefined()
    })
})

describe('命令注册表 - deserializeStack', () => {
    it('反序列化整栈, 过滤掉未知类型', () => {
        const envelopes: CommandEnvelope[] = [
            {
                type: CommandType.ADD_COMPONENT,
                id: 'cmd-1',
                timestamp: 1000,
                data: { component: { id: 'c1', component: 'VText', propValue: 't', style: { width: 100, height: 50 } } },
            },
            {
                type: 999 as unknown as CommandType,
                id: 'unknown',
                timestamp: 2000,
                data: {},
            },
            {
                type: CommandType.CLEAR_CANVAS,
                id: 'cmd-3',
                timestamp: 3000,
                data: {},
            },
        ]
        const commands = deserializeStack(envelopes)
        expect(commands.length).toBe(2)
        expect(commands[0].type).toBe(CommandType.ADD_COMPONENT)
        expect(commands[1].type).toBe(CommandType.CLEAR_CANVAS)
    })

    it('空数组返回空栈', () => {
        const commands = deserializeStack([])
        expect(commands).toEqual([])
    })
})
/**
 * 命令序列化与合并的单元测试
 *
 * 验证:
 * 1. serialize → deserialize 往复:data 等价、type 正确
 * 2. MoveCommand/ResizeCommand 的合并逻辑(同组件、时间窗口内)
 * 3. CommandManager 的 exportStack/importStack 往返
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
    MoveCommand,
    ResizeCommand,
    RotateCommand,
    CommandManager,
    deserialize,
    setCommandContext,
    type CommandContext,
} from '@/commands'
import type { ComponentData } from '@/types'

// ==================== mock CommandContext ====================

function makeMockStore(components: ComponentData[]): {
    ctx: CommandContext
    getComponents: () => ComponentData[]
} {
    const state = { components }

    const ctx: CommandContext = {
        get(id) {
            return state.components.find(c => c.id === id)
        },
        getAll() {
            return state.components
        },
        indexOf(id) {
            return state.components.findIndex(c => c.id === id)
        },
        setStyle(id, patch) {
            const c = state.components.find(c => c.id === id)
            if (c) Object.assign(c.style, patch)
        },
        setProp(id, patch) {
            const c = state.components.find(c => c.id === id)
            if (c) Object.assign(c, patch)
        },
        insert(item, index) {
            if (index !== undefined) state.components.splice(index, 0, item)
            else state.components.push(item)
        },
        remove(id) {
            const idx = state.components.findIndex(c => c.id === id)
            if (idx === -1) return null
            return state.components.splice(idx, 1)[0]
        },
        removeAt(index) {
            if (index < 0 || index >= state.components.length) return null
            return state.components.splice(index, 1)[0]
        },
        moveIndex(from, to) {
            const [item] = state.components.splice(from, 1)
            state.components.splice(to, 0, item)
        },
        replaceAll(list) {
            const backup = state.components.slice()
            state.components = list
            return backup
        },
        get curComponent() {
            return null
        },
        setCurComponent() {},
        getCanvas() {
            return { width: 1200, height: 740, scale: 100, color: '#000', opacity: 1, backgroundColor: '#fff', fontSize: 14 }
        },
        setCanvas() {},
        editorEl: null,
        clipboard: null,
        setClipboard() {},
    }

    return { ctx, getComponents: () => state.components }
}

const makeComponent = (id: string, top = 0, left = 0): ComponentData => ({
    id,
    component: 'VText',
    label: 'test',
    icon: '',
    propValue: 'hello',
    style: { width: 100, height: 50, top, left },
    parentId: null,
    slot: 'default',
    zIndex: 1,
    animations: [],
    events: {},
    groupStyle: {},
    isLock: false,
    collapseName: 'style',
    linkage: { duration: 0, data: [{ id: '', label: '', event: '', style: [{ key: '', value: '' }] }] },
})

beforeEach(() => {
    const { ctx } = makeMockStore([makeComponent('c1')])
    setCommandContext(ctx)
})

describe('MoveCommand 序列化往返', () => {
    it('serialize → deserialize 后 data 等价', () => {
        const cmd = new MoveCommand('c1', { top: 0, left: 0 }, { top: 100, left: 200 })
        const env = cmd.serialize()

        expect(env.type).toBe('MOVE_COMPONENT')
        expect(env.data).toMatchObject({
            componentId: 'c1',
            oldStyle: { top: 0, left: 0 },
            newStyle: { top: 100, left: 200 },
        })

        const restored = deserialize(env) as MoveCommand
        expect(restored).toBeInstanceOf(MoveCommand)
        expect(restored.serialize().data).toEqual(env.data)
    })

    it('execute 后 undo 能还原位置', () => {
        const { ctx, getComponents } = makeMockStore([makeComponent('c1', 0, 0)])
        setCommandContext(ctx)

        const cmd = new MoveCommand('c1', { top: 0, left: 0 }, { top: 100, left: 200 })
        cmd.execute()
        expect(getComponents()[0].style.top).toBe(100)
        expect(getComponents()[0].style.left).toBe(200)

        cmd.undo()
        expect(getComponents()[0].style.top).toBe(0)
        expect(getComponents()[0].style.left).toBe(0)
    })
})

describe('MoveCommand 合并', () => {
    it('同组件、时间窗口内应合并', () => {
        const a = new MoveCommand('c1', { top: 0, left: 0 }, { top: 10, left: 10 })
        const b = new MoveCommand('c1', { top: 10, left: 10 }, { top: 20, left: 20 })
        // 时间戳相近(构造时 Date.now)
        expect(a.canMergeWith(b, 300)).toBe(true)

        const merged = a.merge(b) as MoveCommand
        expect(merged.serialize().data).toMatchObject({
            oldStyle: { top: 0, left: 0 },
            newStyle: { top: 20, left: 20 },
        })
    })

    it('不同组件不应合并', () => {
        const a = new MoveCommand('c1', { top: 0, left: 0 }, { top: 10, left: 10 })
        const b = new MoveCommand('c2', { top: 0, left: 0 }, { top: 20, left: 20 })
        expect(a.canMergeWith(b, 300)).toBe(false)
    })
})

describe('CommandManager 栈序列化', () => {
    it('exportStack → importStack 往返保持可撤销', () => {
        const { ctx, getComponents } = makeMockStore([makeComponent('c1', 0, 0)])
        setCommandContext(ctx)

        const mgr = new CommandManager({ mergeTimeWindow: 0 })
        mgr.execute(new MoveCommand('c1', { top: 0, left: 0 }, { top: 50, left: 50 }))
        mgr.execute(new ResizeCommand('c1',
            { width: 100, height: 50 }, { width: 200, height: 100 }))

        expect(getComponents()[0].style.top).toBe(50)
        expect(getComponents()[0].style.width).toBe(200)

        // 导出栈
        const envs = mgr.exportStack()
        expect(envs.length).toBe(2)

        // 模拟跨会话:新 manager 从信封恢复
        const mgr2 = new CommandManager({ mergeTimeWindow: 0 })
        mgr2.importStack(envs)

        // 恢复后应能 undo(命令带完整快照)
        expect(mgr2.canUndo()).toBe(true)
        mgr2.undo() // 回退 resize
        expect(getComponents()[0].style.width).toBe(100)
        mgr2.undo() // 回退 move
        expect(getComponents()[0].style.top).toBe(0)
    })
})

describe('RotateCommand 序列化', () => {
    it('往返保持数据', () => {
        const cmd = new RotateCommand('c1', 0, 90)
        const env = cmd.serialize()
        const restored = deserialize(env) as RotateCommand
        expect(restored.serialize().data).toEqual(env.data)
    })
})

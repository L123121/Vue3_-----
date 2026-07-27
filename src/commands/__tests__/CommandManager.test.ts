import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { CommandManager } from '@/commands/CommandManager'
import { setCommandContext } from '@/commands/BaseCommand'
import { MoveCommand } from '@/commands/MoveCommand'
import { AddComponentCommand } from '@/commands/AddComponentCommand'
import { useStore } from '@/store'
import type { ComponentData, ComponentStyle, CopyData } from '@/types'
import type { CommandContext } from '@/commands/types'

/** 构造一个最小可用组件 */
function makeComponent(id: string, top = 0, left = 0): ComponentData {
    return {
        id,
        component: 'VText',
        label: id,
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
        linkage: { duration: 0, data: [] },
    }
}

/**
 * 创建测试用 CommandContext (直接操作 store)
 */
function createTestContext(store: ReturnType<typeof useStore>): CommandContext {
    return {
        get(id: string) { return store.componentData.find(c => c.id === id) },
        getAll() { return store.componentData },
        indexOf(id: string) { return store.componentData.findIndex(c => c.id === id) },

        setStyle(id: string, patch: Partial<ComponentStyle>) {
            const comp = store.componentData.find(c => c.id === id)
            if (!comp) return
            Object.assign(comp.style, patch)
            store.markDataDirty()
        },

        setProp(id: string, patch: Record<string, unknown>) {
            const comp = store.componentData.find(c => c.id === id)
            if (!comp) return
            Object.assign(comp, patch)
            store.markDataDirty()
        },

        insert(item: ComponentData, index?: number) {
            if (index !== undefined && index >= 0 && index <= store.componentData.length) {
                store.componentData.splice(index, 0, item)
            } else {
                store.componentData.push(item)
            }
            store.markDataDirty()
        },

        remove(id: string) {
            const idx = store.componentData.findIndex(c => c.id === id)
            if (idx === -1) return null
            return this.removeAt(idx)
        },

        removeAt(index: number) {
            if (index < 0 || index >= store.componentData.length) return null
            const removed = store.componentData.splice(index, 1)[0] ?? null
            store.markDataDirty()
            return removed
        },

        moveIndex(from: number, to: number) {
            if (from < 0 || from >= store.componentData.length) return
            if (to < 0 || to >= store.componentData.length) return
            const [item] = store.componentData.splice(from, 1)
            store.componentData.splice(to, 0, item)
            store.markDataDirty()
        },

        replaceAll(list: ComponentData[]) {
            const backup = store.componentData.slice()
            store.componentData.splice(0, store.componentData.length, ...list)
            store.markDataDirty()
            return backup
        },

        get curComponent() { return store.curComponent },
        setCurComponent(id: string | null) {
            if (id === null) { store.setCurComponent({ component: null, index: null }); return }
            const idx = store.componentData.findIndex(c => c.id === id)
            if (idx !== -1) store.setCurComponent({ component: store.componentData[idx], index: idx })
        },

        getCanvas() { return store.canvasStyleData },
        setCanvas(patch: Record<string, unknown>) { Object.assign(store.canvasStyleData, patch); store.markDataDirty() },

        get editorEl() { return store.editor },
        get clipboard() { return store.copyData },
        setClipboard(data: CopyData | null) { store.copyData = data },
    }
}

describe('CommandManager - 撤销重做双栈', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        setCommandContext(createTestContext(useStore()))
    })

    it('execute 后入栈，canUndo 为 true', () => {
        const store = useStore()
        const manager = new CommandManager()
        store.setComponentData([makeComponent('c1', 0, 0)])

        manager.execute(new MoveCommand('c1', { top: 0, left: 0 }, { top: 10, left: 20 }))
        expect(manager.canUndo()).toBe(true)
        expect(manager.canRedo()).toBe(false)
        expect(manager.getUndoStackSize()).toBe(1)
    })

    it('undo 撤销后，redo 可恢复', () => {
        const store = useStore()
        const manager = new CommandManager()
        store.setComponentData([makeComponent('c1', 0, 0)])

        const cmd = new MoveCommand('c1', { top: 0, left: 0 }, { top: 42, left: 7 })
        manager.execute(cmd)

        const component = store.componentData[0]
        expect(component.style.top).toBe(42)

        expect(manager.undo()).toBe(true)
        expect(component.style.top).toBe(0)

        expect(manager.canRedo()).toBe(true)
        expect(manager.redo()).toBe(true)
        expect(component.style.top).toBe(42)
    })

    it('undo 栈为空时 undo 返回 false', () => {
        const manager = new CommandManager()
        expect(manager.undo()).toBe(false)
        expect(manager.redo()).toBe(false)
    })

    it('新命令执行后清空 redo 栈', () => {
        const store = useStore()
        const manager = new CommandManager()
        store.setComponentData([makeComponent('c1', 0, 0)])

        manager.execute(new MoveCommand('c1', { top: 0, left: 0 }, { top: 1, left: 1 }))
        manager.undo()
        expect(manager.canRedo()).toBe(true)

        // 执行新命令 → redo 栈应被清空
        manager.execute(new MoveCommand('c1', { top: 0, left: 0 }, { top: 2, left: 2 }))
        expect(manager.canRedo()).toBe(false)
    })

    it('超过 maxStackSize 时丢弃最旧命令', () => {
        const store = useStore()
        const manager = new CommandManager({ maxStackSize: 3 })
        store.setComponentData([makeComponent('c1', 0, 0)])

        // mergeable=false 的 AddComponent 不会被合并，逐个入栈
        // 注意 AddComponentCommand 内部会调 store.addComponent，需保证组件 id 唯一
        for (let i = 0; i < 5; i++) {
            manager.execute(new AddComponentCommand(makeComponent(`c${i}`)))
        }

        expect(manager.getUndoStackSize()).toBe(3)
    })
})

describe('CommandManager - 命令合并', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        setCommandContext(createTestContext(useStore()))
    })

    it('300ms 内同组件的 MoveCommand 合并为一条', () => {
        const store = useStore()
        const manager = new CommandManager({ mergeTimeWindow: 300 })
        store.setComponentData([makeComponent('c1', 0, 0)])

        // 同一组件连续移动 3 次，最终位置应是最后一次
        manager.execute(new MoveCommand('c1', { top: 0, left: 0 }, { top: 10, left: 10 }))
        manager.execute(new MoveCommand('c1', { top: 10, left: 10 }, { top: 20, left: 20 }))
        manager.execute(new MoveCommand('c1', { top: 20, left: 20 }, { top: 30, left: 30 }))

        expect(manager.getUndoStackSize()).toBe(1)

        // 撤销一次应直接回到起点（oldStyle = 第一次的 0,0）
        manager.undo()
        expect(store.componentData[0].style.top).toBe(0)
        expect(store.componentData[0].style.left).toBe(0)
    })

    it('不同组件的 MoveCommand 不合并', () => {
        const store = useStore()
        const manager = new CommandManager({ mergeTimeWindow: 300 })
        store.setComponentData([makeComponent('c1', 0, 0), makeComponent('c2', 0, 0)])

        manager.execute(new MoveCommand('c1', { top: 0, left: 0 }, { top: 10, left: 10 }))
        manager.execute(new MoveCommand('c2', { top: 0, left: 0 }, { top: 20, left: 20 }))

        expect(manager.getUndoStackSize()).toBe(2)
    })
})

describe('MoveCommand', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        setCommandContext(createTestContext(useStore()))
    })

    it('execute 后组件位置更新', () => {
        const store = useStore()
        store.setComponentData([makeComponent('c1', 5, 5)])

        const cmd = new MoveCommand('c1', { top: 5, left: 5 }, { top: 99, left: 88 })
        cmd.execute()

        expect(store.componentData[0].style.top).toBe(99)
        expect(store.componentData[0].style.left).toBe(88)
    })

    it('目标组件不存在时静默返回（不抛错）', () => {
        const store = useStore()
        store.setComponentData([])

        const cmd = new MoveCommand('not-exist', { top: 0, left: 0 }, { top: 1, left: 1 })
        expect(() => cmd.execute()).not.toThrow()
        expect(() => cmd.undo()).not.toThrow()
        expect(store.componentData.length).toBe(0)
    })

    it('canMergeWith 仅对同组件的 MoveCommand 为 true', () => {
        const store = useStore()
        store.setComponentData([makeComponent('c1', 0, 0), makeComponent('c2', 0, 0)])

        const a = new MoveCommand('c1', { top: 0, left: 0 }, { top: 1, left: 1 })
        const b = new MoveCommand('c1', { top: 1, left: 1 }, { top: 2, left: 2 })
        const c = new MoveCommand('c2', { top: 0, left: 0 }, { top: 3, left: 3 })

        expect(a.canMergeWith(b, 300)).toBe(true)
        expect(a.canMergeWith(c, 300)).toBe(false)
    })

    it('merge 保留起点 oldStyle 与终态 newStyle', () => {
        const a = new MoveCommand('c1', { top: 0, left: 0 }, { top: 10, left: 10 })
        const b = new MoveCommand('c1', { top: 10, left: 10 }, { top: 30, left: 30 })
        const merged = a.merge(b)

        expect(merged).not.toBe(a)
        // 撤销应回到最开始的 0,0，而非中间的 10,10
        const store = useStore()
        store.setComponentData([makeComponent('c1', 30, 30)])
        merged.undo()
        expect(store.componentData[0].style.top).toBe(0)
        expect(store.componentData[0].style.left).toBe(0)
    })
})

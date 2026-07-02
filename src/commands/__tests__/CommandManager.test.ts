import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { CommandManager } from '@/commands/CommandManager'
import { MoveCommand } from '@/commands/MoveCommand'
import { AddComponentCommand } from '@/commands/AddComponentCommand'
import { useStore } from '@/store'
import type { ComponentData } from '@/types'

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

describe('CommandManager - 撤销重做双栈', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
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

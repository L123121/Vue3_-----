/**
 * 命令类 execute/undo 行为测试
 *
 * 验证每个命令的 execute 和 undo 能正确操作 store 状态。
 * ResizeCommand/RotateCommand/AddComponentCommand/DeleteComponentCommand 等。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setCommandContext } from '@/commands/BaseCommand'
import { useStore } from '@/store'
import { toRaw } from 'vue'
import type { ComponentData, ComponentStyle, CopyData } from '@/types'
import type { CommandContext } from '@/commands/types'

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

function createTestContext(store: ReturnType<typeof useStore>): CommandContext {
    return {
        get(id: string) { return store.componentData.find(c => c.id === id) },
        getAll() { return toRaw(store.componentData) },
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

beforeEach(() => {
    setActivePinia(createPinia())
    setCommandContext(createTestContext(useStore()))
})

describe('ResizeCommand', () => {
    it('execute 后组件尺寸更新', async () => {
        const { ResizeCommand } = await import('@/commands/ResizeCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1')])

        const cmd = new ResizeCommand('c1',
            { width: 100, height: 50, top: 0, left: 0 },
            { width: 200, height: 100, top: 10, left: 10 },
        )
        cmd.execute()

        expect(store.componentData[0].style.width).toBe(200)
        expect(store.componentData[0].style.height).toBe(100)
        expect(store.componentData[0].style.top).toBe(10)
        expect(store.componentData[0].style.left).toBe(10)
    })

    it('undo 恢复旧尺寸', async () => {
        const { ResizeCommand } = await import('@/commands/ResizeCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1')])

        const cmd = new ResizeCommand('c1',
            { width: 100, height: 50, top: 0, left: 0 },
            { width: 200, height: 100, top: 10, left: 10 },
        )
        cmd.execute()
        cmd.undo()

        expect(store.componentData[0].style.width).toBe(100)
        expect(store.componentData[0].style.height).toBe(50)
    })
})

describe('RotateCommand', () => {
    it('execute 后旋转角度更新', async () => {
        const { RotateCommand } = await import('@/commands/RotateCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1')])

        const cmd = new RotateCommand('c1', 0, 90)
        cmd.execute()

        expect(store.componentData[0].style.rotate).toBe(90)
    })

    it('undo 恢复原角度', async () => {
        const { RotateCommand } = await import('@/commands/RotateCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1')])

        const cmd = new RotateCommand('c1', 0, 90)
        cmd.execute()
        cmd.undo()

        expect(store.componentData[0].style.rotate).toBe(0)
    })

    it('合并保留起点和终点', async () => {
        const { RotateCommand } = await import('@/commands/RotateCommand')
        const a = new RotateCommand('c1', 0, 45)
        const b = new RotateCommand('c1', 45, 90)
        const merged = a.merge(b)

        const store = useStore()
        store.setComponentData([makeComponent('c1')])
        merged.execute()
        expect(store.componentData[0].style.rotate).toBe(90)

        merged.undo()
        expect(store.componentData[0].style.rotate).toBe(0)
    })
})

describe('AddComponentCommand', () => {
    it('execute 添加组件到数组', async () => {
        const { AddComponentCommand } = await import('@/commands/AddComponentCommand')
        const store = useStore()
        store.setComponentData([])

        const cmd = new AddComponentCommand(makeComponent('c1'))
        cmd.execute()

        expect(store.componentData.length).toBe(1)
        expect(store.componentData[0].id).toBe('c1')
    })

    it('undo 移除添加的组件', async () => {
        const { AddComponentCommand } = await import('@/commands/AddComponentCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1')])

        const cmd = new AddComponentCommand(makeComponent('c2'))
        cmd.execute()
        expect(store.componentData.length).toBe(2)

        cmd.undo()
        expect(store.componentData.length).toBe(1)
        expect(store.componentData[0].id).toBe('c1')
    })

    it('指定 index 插入到正确位置', async () => {
        const { AddComponentCommand } = await import('@/commands/AddComponentCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1', 0, 0), makeComponent('c3', 0, 0)])

        const cmd = new AddComponentCommand(makeComponent('c2'), 1)
        cmd.execute()

        expect(store.componentData[1].id).toBe('c2')
    })
})

describe('DeleteComponentCommand', () => {
    it('execute 删除组件', async () => {
        const { DeleteComponentCommand } = await import('@/commands/DeleteComponentCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1'), makeComponent('c2')])

        const cmd = new DeleteComponentCommand('c1')
        cmd.execute()

        expect(store.componentData.length).toBe(1)
        expect(store.componentData[0].id).toBe('c2')
    })

    it('undo 恢复被删除的组件', async () => {
        const { DeleteComponentCommand } = await import('@/commands/DeleteComponentCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1'), makeComponent('c2')])

        const cmd = new DeleteComponentCommand('c1')
        cmd.execute()
        cmd.undo()

        expect(store.componentData.length).toBe(2)
        expect(store.componentData[0].id).toBe('c1')
    })

    it('删除容器组件时级联删除子组件', async () => {
        const { DeleteComponentCommand } = await import('@/commands/DeleteComponentCommand')
        const store = useStore()
        store.setComponentData([
            makeComponent('parent'),
            { ...makeComponent('child'), id: 'child', parentId: 'parent' },
        ])

        const cmd = new DeleteComponentCommand('parent')
        cmd.execute()

        expect(store.componentData.length).toBe(0)
    })

    it('级联删除后 undo 恢复所有组件', async () => {
        const { DeleteComponentCommand } = await import('@/commands/DeleteComponentCommand')
        const store = useStore()
        store.setComponentData([
            makeComponent('parent'),
            { ...makeComponent('child'), id: 'child', parentId: 'parent' },
        ])

        const cmd = new DeleteComponentCommand('parent')
        cmd.execute()
        expect(store.componentData.length).toBe(0)

        cmd.undo()
        expect(store.componentData.length).toBe(2)
        expect(store.componentData.find(c => c.id === 'child')).toBeDefined()
    })
})

describe('LayerCommand', () => {
    it('up 操作将组件在数组中后移一位', async () => {
        const { LayerCommand } = await import('@/commands/LayerCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1'), makeComponent('c2')])

        // c1 在 index 0, c2 在 index 1
        const cmd = new LayerCommand('c1', 'up')
        cmd.execute()

        // up = 数组后移 → c1 变为 index 1
        expect(store.componentData[0].id).toBe('c2')
        expect(store.componentData[1].id).toBe('c1')
    })

    it('down 操作将组件在数组中前移一位', async () => {
        const { LayerCommand } = await import('@/commands/LayerCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1'), makeComponent('c2')])

        // c2 在 index 1, down = 数组前移 → c2 变为 index 0
        const cmd = new LayerCommand('c2', 'down')
        cmd.execute()

        expect(store.componentData[0].id).toBe('c2')
        expect(store.componentData[1].id).toBe('c1')
    })

    it('undo 恢复原数组顺序', async () => {
        const { LayerCommand } = await import('@/commands/LayerCommand')
        const store = useStore()
        store.setComponentData([makeComponent('c1'), makeComponent('c2'), makeComponent('c3')])

        const cmd = new LayerCommand('c1', 'up')
        cmd.execute()
        expect(store.componentData[1].id).toBe('c1')

        cmd.undo()
        expect(store.componentData[0].id).toBe('c1')
        expect(store.componentData[1].id).toBe('c2')
    })
})
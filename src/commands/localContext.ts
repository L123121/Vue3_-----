/**
 * CommandContext 的本地(单机)实现
 *
 * 直接操作 store.componentData(响应式数组)的本地实现。
 * 所有原语触发 markDataDirty() 用于自动保存脏标记。
 */

import { useStore } from '@/store'
import type { CommandContext } from '@/commands/types'
import type { CopyData } from '@/types'
import { moveArrayItem, normalizeComponentZIndex, resolveLayerInsertIndex } from '@/utils/layer'

export function createCommandContext(): CommandContext {
    const store = useStore()
    return {
        get(id) {
            return store.componentData.find(c => c.id === id)
        },
        getAll() {
            return store.componentData
        },
        indexOf(id) {
            return store.componentData.findIndex(c => c.id === id)
        },

        setStyle(id, patch) {
            const comp = store.componentData.find(c => c.id === id)
            if (!comp) return
            Object.assign(comp.style, patch)
            store.markDataDirty()
        },

        setProp(id, patch) {
            const comp = store.componentData.find(c => c.id === id)
            if (!comp) return
            Object.assign(comp, patch)
            store.markDataDirty()
        },

        insert(item, index) {
            const insertIndex = resolveLayerInsertIndex(store.componentData.length, index)
            store.componentData.splice(insertIndex, 0, item)
            normalizeComponentZIndex(store.componentData)
            store.markDataDirty()
        },

        remove(id) {
            const idx = store.componentData.findIndex(c => c.id === id)
            if (idx === -1) return null
            return this.removeAt(idx)
        },

        removeAt(index) {
            if (index < 0 || index >= store.componentData.length) return null
            const removed = store.componentData.splice(index, 1)[0]
            normalizeComponentZIndex(store.componentData)
            store.markDataDirty()
            return removed
        },

        moveIndex(from, to) {
            if (from < 0 || from >= store.componentData.length) return
            if (to < 0 || to >= store.componentData.length) return
            moveArrayItem(store.componentData, from, to)
            normalizeComponentZIndex(store.componentData)
            store.markDataDirty()
        },

        replaceAll(list) {
            const backup = store.componentData.slice()
            store.componentData.splice(0, store.componentData.length, ...list)
            normalizeComponentZIndex(store.componentData)
            store.markDataDirty()
            return backup
        },

        get curComponent() {
            return store.curComponent
        },
        setCurComponent(id) {
            if (id === null) {
                store.setCurComponent({ component: null, index: null })
                return
            }
            const idx = store.componentData.findIndex(c => c.id === id)
            if (idx !== -1) {
                store.setCurComponent({ component: store.componentData[idx], index: idx })
            }
        },

        getCanvas() {
            return store.canvasStyleData
        },
        setCanvas(patch) {
            Object.assign(store.canvasStyleData, patch)
            store.markDataDirty()
        },

        get editorEl() {
            return store.editor
        },

        get clipboard() {
            return store.copyData
        },
        setClipboard(data: CopyData | null) {
            store.copyData = data
        },
    }
}

// 别名导出，兼容 useCommandActions.ts 的导入
export const createLocalCommandContext = createCommandContext
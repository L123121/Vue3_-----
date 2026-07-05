/**
 * CommandContext 的协同实现
 *
 * 桥接 store.componentData(响应式) 与 Yjs 文档(协同同步)。
 * 每个原语 = 改 store 数组 + 精确镜像到 Yjs(属性级合并)。
 *
 * 关键:所有 Yjs 写操作包在 applyLocalChange(LOCAL_ORIGIN 事务)内,
 * 这样远端能区分本地 vs 远端变更;isApplyingRemote 守护避免 observe 回调循环。
 *
 * 若协同未初始化(单机/初始化前),applyLocalChange 直接执行 fn,
 * ctx 退化为纯 store 数组操作——单机仍可用。
 */

import { useStore } from '@/store'
import type { CommandContext } from '@/commands/types'
import type { CopyData } from '@/types'
import { applyLocalChange } from './useCollabStore'
import { fromComponentData, findYMapIndex, replaceAllComponents, writeCanvas } from './yDoc'
import { isApplyingRemote } from './undoOrigin'
import { getCollab } from './useCollabStore'
import * as Y from 'yjs'

export function createCommandContext(): CommandContext {
    const store = useStore()

    /** 获取 yComponents(协同未启用时返回 null) */
    function yComponents(): Y.Array<Y.Map<unknown>> | null {
        return getCollab()?.collabDoc.yComponents ?? null
    }

    /** 把 store 中指定 id 的组件同步到 Yjs(增量写) */
    function syncComponentToYjs(id: string): void {
        const arr = yComponents()
        if (!arr) return
        const comp = store.componentData.find(c => c.id === id)
        if (!comp) return
        const idx = findYMapIndex(arr, id)
        applyLocalChange(() => {
            if (idx >= 0) {
                // 更新已有 Y.Map(属性级,fromComponentData 内部按字段 diff)
                fromComponentData(arr.get(idx), comp)
            } else {
                // 新组件:push 一个新 Y.Map
                const ymap = new Y.Map()
                fromComponentData(ymap, comp)
                arr.push([ymap])
            }
        })
    }

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
            // 改 store(响应式)
            Object.assign(comp.style, patch)
            // 镜像到 Yjs style Y.Map(属性级)
            const arr = yComponents()
            if (arr) {
                const idx = findYMapIndex(arr, id)
                if (idx >= 0) {
                    const ymap = arr.get(idx)
                    const styleMap = ymap.get('style') as Y.Map<unknown> | undefined
                    if (styleMap) {
                        applyLocalChange(() => {
                            for (const [k, v] of Object.entries(patch)) {
                                styleMap.set(k, v)
                            }
                        })
                    } else {
                        syncComponentToYjs(id)
                    }
                }
            }
            store.markDataDirty()
        },

        setProp(id, patch) {
            const comp = store.componentData.find(c => c.id === id)
            if (!comp) return
            Object.assign(comp, patch)
            syncComponentToYjs(id)
            store.markDataDirty()
        },

        insert(item, index) {
            if (isApplyingRemote()) {
                // 远端推来的变更已在 store,不回写 Yjs
                return
            }
            if (index !== undefined && index >= 0 && index <= store.componentData.length) {
                store.componentData.splice(index, 0, item)
            } else {
                store.componentData.push(item)
            }
            // 镜像到 Yjs
            const arr = yComponents()
            if (arr) {
                applyLocalChange(() => {
                    const ymap = new Y.Map()
                    fromComponentData(ymap, item)
                    const insertIndex = index ?? arr.length
                    arr.insert(insertIndex, [ymap])
                })
            }
            store.markDataDirty()
        },

        remove(id) {
            if (isApplyingRemote()) return null
            const idx = store.componentData.findIndex(c => c.id === id)
            if (idx === -1) return null
            return this.removeAt(idx)
        },

        removeAt(index) {
            if (isApplyingRemote()) return null
            if (index < 0 || index >= store.componentData.length) return null
            const removed = store.componentData.splice(index, 1)[0]
            // 镜像到 Yjs
            const arr = yComponents()
            if (arr && index < arr.length) {
                applyLocalChange(() => {
                    arr.delete(index, 1)
                })
            }
            store.markDataDirty()
            return removed
        },

        moveIndex(from, to) {
            if (isApplyingRemote()) return
            if (from < 0 || from >= store.componentData.length) return
            if (to < 0 || to >= store.componentData.length) return
            const [item] = store.componentData.splice(from, 1)
            store.componentData.splice(to, 0, item)
            // 镜像到 Yjs:Y.Array 的 move
            const arr = yComponents()
            if (arr) {
                applyLocalChange(() => {
                    // Y.Array 没有 move,用 delete + insert
                    const ymap = arr.get(from)
                    arr.delete(from, 1)
                    arr.insert(to, [ymap])
                })
            }
            store.markDataDirty()
        },

        replaceAll(list) {
            const backup = store.componentData.slice()
            if (isApplyingRemote()) {
                // 远端已写 store,不回写 Yjs
                store.componentData.splice(0, store.componentData.length, ...list)
                return backup
            }
            store.componentData.splice(0, store.componentData.length, ...list)
            const arr = yComponents()
            if (arr) {
                applyLocalChange(() => {
                    replaceAllComponents(arr, list)
                })
            }
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
            const collab = getCollab()
            if (collab) {
                applyLocalChange(() => {
                    writeCanvas(collab.collabDoc.yCanvas, store.canvasStyleData)
                })
            }
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

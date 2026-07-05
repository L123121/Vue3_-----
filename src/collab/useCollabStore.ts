/**
 * useCollabStore: Yjs 文档 ↔ Pinia store 的响应式桥接
 *
 * 职责:
 * 1. 初始化 CollabDoc + Provider + Awareness
 * 2. observeDeep 监听 Yjs 变更 → 写回 store.componentData(响应式视图)
 * 3. 提供 applyLocalChange(fn):本地命令在 Yjs 事务内安全地修改文档
 *
 * 循环守护:
 *   本地命令 → applyLocalChange 写 Yjs(带 LOCAL_ORIGIN)
 *     → observe 触发 → 但此时 isApplyingRemote=false,且变更确实需要反映到 store
 *   远端变更 → observe 触发 → setApplyingRemote(true) → 写 store → 不再触发本地命令
 *
 * 关键:本地写 Yjs 后 observe 也会触发,这是必要的(视图要更新)。
 * isApplyingRemote 只用于区分"要不要把变更当成本地命令重放"——
 * 本项目命令由 CommandManager 主导,observe 回调只负责更新响应式 componentData 视图,
 * 不重放命令,因此循环风险仅在于"store 写 Yjs 时不要触发 observe 又写 store"。
 * 由 store 侧(阶段4)在 setComponentData 等 setter 中判断 isApplyingRemote 守护。
 */

import { ref, type Ref } from 'vue'
import type * as Y from 'yjs'
import { useStore } from '@/store'
import { createCollabDoc, readAllComponents, readCanvas, replaceAllComponents, type CollabDoc } from './yDoc'
import { createProvider, resolveRoomName, type CollabProvider } from './provider'
import { createAwareness, type AwarenessHandle } from './awareness'
import { LOCAL_ORIGIN, setApplyingRemote } from './undoOrigin'

export interface CollabState {
    doc: Y.Doc
    collabDoc: CollabDoc
    provider: CollabProvider
    awareness: AwarenessHandle
    /** 连接状态(响应式) */
    status: Ref<'connecting' | 'connected' | 'disconnected'>
    /** 是否已与远端同步完成 */
    synced: Ref<boolean>
    /** 销毁(组件卸载时) */
    destroy(): void
}

let _instance: CollabState | null = null

/**
 * 初始化协同(单例,应用启动时调用一次)。
 * 把 store 现有的 componentData 作为初始值灌入 Yjs(仅首次),之后以 Yjs 为准。
 */
export function initCollab(): CollabState {
    if (_instance) return _instance

    const store = useStore()
    const collabDoc = createCollabDoc()
    const { doc, yComponents, yCanvas } = collabDoc

    const status = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
    const synced = ref(false)

    const provider = createProvider(collabDoc, {
        roomName: resolveRoomName(),
        onStatus: (s) => {
            status.value = s
        },
        onSynced: () => {
            // 首次同步完成:若 Yjs 文档为空且本地 store 有数据,灌入
            if (!synced.value) {
                synced.value = true
                if (yComponents.length === 0 && store.componentData.length > 0) {
                    applyLocalChange(() => {
                        // 用本地数据初始化远端文档
                        replaceAllComponents(yComponents, store.componentData)
                    })
                }
            }
        },
    })

    const awareness = createAwareness(provider.awareness)

    // 先组装 _instance,使 applyLocalChange 在后续回调中可用
    _instance = {
        doc,
        collabDoc,
        provider,
        awareness,
        status,
        synced,
        destroy() {
            provider.destroy()
            doc.destroy()
            _instance = null
        },
    }

    // 监听 Yjs 变更 → 写回 store 响应式视图
    const syncToStore = (): void => {
        setApplyingRemote(true)
        try {
            // 直接替换 store.componentData 数组内容,触发 Vue 响应
            // 注意:这里用 splice 整体替换,保留数组引用(Pinia state 引用不变)
            const next = readAllComponents(yComponents)
            store.componentData.splice(0, store.componentData.length, ...next)
            // canvas 同步
            const canvas = readCanvas(yCanvas)
            Object.assign(store.canvasStyleData, canvas)
            // 刷新当前组件引用(Yjs 换掉了原对象,引用已失效)
            store.refreshCurComponent()
        } finally {
            setApplyingRemote(false)
        }
    }

    yComponents.observeDeep(() => {
        syncToStore()
    })
    yCanvas.observe(() => {
        syncToStore()
    })

    return _instance
}

/**
 * 在 Yjs 事务内执行本地变更。
 * 所有本地命令对 componentData 的修改,最终都应经此进入 Yjs。
 */
export function applyLocalChange(fn: () => void): void {
    const state = _instance
    if (!state) {
        // 协同未初始化(如单机模式或初始化前),直接执行
        fn()
        return
    }
    state.doc.transact(() => {
        fn()
    }, LOCAL_ORIGIN)
}

/** 获取协同单例(未初始化返回 null) */
export function getCollab(): CollabState | null {
    return _instance
}

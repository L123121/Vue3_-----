/**
 * 命令历史持久化(跨会话)
 *
 * 监听 dataVersion 变化(每次命令执行/撤销都会递增),防抖后把撤销栈
 * 序列化(commandManager.exportStack())写入 IndexedDB。
 * 应用启动时从 IndexedDB 恢复栈(importCommandStack),刷新后仍可 Ctrl+Z。
 *
 * 注意:命令栈是"本地操作历史",不参与协同同步(各端各有自己的栈)。
 * 与 y-indexeddb(持久化的是文档状态)正交。
 */

import { watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useStore } from '@/store'
import type { CommandEnvelope } from '@/commands/types'
import { exportCommandStack, importCommandStack } from '@/composables/useCommandActions'

const DB_NAME = 'lowcode-collab'
const STORE_NAME = 'command-history'
const KEY = 'undoStack'
const DEBOUNCE_MS = 800

// ==================== 最小 IndexedDB KV 封装 ====================

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

async function idbSet(key: string, value: unknown): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

async function idbGet<T>(key: string): Promise<T | null> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(key)
        req.onsuccess = () => resolve((req.result as T) ?? null)
        req.onerror = () => reject(req.error)
    })
}

// ==================== composable ====================

export function useCommandHistory(): void {
    const store = useStore()
    const { dataVersion } = storeToRefs(store)

    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let lastSavedVersion = 0

    async function persist(): Promise<void> {
        if (dataVersion.value === lastSavedVersion) return
        const envelopes = exportCommandStack()
        try {
            await idbSet(KEY, envelopes)
            lastSavedVersion = dataVersion.value
        } catch (e) {
            console.error('[command-history] 持久化失败:', e)
        }
    }

    function schedulePersist(): void {
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
            void persist()
        }, DEBOUNCE_MS)
    }

    // 防抖监听数据变更
    watch(dataVersion, () => {
        schedulePersist()
    })

    // 关闭前强制保存
    function handleBeforeUnload(): void {
        void persist()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    onUnmounted(() => {
        if (saveTimer) clearTimeout(saveTimer)
        window.removeEventListener('beforeunload', handleBeforeUnload)
    })
}

/**
 * 应用启动时调用:从 IndexedDB 恢复命令栈。
 * 应在协同初始化之后、用户操作之前调用。
 */
export async function restoreCommandHistory(): Promise<void> {
    try {
        const envelopes = await idbGet<CommandEnvelope[]>(KEY)
        if (envelopes && Array.isArray(envelopes) && envelopes.length > 0) {
            importCommandStack(envelopes)
        }
    } catch (e) {
        console.warn('[command-history] 恢复失败:', e)
    }
}

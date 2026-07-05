import { watch, onUnmounted } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { getCollab } from '@/collab/useCollabStore'

/**
 * 自动保存 composable
 *
 * 使用脏标记（dirty flag）替代 deep watch：
 * - store 在每次数据变更时递增 dataVersion
 * - 这里 watch dataVersion（浅监听），避免 drag 期间每帧触发 deep watch
 * - 防抖 3 秒后写入 localStorage，60 秒兜底保存
 */
export function useAutoSave(): void {
    const store = useStore()
    const { componentData, canvasStyleData, dataVersion } = storeToRefs(store)

    let autosaveTimer: ReturnType<typeof setInterval> | null = null
    let saveTimeout: ReturnType<typeof setTimeout> | null = null
    let lastSavedVersion = 0

    // 浅监听 dataVersion —— 不会因 drag 期间 style 属性变化而触发
    watch(dataVersion, () => {
        scheduleAutosave()
    })

    // 画布配置变化频率低，保留 deep watch
    watch(canvasStyleData, () => {
        scheduleAutosave()
    }, { deep: true })

    function scheduleAutosave(): void {
        if (saveTimeout) clearTimeout(saveTimeout)
        saveTimeout = setTimeout(() => saveToStorage(), 3000)
    }

    function saveToStorage(): void {
        if (dataVersion.value === lastSavedVersion) return
        // 协同启用时,文档由 y-indexeddb 持久化(更可靠、容量大),跳过 localStorage 写入避免双写冗余
        if (getCollab()) {
            lastSavedVersion = dataVersion.value
            return
        }
        try {
            localStorage.setItem('canvasData', JSON.stringify(componentData.value))
            localStorage.setItem('canvasStyle', JSON.stringify(canvasStyleData.value))
            lastSavedVersion = dataVersion.value
        } catch (e) {
            console.error('自动保存失败:', e)
        }
    }

    function handleBeforeUnload(): void {
        saveToStorage()
    }

    // 初始化
    window.addEventListener('beforeunload', handleBeforeUnload)
    autosaveTimer = setInterval(saveToStorage, 60000)

    // 清理
    onUnmounted(() => {
        if (autosaveTimer) clearInterval(autosaveTimer)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        if (saveTimeout) clearTimeout(saveTimeout)
    })
}

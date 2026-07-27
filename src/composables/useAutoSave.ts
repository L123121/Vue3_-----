import { watch, onUnmounted } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { saveProjectDocument } from '@/storage/projectStorage'

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
    let dirty = false
    let saving: Promise<void> | null = null

    // 浅监听 dataVersion —— 不会因 drag 期间 style 属性变化而触发
    watch(dataVersion, () => {
        markDirty()
    })

    // 画布配置变化频率低，保留 deep watch
    watch(canvasStyleData, () => {
        markDirty()
    }, { deep: true })

    function markDirty(): void {
        dirty = true
        scheduleAutosave()
    }

    function scheduleAutosave(): void {
        if (saveTimeout) clearTimeout(saveTimeout)
        saveTimeout = setTimeout(() => { void saveToStorage() }, 3000)
    }

    async function saveToStorage(force = false): Promise<void> {
        if ((!dirty && !force) || saving) return saving || Promise.resolve()

        const savedVersion = dataVersion.value
        const savedCanvasStyle = JSON.stringify(canvasStyleData.value)
        dirty = false
        saving = saveProjectDocument({
            componentData: componentData.value,
            canvasStyle: canvasStyleData.value,
        }).then(() => {
            const changedWhileSaving = dataVersion.value !== savedVersion
                || JSON.stringify(canvasStyleData.value) !== savedCanvasStyle
            if (changedWhileSaving) {
                dirty = true
                scheduleAutosave()
            }
        }).catch((error) => {
            dirty = true
            console.error('自动保存失败:', error)
        }).finally(() => {
            saving = null
        })

        try {
            await saving
        } finally {
            saving = null
        }
    }

    function handlePageHide(): void {
        void saveToStorage(true)
    }

    function handleVisibilityChange(): void {
        if (document.visibilityState === 'hidden') handlePageHide()
    }

    // 初始化
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    autosaveTimer = setInterval(() => { void saveToStorage() }, 60000)

    // 清理
    onUnmounted(() => {
        if (autosaveTimer) clearInterval(autosaveTimer)
        window.removeEventListener('pagehide', handlePageHide)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (saveTimeout) clearTimeout(saveTimeout)
        void saveToStorage(true)
    })
}

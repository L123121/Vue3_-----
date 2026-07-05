/**
 * useVersionManager composable
 *
 * 版本管理：保存、恢复、删除页面版本快照。
 * 从 Pinia store 中剥离，使 store 专注于纯状态管理。
 */

import { useStore } from '@/store'
import { deepCopy } from '@/utils/utils'
import generateID from '@/utils/generateID'
import { validatePageVersions } from '@/utils/validation'
import { ElMessage } from 'element-plus'
import type { PageVersion } from '@/types'
import { importDataWithCommand } from '@/composables/useCommandActions'

export function useVersionManager() {
    const store = useStore()

    function saveVersion(name: string, description: string): void {
        const version: PageVersion = {
            id: generateID(),
            name,
            description,
            snapshot: deepCopy(store.componentData),
            createdAt: new Date().toISOString(),
        }
        store.versions.push(version)
        saveVersionsToStorage()
        ElMessage.success('版本保存成功')
    }

    function restoreVersion(versionId: string): void {
        const version = store.versions.find(v => v.id === versionId)
        if (version) {
            importDataWithCommand(deepCopy(version.snapshot))
            ElMessage.success('版本恢复成功')
        }
    }

    function deleteVersion(versionId: string): void {
        store.versions = store.versions.filter(v => v.id !== versionId)
        saveVersionsToStorage()
        ElMessage.success('版本删除成功')
    }

    function saveVersionsToStorage(): void {
        localStorage.setItem('pageVersions', JSON.stringify(store.versions))
    }

    function loadVersionsFromStorage(): void {
        const data = localStorage.getItem('pageVersions')
        if (data) {
            try {
                const parsed = JSON.parse(data)
                const result = validatePageVersions(parsed)
                if (result.success && result.data) {
                    store.versions = result.data as unknown as PageVersion[]
                } else {
                    console.warn('版本数据校验失败，已重置:', result.errors)
                    store.versions = []
                }
            } catch {
                store.versions = []
            }
        }
    }

    return {
        saveVersion,
        restoreVersion,
        deleteVersion,
        saveVersionsToStorage,
        loadVersionsFromStorage,
    }
}

// 模块级便捷函数（非 setup 环境使用）
export function saveVersion(name: string, description: string): void {
    const store = useStore()
    const version: PageVersion = {
        id: generateID(),
        name,
        description,
        snapshot: deepCopy(store.componentData),
        createdAt: new Date().toISOString(),
    }
    store.versions.push(version)
    localStorage.setItem('pageVersions', JSON.stringify(store.versions))
    ElMessage.success('版本保存成功')
}

export function restoreVersion(versionId: string): void {
    const store = useStore()
    const version = store.versions.find(v => v.id === versionId)
    if (version) {
        importDataWithCommand(deepCopy(version.snapshot))
        ElMessage.success('版本恢复成功')
    }
}

export function deleteVersion(versionId: string): void {
    const store = useStore()
    store.versions = store.versions.filter(v => v.id !== versionId)
    localStorage.setItem('pageVersions', JSON.stringify(store.versions))
    ElMessage.success('版本删除成功')
}

export function loadVersionsFromStorage(): void {
    const store = useStore()
    const data = localStorage.getItem('pageVersions')
    if (data) {
        try {
            const parsed = JSON.parse(data)
            const result = validatePageVersions(parsed)
            if (result.success && result.data) {
                store.versions = result.data as unknown as PageVersion[]
            } else {
                console.warn('版本数据校验失败，已重置:', result.errors)
                store.versions = []
            }
        } catch {
            store.versions = []
        }
    }
}
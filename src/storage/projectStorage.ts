import type { CanvasStyleData, ComponentData } from '@/types'
import { deepCopy } from '@/utils/utils'

export const PROJECT_DOCUMENT_VERSION = '2.0.0'

const DB_NAME = 'lowcode-platform'
const DB_VERSION = 1
const STORE_NAME = 'projects'
const CURRENT_PROJECT_ID = 'current'
const FALLBACK_STORAGE_KEY = 'lowcodeProject'

export interface ProjectDocument {
    id: string
    version: string
    updatedAt: number
    canvasStyle: CanvasStyleData
    componentData: ComponentData[]
}

export interface ProjectSnapshot {
    canvasStyle: CanvasStyleData
    componentData: ComponentData[]
}

function createDocument(snapshot: ProjectSnapshot): ProjectDocument {
    return {
        id: CURRENT_PROJECT_ID,
        version: PROJECT_DOCUMENT_VERSION,
        updatedAt: Date.now(),
        canvasStyle: deepCopy(snapshot.canvasStyle),
        componentData: deepCopy(snapshot.componentData),
    }
}

function hasIndexedDB(): boolean {
    return typeof indexedDB !== 'undefined'
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error || new Error('IndexedDB 请求失败'))
    })
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error || new Error('IndexedDB 事务失败'))
        transaction.onabort = () => reject(transaction.error || new Error('IndexedDB 事务已取消'))
    })
}

async function openDatabase(): Promise<IDBDatabase> {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
    }
    return requestToPromise(request)
}

function readFallbackDocument(): ProjectDocument | null {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw) as ProjectDocument
    } catch {
        return null
    }
}

function readLegacyDocument(): ProjectDocument | null {
    if (typeof localStorage === 'undefined') return null
    const componentData = localStorage.getItem('canvasData')
    const canvasStyle = localStorage.getItem('canvasStyle')
    if (!componentData || !canvasStyle) return null

    try {
        return createDocument({
            componentData: JSON.parse(componentData) as ComponentData[],
            canvasStyle: JSON.parse(canvasStyle) as CanvasStyleData,
        })
    } catch {
        return null
    }
}

function writeFallbackDocument(document: ProjectDocument): void {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(document))
}

export async function saveProjectDocument(snapshot: ProjectSnapshot): Promise<ProjectDocument> {
    const document = createDocument(snapshot)
    if (!hasIndexedDB()) {
        writeFallbackDocument(document)
        return document
    }

    try {
        const database = await openDatabase()
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        transaction.objectStore(STORE_NAME).put(document)
        await transactionToPromise(transaction)
        database.close()
        return document
    } catch (error) {
        console.warn('IndexedDB 保存失败，已降级到 localStorage:', error)
        writeFallbackDocument(document)
        return document
    }
}

export async function loadProjectDocument(): Promise<ProjectDocument | null> {
    let document: ProjectDocument | null = null

    if (hasIndexedDB()) {
        try {
            const database = await openDatabase()
            const transaction = database.transaction(STORE_NAME, 'readonly')
            document = await requestToPromise<ProjectDocument | undefined>(
                transaction.objectStore(STORE_NAME).get(CURRENT_PROJECT_ID),
            ) || null
            database.close()
        } catch (error) {
            console.warn('IndexedDB 读取失败，尝试本地回退:', error)
        }
    }

    document ||= readFallbackDocument()
    if (document) return document

    const legacyDocument = readLegacyDocument()
    if (!legacyDocument) return null
    await saveProjectDocument(legacyDocument)
    return legacyDocument
}

export async function clearProjectDocument(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(FALLBACK_STORAGE_KEY)
        localStorage.removeItem('canvasData')
        localStorage.removeItem('canvasStyle')
    }
    if (!hasIndexedDB()) return

    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(CURRENT_PROJECT_ID)
    await transactionToPromise(transaction)
    database.close()
}

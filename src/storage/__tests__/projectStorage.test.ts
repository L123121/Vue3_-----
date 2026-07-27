import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
    clearProjectDocument,
    loadProjectDocument,
    PROJECT_DOCUMENT_VERSION,
    saveProjectDocument,
} from '@/storage/projectStorage'
import type { CanvasStyleData, ComponentData } from '@/types'

const canvasStyle: CanvasStyleData = {
    width: 375,
    height: 667,
    scale: 100,
    color: '#000',
    opacity: 1,
    backgroundColor: '#fff',
    fontSize: 14,
}

const component: ComponentData = {
    id: 'title',
    component: 'VText',
    label: '标题',
    icon: '',
    propValue: '测试标题',
    style: { width: 200, height: 40, top: 20, left: 20 },
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

beforeEach(async () => {
    localStorage.clear()
    await clearProjectDocument()
})

describe('projectStorage', () => {
    it('保存并读取版本化项目文档', async () => {
        await saveProjectDocument({ canvasStyle, componentData: [component] })
        const project = await loadProjectDocument()

        expect(project?.version).toBe(PROJECT_DOCUMENT_VERSION)
        expect(project?.componentData[0].id).toBe('title')
        expect(project?.canvasStyle.width).toBe(375)
    })

    it('迁移旧 localStorage 画布数据', async () => {
        localStorage.setItem('canvasData', JSON.stringify([component]))
        localStorage.setItem('canvasStyle', JSON.stringify(canvasStyle))

        const project = await loadProjectDocument()

        expect(project?.componentData).toHaveLength(1)
        expect(project?.version).toBe(PROJECT_DOCUMENT_VERSION)
    })
})

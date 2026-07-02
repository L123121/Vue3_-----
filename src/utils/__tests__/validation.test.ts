import { describe, it, expect } from 'vitest'
import {
    validateComponentData,
    validateSingleComponent,
    validateCanvasStyle,
    validateExportData,
    validatePageVersions,
    validateAuto,
} from '@/utils/validation'

/** 一个最小且合法的组件对象 */
function validComponent(overrides: Record<string, unknown> = {}) {
    return {
        id: 'c1',
        component: 'VText',
        propValue: 'hello',
        style: { width: 100, height: 50 },
        ...overrides,
    }
}

describe('Zod schema - 组件数据校验', () => {
    it('合法组件通过校验，缺失字段由默认值补齐', () => {
        const result = validateSingleComponent(validComponent())
        expect(result.success).toBe(true)
        expect(result.data?.label).toBe('') // default ''
        expect(result.data?.parentId).toBe(null) // default null
        expect(result.data?.slot).toBe('default') // default 'default'
        expect(result.data?.zIndex).toBe(0)
        expect(result.data?.animations).toEqual([])
    })

    it('缺少必填字段 id 时校验失败', () => {
        const { id: _id, ...withoutId } = validComponent()
        const result = validateSingleComponent(withoutId)
        expect(result.success).toBe(false)
        expect(result.errors?.some(e => e.includes('id'))).toBe(true)
    })

    it('style 缺少必填 width 时失败', () => {
        const result = validateSingleComponent(
            validComponent({ style: { height: 50 } }),
        )
        expect(result.success).toBe(false)
        expect(result.errors?.some(e => e.includes('width'))).toBe(true)
    })

    it('opacity 超出 0-1 范围时失败', () => {
        const result = validateSingleComponent(
            validComponent({ style: { width: 100, height: 50, opacity: 1.5 } }),
        )
        expect(result.success).toBe(false)
    })

    it('数组形式校验多个组件', () => {
        const result = validateComponentData([validComponent({ id: 'a' }), validComponent({ id: 'b' })])
        expect(result.success).toBe(true)
        expect(result.data?.length).toBe(2)
    })

    it('非法输入（非对象）返回失败', () => {
        const result = validateComponentData('not-an-array')
        expect(result.success).toBe(false)
    })
})

describe('Zod schema - 画布样式校验', () => {
    it('合法画布样式补齐默认值', () => {
        const result = validateCanvasStyle({ width: 1200, height: 740 })
        expect(result.success).toBe(true)
        expect(result.data?.scale).toBe(100)
        expect(result.data?.backgroundColor).toBe('#fff')
    })

    it('CanvasStyleSchema 所有字段均有默认值，空对象也能通过', () => {
        // 注意：width/height 等都有 .default()，因此空对象会补齐默认值而非失败
        const result = validateCanvasStyle({})
        expect(result.success).toBe(true)
        expect(result.data?.width).toBe(1200)
        expect(result.data?.height).toBe(740)
    })

    it('非对象输入（数字）校验失败', () => {
        const result = validateCanvasStyle(42)
        expect(result.success).toBe(false)
    })
})

describe('Zod schema - 导出数据校验', () => {
    it('合法导出数据通过', () => {
        const result = validateExportData({
            canvasStyle: { width: 1200, height: 740 },
            componentData: [validComponent()],
        })
        expect(result.success).toBe(true)
        expect(result.data?.componentData.length).toBe(1)
    })

    it('缺 componentData 字段时失败', () => {
        const result = validateExportData({ canvasStyle: { width: 1200, height: 740 } })
        expect(result.success).toBe(false)
    })
})

describe('Zod schema - 版本快照校验', () => {
    it('合法版本数组通过', () => {
        const result = validatePageVersions([
            {
                id: 'v1',
                name: '版本1',
                snapshot: [validComponent()],
                createdAt: '2026-07-02T00:00:00.000Z',
            },
        ])
        expect(result.success).toBe(true)
        expect(result.data?.[0].name).toBe('版本1')
    })

    it('非数组的版本数据失败', () => {
        const result = validatePageVersions({ not: 'an array' })
        expect(result.success).toBe(false)
    })
})

describe('validateAuto - 智能格式识别', () => {
    it('数组输入按旧格式（组件数组）识别', () => {
        const result = validateAuto([validComponent()])
        expect(result.success).toBe(true)
        expect(result.data?.componentData.length).toBe(1)
        expect(result.data?.canvasStyle).toBeUndefined()
    })

    it('含 componentData 的对象按导出格式识别', () => {
        const result = validateAuto({
            canvasStyle: { width: 1200, height: 740 },
            componentData: [validComponent()],
        })
        expect(result.success).toBe(true)
        expect(result.data?.canvasStyle).toBeDefined()
        expect(result.data?.componentData.length).toBe(1)
    })

    it('无法识别的格式返回失败', () => {
        const result = validateAuto(42)
        expect(result.success).toBe(false)
        expect(result.errors?.[0]).toContain('无法识别')
    })
})

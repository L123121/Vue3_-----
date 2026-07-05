/**
 * Zod Schema 直接测试（非 validation wrapper）
 *
 * 直接测试 schema.parse / schema.safeParse 的逻辑，
 * 验证校验规则、默认值、递归类型等。
 */
import { describe, it, expect } from 'vitest'
import {
    ComponentStyleSchema,
    ComponentDataSchema,
    CanvasStyleSchema,
    ExportDataSchema,
    AnimationSchema,
    PicturePropValueSchema,
    TablePropValueSchema,
    ChartPropValueSchema,
    RequestConfigSchema,
    LinkageConfigSchema,
} from '@/schemas'

function validComponent(overrides: Record<string, unknown> = {}) {
    return {
        id: 'c1',
        component: 'VText',
        propValue: 'hello',
        style: { width: 100, height: 50 },
        ...overrides,
    }
}

describe('ComponentStyleSchema', () => {
    it('最小合法样式通过', () => {
        const result = ComponentStyleSchema.safeParse({ width: 100, height: 50 })
        expect(result.success).toBe(true)
    })

    it('缺少必填 width 失败', () => {
        const result = ComponentStyleSchema.safeParse({ height: 50 })
        expect(result.success).toBe(false)
    })

    it('opacity 超出 0-1 范围失败', () => {
        const result = ComponentStyleSchema.safeParse({ width: 100, height: 50, opacity: 1.5 })
        expect(result.success).toBe(false)
    })

    it('textAlign 只接受枚举值', () => {
        const good = ComponentStyleSchema.safeParse({ width: 100, height: 50, textAlign: 'center' })
        expect(good.success).toBe(true)
        const bad = ComponentStyleSchema.safeParse({ width: 100, height: 50, textAlign: 'justify' })
        expect(bad.success).toBe(false)
    })
})

describe('AnimationSchema', () => {
    it('合法动画通过并有默认值', () => {
        const result = AnimationSchema.parse({ type: 'fadeIn', applyTo: 'enter' })
        expect(result.duration).toBe(1000)
        expect(result.delay).toBe(0)
        expect(result.iterationNum).toBe(1)
        expect(result.infinite).toBe(false)
        expect(result.applyTo).toBe('enter')
    })

    it('缺少必填 type 失败', () => {
        const result = AnimationSchema.safeParse({})
        expect(result.success).toBe(false)
    })
})

describe('RequestConfigSchema', () => {
    it('最小配置通过', () => {
        const result = RequestConfigSchema.parse({ method: 'GET' })
        expect(result.url).toBe('')
        expect(result.series).toBe(false)
        expect(result.time).toBe(1000)
    })

    it('无效 method 失败', () => {
        const result = RequestConfigSchema.safeParse({ method: 'PATCH' })
        expect(result.success).toBe(false)
    })
})

describe('PicturePropValueSchema', () => {
    it('合法图片属性通过', () => {
        const result = PicturePropValueSchema.parse({ url: 'https://example.com/img.png' })
        expect(result.flip.horizontal).toBe(false)
        expect(result.flip.vertical).toBe(false)
    })

    it('缺少 url 失败', () => {
        const result = PicturePropValueSchema.safeParse({ flip: {} })
        expect(result.success).toBe(false)
    })
})

describe('TablePropValueSchema', () => {
    it('空表格通过', () => {
        const result = TablePropValueSchema.parse({})
        expect(result.data).toEqual([])
        expect(result.stripe).toBe(false)
    })
})

describe('ChartPropValueSchema', () => {
    it('合法图表通过', () => {
        const result = ChartPropValueSchema.parse({ chart: 'line', option: { xAxis: {} } })
        expect(result.chart).toBe('line')
    })

    it('缺少 chart 失败', () => {
        const result = ChartPropValueSchema.safeParse({ option: {} })
        expect(result.success).toBe(false)
    })
})

describe('LinkageConfigSchema', () => {
    it('空联动配置通过', () => {
        const result = LinkageConfigSchema.parse({})
        expect(result.data).toEqual([])
        expect(result.duration).toBe(0)
    })
})

describe('ComponentDataSchema - 递归组件', () => {
    it('简单组件通过', () => {
        const result = ComponentDataSchema.safeParse(validComponent())
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.label).toBe('')
            expect(result.data.parentId).toBeNull()
            expect(result.data.slot).toBe('default')
        }
    })

    it('Group 包含子组件通过', () => {
        const group = {
            id: 'g1',
            component: 'Group',
            propValue: [validComponent({ id: 'c1' }), validComponent({ id: 'c2' })],
            style: { width: 400, height: 300 },
        }
        const result = ComponentDataSchema.safeParse(group)
        expect(result.success).toBe(true)
    })

    it('多层嵌套组件通过', () => {
        const deep = {
            id: 'g1',
            component: 'Group',
            propValue: [
                {
                    id: 'g2',
                    component: 'Group',
                    propValue: [validComponent({ id: 'c1' })],
                    style: { width: 200, height: 200 },
                },
            ],
            style: { width: 400, height: 400 },
        }
        const result = ComponentDataSchema.safeParse(deep)
        expect(result.success).toBe(true)
    })

    it('id 为空字符串时通过（格式上允许，业务层自行约束）', () => {
        const result = ComponentDataSchema.safeParse(validComponent({ id: '' }))
        expect(result.success).toBe(true)
    })

    it('非对象输入失败', () => {
        expect(ComponentDataSchema.safeParse('string').success).toBe(false)
        expect(ComponentDataSchema.safeParse(42).success).toBe(false)
        expect(ComponentDataSchema.safeParse(null).success).toBe(false)
    })
})

describe('CanvasStyleSchema', () => {
    it('空对象补齐所有默认值', () => {
        const result = CanvasStyleSchema.parse({})
        expect(result.width).toBe(1200)
        expect(result.height).toBe(740)
        expect(result.scale).toBe(100)
        expect(result.backgroundColor).toBe('#fff')
    })

    it('部分覆盖默认值', () => {
        const result = CanvasStyleSchema.parse({ width: 800, backgroundColor: '#f00' })
        expect(result.width).toBe(800)
        expect(result.height).toBe(740) // 默认
        expect(result.backgroundColor).toBe('#f00')
    })
})

describe('ExportDataSchema', () => {
    it('完整导出数据通过', () => {
        const result = ExportDataSchema.safeParse({
            canvasStyle: { width: 1200, height: 740 },
            componentData: [validComponent()],
        })
        expect(result.success).toBe(true)
    })

    it('缺少 componentData 失败', () => {
        const result = ExportDataSchema.safeParse({ canvasStyle: {} })
        expect(result.success).toBe(false)
    })

    it('缺失字段由默认值补齐', () => {
        const result = ExportDataSchema.parse({
            canvasStyle: { width: 1200, height: 740 },
            componentData: [validComponent()],
        })
        expect(result.version).toBe('1.0.0')
    })
})

describe('propValue 联合类型', () => {
    it('字符串 propValue 通过', () => {
        const result = ComponentDataSchema.safeParse(validComponent({ propValue: 'Hello' }))
        expect(result.success).toBe(true)
    })

    it('PicturePropValue propValue 通过', () => {
        const result = ComponentDataSchema.safeParse(validComponent({
            component: 'Picture',
            propValue: { url: 'https://example.com/img.png', flip: { horizontal: false, vertical: false } },
        }))
        expect(result.success).toBe(true)
    })

    it('TablePropValue propValue 通过', () => {
        const result = ComponentDataSchema.safeParse(validComponent({
            component: 'VTable',
            propValue: { data: [['a', 'b']], stripe: true, thBold: true },
        }))
        expect(result.success).toBe(true)
    })

    it('ChartPropValue propValue 通过', () => {
        const result = ComponentDataSchema.safeParse(validComponent({
            component: 'VChart',
            propValue: { chart: 'bar', option: { series: [] } },
        }))
        expect(result.success).toBe(true)
    })
})
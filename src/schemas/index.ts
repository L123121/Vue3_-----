/**
 * Zod Schema 定义
 * 用于运行时数据校验，确保外部 JSON 数据符合预期格式
 */

import { z } from 'zod'
import type { ComponentData } from '@/types'

// ==================== 组件样式 Schema ====================
export const ComponentStyleSchema = z.object({
    width: z.number(),
    height: z.number(),
    top: z.number().optional(),
    left: z.number().optional(),
    rotate: z.number().optional(),
    opacity: z.number().min(0).max(1).optional(),
    fontSize: z.number().optional(),
    fontWeight: z.number().optional(),
    lineHeight: z.string().optional(),
    letterSpacing: z.number().optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.number().optional(),
    borderStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
    borderRadius: z.string().optional(),
    padding: z.number().optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
})

// ==================== 请求配置 Schema ====================
export const RequestConfigSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    data: z.array(z.record(z.string(), z.unknown())).default(() => []),
    url: z.string().default(''),
    series: z.boolean().default(false),
    time: z.number().default(1000),
    paramType: z.enum(['', 'string', 'object', 'array']).default(''),
    requestCount: z.number().default(0),
})

// ==================== 动画配置 Schema ====================
export const AnimationSchema = z.object({
    type: z.string(),
    duration: z.number().default(1000),
    delay: z.number().default(0),
    iterationNum: z.number().default(1),
    infinite: z.boolean().default(false),
    applyTo: z.enum(['enter', 'leave']),
})

// ==================== 组件联动 Schema ====================
export const LinkageItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    event: z.string(),
    style: z.array(z.object({ key: z.string(), value: z.string() })),
})

export const LinkageConfigSchema = z.object({
    duration: z.number().default(0),
    data: z.array(LinkageItemSchema).default([]),
})

// ==================== 图片属性 Schema ====================
export const PicturePropValueSchema = z.object({
    url: z.string(),
    flip: z
        .object({
            horizontal: z.boolean().default(false),
            vertical: z.boolean().default(false),
        })
        .default({ horizontal: false, vertical: false }),
})

// ==================== 表格属性 Schema ====================
export const TablePropValueSchema = z.object({
    data: z.array(z.array(z.string())).default([]),
    stripe: z.boolean().default(false),
    thBold: z.boolean().default(false),
})

// ==================== 图表属性 Schema ====================
export const ChartPropValueSchema = z.object({
    chart: z.string(),
    option: z.record(z.string(), z.unknown()).default(() => ({})),
})

// ==================== 组件数据 Schema（递归定义）====================
export const ComponentDataSchema: z.ZodType<ComponentData> = z.lazy(() =>
    z.object({
        id: z.string(),
        component: z.string(),
        label: z.string().default(''),
        icon: z.string().default(''),
        propValue: z
            .union([
                z.string(),
                PicturePropValueSchema,
                TablePropValueSchema,
                ChartPropValueSchema,
                z.array(ComponentDataSchema),
            ])
            .default(''),
        style: ComponentStyleSchema,
        parentId: z.string().nullable().default(null),
        slot: z.string().default('default'),
        zIndex: z.number().default(0),
        request: RequestConfigSchema.optional(),
        animations: z.array(AnimationSchema).default(() => []),
        events: z.record(z.string(), z.string()).default(() => ({})),
        groupStyle: z.record(z.string(), z.unknown()).default(() => ({})),
        isLock: z.boolean().default(false),
        collapseName: z.string().default('style'),
        linkage: LinkageConfigSchema.default(() => ({ duration: 0, data: [] })),
    }),
)

// ==================== 画布样式 Schema ====================
export const CanvasStyleSchema = z.object({
    width: z.number().default(1200),
    height: z.number().default(740),
    scale: z.number().default(100),
    color: z.string().default('#000'),
    opacity: z.number().default(1),
    backgroundColor: z.string().default('#fff'),
    fontSize: z.number().default(14),
})

// ==================== 导出数据 Schema ====================
export const ExportDataSchema = z.object({
    version: z.string().default('1.0.0'),
    timestamp: z.number().optional(),
    canvasStyle: CanvasStyleSchema,
    componentData: z.array(ComponentDataSchema),
})

// ==================== 版本快照 Schema ====================
export const PageVersionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(''),
    snapshot: z.array(ComponentDataSchema),
    createdAt: z.string(),
    thumbnail: z.string().optional(),
})

// ==================== 类型导出（从 Zod Schema 推导）====================
/** 从 Schema 推导的组件样式类型 */
export type ValidatedComponentStyle = z.infer<typeof ComponentStyleSchema>
/** 从 Schema 推导的组件数据类型（递归） */
export type ValidatedComponentData = z.infer<typeof ComponentDataSchema>
/** 从 Schema 推导的画布样式类型 */
export type ValidatedCanvasStyle = z.infer<typeof CanvasStyleSchema>
/** 从 Schema 推导的导出数据类型 */
export type ValidatedExportData = z.infer<typeof ExportDataSchema>
/** 从 Schema 推导的版本快照类型 */
export type ValidatedPageVersion = z.infer<typeof PageVersionSchema>

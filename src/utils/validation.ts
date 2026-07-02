/**
 * 数据校验工具函数
 * 使用 Zod 进行运行时数据校验
 */

import { z } from 'zod'
import {
    ComponentDataSchema,
    CanvasStyleSchema,
    ExportDataSchema,
    PageVersionSchema,
} from '@/schemas'
import type { ComponentData, CanvasStyleData } from '@/types'

/**
 * 校验结果类型
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
}

/**
 * 格式化 Zod 错误信息
 */
function formatZodErrors(error: z.ZodError): string[] {
    return error.issues.map(issue => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
        return `${path}: ${issue.message}`
    })
}

/**
 * 校验组件数据数组
 */
export function validateComponentData(data: unknown): ValidationResult<ComponentData[]> {
    try {
        const result = z.array(ComponentDataSchema).safeParse(data)
        if (result.success) {
            return { success: true, data: result.data as ComponentData[] }
        }
        return {
            success: false,
            errors: formatZodErrors(result.error),
        }
    } catch (e) {
        return { success: false, errors: ['数据解析失败'] }
    }
}

/**
 * 校验单个组件数据
 */
export function validateSingleComponent(data: unknown): ValidationResult<ComponentData> {
    const result = ComponentDataSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data as ComponentData }
    }
    return {
        success: false,
        errors: formatZodErrors(result.error),
    }
}

/**
 * 校验画布样式
 */
export function validateCanvasStyle(data: unknown): ValidationResult<CanvasStyleData> {
    const result = CanvasStyleSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data as CanvasStyleData }
    }
    return {
        success: false,
        errors: formatZodErrors(result.error),
    }
}

/**
 * 校验导出数据格式
 */
export interface ExportData {
  version: string
  timestamp?: number
  canvasStyle: CanvasStyleData
  componentData: ComponentData[]
}

export function validateExportData(data: unknown): ValidationResult<ExportData> {
    const result = ExportDataSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data as ExportData }
    }
    return {
        success: false,
        errors: formatZodErrors(result.error),
    }
}

/**
 * 校验版本快照
 */
export interface PageVersionData {
  id: string
  name: string
  description?: string
  snapshot: ComponentData[]
  createdAt: string
  thumbnail?: string
}

export function validatePageVersion(data: unknown): ValidationResult<PageVersionData> {
    const result = PageVersionSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data as PageVersionData }
    }
    return {
        success: false,
        errors: formatZodErrors(result.error),
    }
}

/**
 * 校验版本快照数组
 */
export function validatePageVersions(data: unknown): ValidationResult<PageVersionData[]> {
    try {
        const result = z.array(PageVersionSchema).safeParse(data)
        if (result.success) {
            return { success: true, data: result.data as PageVersionData[] }
        }
        return {
            success: false,
            errors: formatZodErrors(result.error),
        }
    } catch (e) {
        return { success: false, errors: ['版本数据解析失败'] }
    }
}

/**
 * 智能校验：自动识别数据格式
 * 支持：组件数组、导出数据格式
 */
export function validateAuto(data: unknown): ValidationResult<{
  componentData: ComponentData[]
  canvasStyle?: CanvasStyleData
}> {
    // 尝试识别数据格式
    if (Array.isArray(data)) {
    // 旧格式：直接是组件数组
        const result = validateComponentData(data)
        if (result.success) {
            return { success: true, data: { componentData: result.data! } }
        }
        return { success: false, errors: result.errors }
    }

    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>

        // 新格式：包含 canvasStyle 和 componentData
        if ('componentData' in obj) {
            const result = validateExportData(data)
            if (result.success) {
                return {
                    success: true,
                    data: {
                        componentData: result.data!.componentData,
                        canvasStyle: result.data!.canvasStyle,
                    },
                }
            }
            return { success: false, errors: result.errors }
        }
    }

    return { success: false, errors: ['无法识别的数据格式'] }
}

/**
 * 结构化工具错误
 *
 * 相比自由文本 Error，ToolError 携带 code + hint，
 * 便于 LLM 按错误类型自动修复，也便于前端按 code 展示。
 */

export class ToolError extends Error {
    /**
     * @param {string} code — 稳定错误码（如 COMPONENT_NOT_FOUND）
     * @param {string} message — 人类可读的错误描述
     * @param {string} [hint] — 给 LLM 的修复提示
     */
    constructor(code, message, hint = '') {
        super(message)
        this.name = 'ToolError'
        this.code = code
        this.hint = hint
    }
}

/**
 * 常用错误码常量
 */
export const ToolErrorCode = {
    UNKNOWN_TOOL: 'UNKNOWN_TOOL',
    MISSING_ARG: 'MISSING_ARG',
    INVALID_ARG: 'INVALID_ARG',
    COMPONENT_NOT_FOUND: 'COMPONENT_NOT_FOUND',
    UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
    LIMIT_REACHED: 'LIMIT_REACHED',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
}

/**
 * 从任意异常中提取结构化信息（非 ToolError 的异常降级为 INTERNAL）
 * @param {unknown} error
 * @returns {{code:string,message:string,hint:string}}
 */
export function normalizeToolError(error) {
    if (error instanceof ToolError) {
        return { code: error.code, message: error.message, hint: error.hint }
    }
    if (error instanceof Error) {
        return {
            code: 'INTERNAL',
            message: error.message,
            hint: '请重试该操作，或换一种参数组合',
        }
    }
    return { code: 'INTERNAL', message: String(error), hint: '请重试该操作' }
}

import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { RequestConfig } from '@/types'

/**
 * URL 正则表达式
 */
export const urlRE = /(https?):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/

/**
 * 请求选项接口
 */
interface RequestOptions extends RequestConfig {
    url: string
}

/**
 * 发送 HTTP 请求（axios 实现，替代原 XHR 封装）
 * 非 2xx 状态会 reject，JSON 响应由 axios 自动解析。
 */
function request(options: RequestOptions): Promise<unknown> {
    const method = (options.method || 'GET').toUpperCase()
    const isGet = method === 'GET'
    const data = getURLData(options.data, options.paramType)

    return axios
        .request({
            url: getURL(options.url),
            method,
            timeout: 6000,
            params: isGet ? data : undefined,
            data: isGet ? undefined : data,
        })
        .then(response => response.data)
}

/**
 * 获取完整 URL：
 * - http(s) 原样返回
 * - 协议相对地址(//host/path)补全为 https:
 * - 站内相对路径(/path)原样返回
 * - 其余裸域名/主机名补全为 https://
 */
export function getURL(url: string): string {
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('//')) return 'https:' + url
    if (url.startsWith('/')) return url
    return 'https://' + url
}

/**
 * 校验请求地址是否合法（允许站内相对路径与纯数字端口场景外的主机名）。
 * 纯数字字符串（如 "8080"）被视为无效地址。
 */
export function isValidRequestUrl(url: string): boolean {
    if (!url || /^\d+$/.test(url)) return false
    if (url.startsWith('/')) return true
    return urlRE.test(getURL(url))
}

/**
 * 获取请求体数据
 * @param data 参数数组（每个元素为单键对象，或 paramType=array 时为值数组）
 * @param paramType 参数类型
 * @returns 合并后的参数对象/数组/空串
 */
function getURLData(
    data: Record<string, unknown>[],
    paramType?: string,
): Record<string, unknown>[] | Record<string, unknown> | string {
    if (!data) return ''

    if (paramType === 'array') {
        return data
    }

    const result: Record<string, unknown> = {}
    data.forEach(item => {
        const [key, value] = Object.entries(item)[0] || []
        if (key) {
            result[key] = value
        }
    })

    return result
}

/**
 * 安全解析 JSON，解析失败时原样返回文本
 */
function parseJSON(raw: string): unknown {
    try {
        return JSON.parse(raw)
    } catch {
        return raw
    }
}

/**
 * 请求包装器
 * @param options 请求参数
 * @param obj 需要修改的数据的父对象
 * @param key 需要修改的数据在父对象中对应的 key
 * @param responseType 响应数据类型
 * @returns 取消请求的函数
 */
export default function requestWrapper(
    options: RequestOptions,
    obj: Record<string, unknown>,
    key: string,
    responseType: 'object' | 'array' | 'string' = 'object',
): () => void {
    let count = 0
    let timer: ReturnType<typeof setInterval> | undefined

    const url = options?.url

    // 空地址 / 纯数字地址不发起请求（与历史行为一致）
    if (!url || /^\d+$/.test(url)) {
        return function cancelRequest() {}
    }

    const apply = (data: unknown): void => {
        if (responseType === 'object' || responseType === 'array') {
            // axios 已自动解析 JSON，仅对文本响应做兜底解析
            obj[key] = typeof data === 'string' ? parseJSON(data) : data
        } else {
            obj[key] = data
        }
    }

    const fail = (err: unknown): void => {
        ElMessage.error(err instanceof Error ? err.message : String(err))
    }

    const run = (): void => {
        request(options)
            .then(apply)
            .catch(fail)
    }

    if (!options.series) {
        run()
    } else {
        timer = setInterval(() => {
            if (options.requestCount !== 0 && options.requestCount <= count) {
                clearInterval(timer)
                return
            }

            count++
            run()
        }, options.time || 1000)
    }

    return function cancelRequest() {
        if (timer) {
            clearInterval(timer)
        }
    }
}

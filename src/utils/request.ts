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
 * 发送 HTTP 请求
 * @param options 请求选项
 * @returns Promise 响应数据
 */
function request(options: RequestOptions): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.timeout = 6000

        let url = getURL(options.url)
        if (options.method === 'GET') {
            url += getURLParam(options.data)
        }

        xhr.open(options.method, url)

        xhr.ontimeout = () => reject(new Error('请求超时'))
        xhr.onerror = () => reject(new Error('请求失败'))
        xhr.onload = e => {
            const target = e.target as XMLHttpRequest
            resolve(target.response)
        }

        xhr.send(JSON.stringify(getURLData(options.data, options.paramType)))
    })
}

/**
 * 获取 URL 查询参数字符串
 * @param data 参数数据
 * @returns 查询字符串
 */
function getURLParam(data: Record<string, unknown>[]): string {
    let result = ''
    data.forEach(item => {
        const [key, value] = Object.entries(item)[0] || []
        if (key) {
            result += `&${key}=${value}`
        }
    })

    return result ? '?' + result : ''
}

/**
 * 获取请求体数据
 * @param data 参数数据
 * @param paramType 参数类型
 * @returns 格式化后的数据
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
 * 获取完整 URL
 * @param url 原始 URL
 * @returns 完整 URL
 */
export function getURL(url: string): string {
    return url.startsWith('http') ? url : 'https://' + url
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

    if ((url && !/^\d+$/.test(url)) || urlRE.test(getURL(url))) {
        if (!options.series) {
            request(options)
                .then(data => {
                    if (responseType === 'object' || responseType === 'array') {
                        obj[key] = JSON.parse(data as string)
                    } else {
                        obj[key] = data
                    }
                })
                .catch(err => ElMessage.error(err?.message || String(err)))
        } else {
            timer = setInterval(() => {
                if (options.requestCount !== 0 && options.requestCount <= count) {
                    clearInterval(timer)
                    return
                }

                count++
                request(options)
                    .then(data => {
                        if (responseType === 'object' || responseType === 'array') {
                            obj[key] = JSON.parse(data as string)
                        } else {
                            obj[key] = data
                        }
                    })
                    .catch(err => ElMessage.error(err?.message || String(err)))
            }, options.time)
        }
    }

    return function cancelRequest() {
        if (timer) {
            clearInterval(timer)
        }
    }
}

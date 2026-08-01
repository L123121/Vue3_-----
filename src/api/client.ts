import axios, { type AxiosInstance } from 'axios'

export function normalizeApiBaseUrl(value: string | undefined): string {
    return String(value || '').trim().replace(/\/+$/, '')
}

export const API_BASE_URL = normalizeApiBaseUrl(
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE,
)

const API_ACCESS_KEY = String(import.meta.env.VITE_API_ACCESS_KEY || '').trim()

export function buildApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${API_BASE_URL}${normalizedPath}`
}

export function buildApiHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
        ...headers,
        ...(API_ACCESS_KEY ? { 'X-API-Key': API_ACCESS_KEY } : {}),
    }
}

export function createApiClient(timeout: number): AxiosInstance {
    const client = axios.create({
        baseURL: API_BASE_URL,
        timeout,
        headers: buildApiHeaders({ 'Content-Type': 'application/json' }),
    })

    // 统一错误处理：优先透出服务端 error 字段，兜底为通用提示
    client.interceptors.response.use(
        (response) => response,
        (error) => {
            const message = error.response?.data?.error || error.message || '请求失败'
            error.message = message
            return Promise.reject(error)
        },
    )
    return client
}

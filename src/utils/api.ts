/**
 * API 请求封装
 *
 * 基于 axios,自动携带 JWT token,统一错误处理。
 * 后端地址可配置:默认 localhost:3000
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器:自动携带 token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// 响应拦截器:统一错误处理
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const msg = error.response?.data?.error || '请求失败'
        if (error.response?.status === 401) {
            // token 过期或无效,清除登录状态
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            // 已在登录页时不跳转
            if (!window.location.pathname.includes('/login')) {
                ElMessage.error('登录已过期，请重新登录')
                window.location.href = '/#/login'
            }
        }
        return Promise.reject(new Error(msg))
    },
)

// ==================== 认证 API ====================

export const authApi = {
    register(data: { username: string; email: string; password: string }) {
        return api.post('/api/auth/register', data) as Promise<{ token: string; user: any }>
    },
    login(data: { username: string; password: string }) {
        return api.post('/api/auth/login', data) as Promise<{ token: string; user: any }>
    },
}

// ==================== 页面 API ====================

export const pagesApi = {
    list() {
        return api.get('/api/pages') as Promise<{ pages: any[] }>
    },
    get(id: string) {
        return api.get(`/api/pages/${id}`) as Promise<{ page: any }>
    },
    create(data: { title?: string; description?: string; componentData?: any[]; canvasStyle?: any }) {
        return api.post('/api/pages', data) as Promise<{ page: any }>
    },
    update(id: string, data: { title?: string; description?: string; componentData?: any[]; canvasStyle?: any }) {
        return api.put(`/api/pages/${id}`, data) as Promise<{ page: any }>
    },
    delete(id: string) {
        return api.delete(`/api/pages/${id}`) as Promise<{ message: string }>
    },
    share(id: string) {
        return api.post(`/api/pages/${id}/share`) as Promise<{ shareToken: string; shareUrl: string }>
    },
    unshare(id: string) {
        return api.delete(`/api/pages/${id}/share`) as Promise<{ message: string }>
    },
}

export default api
/**
 * 用户认证状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type UserInfo } from '@/utils/api'

function parseStoredUser(): UserInfo | null {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null') as UserInfo | null
    } catch {
        return null
    }
}

export const useAuthStore = defineStore('auth', () => {
    // 从 localStorage 恢复
    const token = ref(localStorage.getItem('token') || '')
    const user = ref<UserInfo | null>(parseStoredUser())

    const isLoggedIn = computed(() => !!token.value)
    const username = computed(() => user.value?.username || '')
    const userId = computed(() => user.value?._id || '')

    function saveAuth(t: string, u: UserInfo) {
        token.value = t
        user.value = u
        localStorage.setItem('token', t)
        localStorage.setItem('user', JSON.stringify(u))
    }

    function clearAuth() {
        token.value = ''
        user.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    async function register(data: { username: string; email: string; password: string }) {
        const res = await authApi.register(data)
        saveAuth(res.token, res.user)
        return res
    }

    async function login(data: { username: string; password: string }) {
        const res = await authApi.login(data)
        saveAuth(res.token, res.user)
        return res
    }

    function logout() {
        clearAuth()
    }

    return { token, user, isLoggedIn, username, userId, register, login, logout, clearAuth }
})
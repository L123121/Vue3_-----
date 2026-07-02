import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
    },
    {
        path: '/preview',
        name: 'Preview',
        component: () => import('@/views/PreviewPage.vue'),
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { guest: true },
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@/views/Register.vue'),
        meta: { guest: true },
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/editor/:id',
        name: 'Editor',
        component: () => import('@/views/Home.vue'),
        meta: { requiresAuth: true },
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// 路由守卫：检查登录状态
router.beforeEach((to, _from, next) => {
    const token = localStorage.getItem('token')

    if (to.meta.requiresAuth && !token) {
        // 需要登录但未登录 → 跳转登录页
        next({ path: '/login', query: { redirect: to.fullPath } })
    } else if (to.meta.guest && token) {
        // 已登录用户访问登录/注册页 → 跳转仪表盘
        next({ path: '/dashboard' })
    } else {
        next()
    }
})

export default router

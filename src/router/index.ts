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
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
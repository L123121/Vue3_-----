import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import installCustomComponents from '@/custom-component'

import '@/styles/animate.scss'
import '@/styles/reset.css'
import '@/styles/global.scss'
import '@/styles/dark.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(ElementPlus, { size: 'small' })
app.use(router)
app.use(pinia)
app.use(installCustomComponents)

app.mount('#app')

// ==================== 协同编辑初始化 ====================
// 通过 URL query ?collab=1 启用协同(默认单机,保持向后兼容)。
// 协同启用时:注入命令上下文、连接 Yjs WebSocket + IndexedDB。
import { useStore } from '@/store'
import { initCollab } from '@/collab'

const enableCollab = (() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('collab') === '1'
})()

if (enableCollab) {
    const store = useStore()
    store.initCommandContext()
    initCollab()
}


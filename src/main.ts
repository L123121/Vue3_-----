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
import { registerAllCommands } from '@/commands/setup'
import { initCommandContext } from '@/composables/useCommandActions'
import { initCollab } from '@/collab/useCollabStore'

// 初始化命令注册表
registerAllCommands()

const app = createApp(App)
const pinia = createPinia()

app.use(ElementPlus, { size: 'small' })
app.use(router)
app.use(pinia)
app.use(installCustomComponents)

// 命令系统在单机和协同模式下都需要上下文
initCommandContext()

app.mount('#app')

// ==================== 协同编辑初始化 ====================
// 通过 URL query ?collab=1 启用协同(默认单机,保持向后兼容)。
// 协同启用时:连接 Yjs WebSocket + IndexedDB。

const enableCollab = (() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('collab') === '1'
})()

if (enableCollab) {
    initCollab()
}


import { createApp } from 'vue'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
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

// 初始化命令注册表
registerAllCommands()

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)
app.use(installCustomComponents)

app.mount('#app')

// 命令系统需要上下文（mount 后调用，确保 Pinia 已激活）
try {
    initCommandContext()
} catch (e) {
    console.error('[main] initCommandContext failed:', e)
}

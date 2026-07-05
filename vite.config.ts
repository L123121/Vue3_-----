import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 8080,
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vue 核心
                    'vue-vendor': ['vue', 'vue-router', 'pinia'],
                    // UI 框架
                    'element-plus': ['element-plus', '@element-plus/icons-vue'],
                    // 图表
                    'echarts-vendor': ['echarts', 'vue-echarts'],
                    // 代码编辑器
                    'editor-vendor': ['ace-builds'],
                    // 协同编辑
                    'collab-vendor': ['yjs', 'y-websocket', 'y-indexeddb'],
                },
            },
        },
    },
})
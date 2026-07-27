import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '')

    return {
        plugins: [
            vue(),
            AutoImport({
                resolvers: [ElementPlusResolver()],
                dts: 'src/auto-imports.d.ts',
            }),
            Components({
                resolvers: [ElementPlusResolver({ importStyle: 'css' })],
                dts: 'src/components.d.ts',
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 8080,
            proxy: {
                '/api': {
                    target: env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3000',
                    changeOrigin: true,
                },
            },
        },
        build: {
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                output: {
                    manualChunks: {
                    // Vue 核心
                        'vue-vendor': ['vue', 'vue-router', 'pinia'],
                        // 图表
                        'echarts-vendor': ['echarts', 'vue-echarts'],
                        // 代码编辑器
                        'editor-vendor': ['ace-builds'],
                    },
                },
            },
        },
    }
})

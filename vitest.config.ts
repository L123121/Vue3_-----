import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vitest 配置：复用 src 的 @ 别名；jsdom 环境支持 DOM API；
// 测试文件放在各模块的 __tests__ 目录下，文件名 *.test.ts
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['src/**/__tests__/*.test.ts'],
    },
})
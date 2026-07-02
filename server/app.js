/**
 * 低代码平台服务端
 * 整合: Express REST API + Yjs WebSocket 协同
 *
 * 启动:
 *   cd server && npm install && npm start
 *   或: node server/app.js
 *
 * 环境变量(.env):
 *   PORT          - API 端口(默认 3000)
 *   WS_PORT       - WS 端口(默认 1234,与 API 同端口时设为相同值)
 *   MONGODB_URI   - MongoDB 连接地址
 *   JWT_SECRET    - JWT 密钥
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import pagesRoutes from './routes/pages.js'
import { setupYjsWebSocket } from './yjs-ws.js'
import Page from './models/Page.js'

const PORT = Number(process.env.PORT) || 3000
const WS_PORT = Number(process.env.WS_PORT) || PORT

const app = express()
const server = http.createServer(app)

// ==================== 中间件 ====================
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ==================== REST API 路由 ====================

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() })
})

// 用户认证
app.use('/api/auth', authRoutes)

// 页面 CRUD
app.use('/api/pages', pagesRoutes)

// 分享页面(无需认证)
app.get('/api/shared/:token', async (req, res) => {
    try {
        const page = await Page.findOne({ shareToken: req.params.token, isPublic: true })
        if (!page) {
            return res.status(404).json({ error: '分享页面不存在或已取消分享' })
        }
        res.json({ page })
    } catch (err) {
        console.error('[shared page]', err)
        res.status(500).json({ error: '获取分享页面失败' })
    }
})

// ==================== Yjs WebSocket 协同 ====================
if (WS_PORT !== PORT) {
    // 分离端口模式:另起一个 WS 服务
    const wsServer = http.createServer()
    const wss = new WebSocketServer({ server: wsServer })
    setupYjsWebSocket(wss)
    wsServer.listen(WS_PORT, () => {
        console.log(`✅ Yjs 协同服务: ws://localhost:${WS_PORT}/<room-name>`)
    })
} else {
    // 同端口模式:WS 和 HTTP 共享端口
    const wss = new WebSocketServer({ server, path: '/ws' })
    setupYjsWebSocket(wss)
}

// ==================== 启动 ====================
async function start() {
    await connectDB()

    server.listen(PORT, () => {
        console.log(`✅ API 服务: http://localhost:${PORT}`)
        console.log(`   注册: POST /api/auth/register`)
        console.log(`   登录: POST /api/auth/login`)
        console.log(`   页面: GET/POST/PUT/DELETE /api/pages`)
        console.log(`   分享: GET /api/shared/:token`)
    })
}

start()
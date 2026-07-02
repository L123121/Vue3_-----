/**
 * Yjs 协同服务端(独立启动,兼容旧方式)
 * 启动: node server/index.js (端口 1234)
 *
 * 推荐使用新统一入口: npm run server (app.js, 端口 3000)
 */

import { WebSocketServer } from 'ws'
import http from 'http'
import { setupYjsWebSocket } from './yjs-ws.js'

const port = Number(process.env.PORT) || 1234

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Yjs collaboration server is running\n')
})

const wss = new WebSocketServer({ server })
setupYjsWebSocket(wss)

server.listen(port, () => {
    console.log(`✅ Yjs 协同服务: ws://localhost:${port}/<room-name>`)
})
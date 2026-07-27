/**
 * 低代码平台 Express API。
 */

import './env.js'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'path'
import { pathToFileURL } from 'url'
import aiRoutes from './routes/ai.js'
import agentRoutes from './routes/agent.js'
import { envBoolean, envNumber } from './env.js'
import {
    createAIRateLimiter,
    createApiKeyMiddleware,
    createCorsOptions,
    createGeneralRateLimiter,
} from './security.js'

export function createApp() {
    const app = express()
    if (envBoolean('TRUST_PROXY', process.env.NODE_ENV === 'production')) {
        app.set('trust proxy', 1)
    }

    app.disable('x-powered-by')
    app.use(helmet({ contentSecurityPolicy: false }))
    app.use(cors(createCorsOptions()))
    app.use(createGeneralRateLimiter())
    app.use(express.json({
        limit: process.env.JSON_BODY_LIMIT || '2mb',
        strict: true,
    }))

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: Date.now() })
    })

    const apiKeyMiddleware = createApiKeyMiddleware()
    const aiRateLimiter = createAIRateLimiter()
    app.use('/api/ai', apiKeyMiddleware, aiRateLimiter)
    app.use('/api/ai', aiRoutes)
    app.use('/api/ai/agent', agentRoutes)

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error)
        const status = error?.type === 'entity.too.large' ? 413 : 500
        const message = status === 413 ? '请求体过大' : (error?.message || '服务器内部错误')
        return res.status(status).json({ error: message })
    })

    return app
}

export function startServer(port = envNumber('PORT', 3000, { min: 0, max: 65535 }), options = {}) {
    const app = createApp()
    const server = app.listen(port, () => {
        if (options.silent) return
        const address = server.address()
        const actualPort = typeof address === 'object' && address ? address.port : port
        console.log(`API 服务: http://localhost:${actualPort}`)
        console.log('AI 生成: POST /api/ai/chat')
        console.log('AI Agent: POST /api/ai/agent/round')
        console.log('健康检查: GET /api/health')
    })
    return server
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (entryPath === import.meta.url) startServer()

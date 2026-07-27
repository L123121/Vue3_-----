import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { envBoolean, envList, envNumber } from './env.js'

const DEFAULT_LOCAL_ORIGINS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]

function safeEqual(first, second) {
    const firstBuffer = Buffer.from(String(first))
    const secondBuffer = Buffer.from(String(second))
    return firstBuffer.length === secondBuffer.length
        && crypto.timingSafeEqual(firstBuffer, secondBuffer)
}

export function createCorsOptions() {
    const allowedOrigins = new Set(envList('CORS_ORIGIN', DEFAULT_LOCAL_ORIGINS))
    return {
        credentials: true,
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) return callback(null, true)
            return callback(new Error(`不允许的跨域来源: ${origin}`))
        },
    }
}

export function createApiKeyMiddleware() {
    const configuredKeys = envList('API_ACCESS_KEYS')
    const authRequired = envBoolean('REQUIRE_API_AUTH', process.env.NODE_ENV === 'production')

    if (authRequired && configuredKeys.length === 0) {
        throw new Error('REQUIRE_API_AUTH 已启用，但未配置 API_ACCESS_KEYS')
    }

    return function apiKeyMiddleware(req, res, next) {
        if (!configuredKeys.length) return next()
        const apiKey = String(req.get('X-API-Key') || '').trim()
        if (apiKey && configuredKeys.some(key => safeEqual(apiKey, key))) return next()
        return res.status(401).json({ error: '缺少或无效的 API 访问密钥' })
    }
}

export function createGeneralRateLimiter() {
    return rateLimit({
        windowMs: envNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, { min: 1000 }),
        limit: envNumber('RATE_LIMIT_MAX', 300, { min: 1 }),
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: '请求过于频繁，请稍后再试' },
    })
}

export function createAIRateLimiter() {
    return rateLimit({
        windowMs: envNumber('AI_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000, { min: 1000 }),
        limit: envNumber('AI_RATE_LIMIT_MAX', 30, { min: 1 }),
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'AI 请求额度已达到当前时间窗口上限，请稍后再试' },
    })
}

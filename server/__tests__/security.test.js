import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiKeyMiddleware, createCorsOptions } from '../security.js'

function mockRes() {
    const res = { statusCode: 0, body: null }
    res.status = function (code) {
        res.statusCode = code
        return this
    }
    res.json = function (payload) {
        res.body = payload
        return this
    }
    return res
}

test('API Key 中间件：未配置密钥时放行', () => {
    const previous = process.env.API_ACCESS_KEYS
    delete process.env.API_ACCESS_KEYS
    try {
        const middleware = createApiKeyMiddleware()
        let nextCalled = false
        middleware({ get: () => '' }, mockRes(), () => { nextCalled = true })
        assert.equal(nextCalled, true)
    } finally {
        if (previous === undefined) delete process.env.API_ACCESS_KEYS
        else process.env.API_ACCESS_KEYS = previous
    }
})

test('API Key 中间件：密钥不匹配返回 401', () => {
    const previous = process.env.API_ACCESS_KEYS
    process.env.API_ACCESS_KEYS = 'secret-key-123'
    try {
        const middleware = createApiKeyMiddleware()
        const res = mockRes()
        let nextCalled = false
        middleware({ get: () => 'wrong-key' }, res, () => { nextCalled = true })
        assert.equal(res.statusCode, 401)
        assert.equal(nextCalled, false)
    } finally {
        if (previous === undefined) delete process.env.API_ACCESS_KEYS
        else process.env.API_ACCESS_KEYS = previous
    }
})

test('API Key 中间件：密钥匹配放行', () => {
    const previous = process.env.API_ACCESS_KEYS
    process.env.API_ACCESS_KEYS = 'secret-key-123'
    try {
        const middleware = createApiKeyMiddleware()
        let nextCalled = false
        middleware({ get: () => 'secret-key-123' }, mockRes(), () => { nextCalled = true })
        assert.equal(nextCalled, true)
    } finally {
        if (previous === undefined) delete process.env.API_ACCESS_KEYS
        else process.env.API_ACCESS_KEYS = previous
    }
})

test('CORS：默认放行本地开发来源', () => {
    const previous = process.env.CORS_ORIGIN
    delete process.env.CORS_ORIGIN
    try {
        const options = createCorsOptions()
        assert.equal(typeof options.origin, 'function')
        options.origin('http://localhost:8080', (err, allowed) => {
            assert.equal(err, null)
            assert.equal(allowed, true)
        })
    } finally {
        if (previous === undefined) delete process.env.CORS_ORIGIN
        else process.env.CORS_ORIGIN = previous
    }
})

test('CORS：未配置来源列表时拒绝未知来源', () => {
    const previous = process.env.CORS_ORIGIN
    delete process.env.CORS_ORIGIN
    try {
        const options = createCorsOptions()
        options.origin('https://evil.example.com', (err, allowed) => {
            assert.ok(err instanceof Error)
            assert.equal(allowed, undefined)
        })
    } finally {
        if (previous === undefined) delete process.env.CORS_ORIGIN
        else process.env.CORS_ORIGIN = previous
    }
})

test('CORS：无 Origin 请求（同源/非浏览器）放行', () => {
    const previous = process.env.CORS_ORIGIN
    delete process.env.CORS_ORIGIN
    try {
        const options = createCorsOptions()
        options.origin(undefined, (err, allowed) => {
            assert.equal(err, null)
            assert.equal(allowed, true)
        })
    } finally {
        if (previous === undefined) delete process.env.CORS_ORIGIN
        else process.env.CORS_ORIGIN = previous
    }
})

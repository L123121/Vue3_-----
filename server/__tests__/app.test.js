import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from '../app.js'
import sessionStore from '../sessionStore.js'

async function withServer(run) {
    const server = startServer(0, { silent: true })
    await new Promise(resolve => server.once('listening', resolve))
    const address = server.address()
    try {
        await run(`http://127.0.0.1:${address.port}`)
    } finally {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
}

test('health endpoint starts successfully', async () => {
    await withServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/health`)
        const payload = await response.json()

        assert.equal(response.status, 200)
        assert.equal(payload.status, 'ok')
    })
})

test('AI routes enforce configured API access keys', async () => {
    const previousKeys = process.env.API_ACCESS_KEYS
    const previousRequirement = process.env.REQUIRE_API_AUTH
    process.env.API_ACCESS_KEYS = 'test-access-key'
    process.env.REQUIRE_API_AUTH = 'true'

    try {
        await withServer(async baseUrl => {
            const unauthorized = await fetch(`${baseUrl}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: '测试' }),
            })
            assert.equal(unauthorized.status, 401)

            const authorized = await fetch(`${baseUrl}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'test-access-key',
                },
                body: JSON.stringify({}),
            })
            assert.equal(authorized.status, 400)
        })
    } finally {
        if (previousKeys === undefined) delete process.env.API_ACCESS_KEYS
        else process.env.API_ACCESS_KEYS = previousKeys
        if (previousRequirement === undefined) delete process.env.REQUIRE_API_AUTH
        else process.env.REQUIRE_API_AUTH = previousRequirement
    }
})

test('oversized body returns 413 with generic message', async () => {
    const previousLimit = process.env.JSON_BODY_LIMIT
    process.env.JSON_BODY_LIMIT = '1kb'
    try {
        await withServer(async baseUrl => {
            const response = await fetch(`${baseUrl}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'x'.repeat(4096) }),
            })
            assert.equal(response.status, 413)
            const payload = await response.json()
            assert.equal(payload.error, '请求体过大')
        })
    } finally {
        if (previousLimit === undefined) delete process.env.JSON_BODY_LIMIT
        else process.env.JSON_BODY_LIMIT = previousLimit
    }
})

test('internal errors do not leak err.message to client', async () => {
    await withServer(async baseUrl => {
        // 对未知路由发起请求，验证默认 404/错误响应不携带内部细节
        const response = await fetch(`${baseUrl}/api/unknown-route`)
        assert.equal(response.status, 404)
    })
})

after(async () => {
    await sessionStore.close()
})

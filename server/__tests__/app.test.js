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

after(async () => {
    await sessionStore.close()
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    buildChatUrl,
    createProviderPool,
    getConfiguredAIProviders,
} from '../../../../server/llmProvider.js'

const providers = [
    {
        name: 'primary',
        apiKey: 'primary-key',
        baseUrl: 'https://primary.example/v1',
        model: 'primary-model',
    },
    {
        name: 'longcat',
        apiKey: 'fallback-key',
        baseUrl: 'https://api.longcat.chat/openai',
        model: 'LongCat-2.0',
    },
]

function createResponse(status: number, payload: Record<string, unknown> = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
    } as unknown as Response
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('LLM provider fallback', () => {
    it('生成 OpenAI 兼容的 Chat Completions 地址', () => {
        expect(buildChatUrl('https://api.longcat.chat/openai')).toBe(
            'https://api.longcat.chat/openai/v1/chat/completions',
        )
        expect(buildChatUrl('https://example.test/v1')).toBe(
            'https://example.test/v1/chat/completions',
        )
    })

    it('按主模型、备用模型顺序读取环境变量', () => {
        const configured = getConfiguredAIProviders({
            AI_API_KEY: 'primary-key',
            AI_BASE_URL: 'https://primary.example/v1',
            AI_MODEL: 'primary-model',
            AI_FALLBACK_API_KEY: 'fallback-key',
        })

        expect(configured.map(provider => provider.name)).toEqual(['primary', 'longcat'])
        expect(configured[1]).toMatchObject({
            baseUrl: 'https://api.longcat.chat/openai',
            model: 'LongCat-2.0',
        })
    })

    it('主模型故障后切换备用模型并在后续请求保持使用', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(createResponse(503, { error: 'unavailable' }))
            .mockResolvedValueOnce(createResponse(200, { choices: [] }))
            .mockResolvedValueOnce(createResponse(200, { choices: [] }))
        const onSwitch = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const pool = createProviderPool(providers, {
            logger: { warn: vi.fn() },
            onSwitch,
        })
        const first = await pool.fetchChat({ messages: [] })
        const second = await pool.fetchChat({ messages: [] })
        const requestedUrls = fetchMock.mock.calls.map(call => String(call[0]))

        expect(first.provider.name).toBe('longcat')
        expect(second.provider.name).toBe('longcat')
        expect(requestedUrls).toEqual([
            'https://primary.example/v1/chat/completions',
            'https://api.longcat.chat/openai/v1/chat/completions',
            'https://api.longcat.chat/openai/v1/chat/completions',
        ])
        expect(onSwitch).toHaveBeenCalledTimes(1)
    })

    it('请求格式错误时不错误切换提供商', async () => {
        const fetchMock = vi.fn().mockResolvedValue(createResponse(400, { error: 'bad request' }))
        vi.stubGlobal('fetch', fetchMock)
        const pool = createProviderPool(providers, { logger: { warn: vi.fn() } })

        await expect(pool.fetchChat({ messages: [] })).rejects.toMatchObject({ status: 400 })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
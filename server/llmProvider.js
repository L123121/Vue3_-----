import './env.js'
import { envNumber } from './env.js'

const FAILOVER_STATUSES = new Set([401, 403, 404, 408, 425, 429])
const DEFAULT_REQUEST_TIMEOUT_MS = envNumber('LLM_REQUEST_TIMEOUT_MS', 45_000, { min: 1000 })

export function buildChatUrl(baseUrl) {
    const normalized = String(baseUrl || '').replace(/\/$/, '')
    if (!normalized) throw new Error('LLM 服务地址不能为空')
    if (normalized.endsWith('/chat/completions')) return normalized
    return normalized.endsWith('/v1')
        ? `${normalized}/chat/completions`
        : `${normalized}/v1/chat/completions`
}

export function getConfiguredAIProviders(env = process.env) {
    const providers = [
        {
            name: env.AI_PROVIDER_NAME || 'primary',
            apiKey: env.AI_API_KEY || '',
            baseUrl: env.AI_BASE_URL || 'https://api.stepfun.com/step_plan/v1',
            model: env.AI_MODEL || 'step-3.7-flash',
        },
        {
            name: env.AI_FALLBACK_PROVIDER_NAME || 'longcat',
            apiKey: env.AI_FALLBACK_API_KEY || '',
            baseUrl: env.AI_FALLBACK_BASE_URL || 'https://api.longcat.chat/openai',
            model: env.AI_FALLBACK_MODEL || 'LongCat-2.0',
        },
    ]

    return providers
        .filter(provider => provider.apiKey && provider.baseUrl && provider.model)
        .map(provider => ({ ...provider, baseUrl: provider.baseUrl.replace(/\/$/, '') }))
}

function createProviderError(provider, status, debug) {
    const error = new Error(`${provider.name} LLM 服务异常 (${status})`)
    error.status = status
    error.debug = debug
    error.provider = provider.name
    return error
}

function shouldFailover(error) {
    if (!error?.status) return true
    return FAILOVER_STATUSES.has(error.status) || error.status >= 500
}

function describeFailure(error) {
    if (error?.status) return `HTTP ${error.status}`
    return error instanceof Error ? error.message : '未知错误'
}

/**
 * 从响应中提取 usage（不消费原始 response body，通过 clone 读取）。
 * 流式响应跳过提取，避免缓冲整个 SSE 流。
 * @param {Response} response
 * @returns {Promise<object|null>}
 */
async function extractUsage(response) {
    try {
        const clone = response.clone()
        const data = await clone.json()
        const usage = data?.usage
        if (!usage || typeof usage !== 'object') return null
        return {
            promptTokens: Number(usage.prompt_tokens) || 0,
            completionTokens: Number(usage.completion_tokens) || 0,
            totalTokens: Number(usage.total_tokens)
                || (Number(usage.prompt_tokens) || 0) + (Number(usage.completion_tokens) || 0),
        }
    } catch {
        return null
    }
}

function createRequestSignal(parentSignal, timeoutMs) {
    const controller = new AbortController()
    const onParentAbort = () => controller.abort(parentSignal.reason)
    parentSignal?.addEventListener('abort', onParentAbort, { once: true })
    const timer = setTimeout(() => controller.abort(new Error('LLM 请求超时')), timeoutMs)
    timer.unref?.()

    return {
        signal: controller.signal,
        cleanup() {
            clearTimeout(timer)
            parentSignal?.removeEventListener('abort', onParentAbort)
        },
        isTimeout() {
            return controller.signal.aborted && !parentSignal?.aborted
        },
    }
}

export function createProviderPool(providers, options = {}) {
    const configuredProviders = Array.isArray(providers)
        ? providers.filter(provider => (
            typeof provider?.fetchChat === 'function'
            || (provider?.apiKey && provider?.baseUrl && provider?.model)
        ))
        : []
    if (!configuredProviders.length) {
        throw new Error('AI 服务尚未配置，请设置主模型或备用模型密钥')
    }

    let activeIndex = 0

    return {
        get activeProvider() {
            return configuredProviders[activeIndex]
        },
        async fetchChat(payload, requestOptions = {}) {
            const startIndex = activeIndex
            let lastError

            for (let offset = 0; offset < configuredProviders.length; offset++) {
                const providerIndex = (startIndex + offset) % configuredProviders.length
                const provider = configuredProviders[providerIndex]

                // Mock / 委托 provider：直接调用其实现，不走 HTTP（用于 Eval 与测试）
                if (typeof provider.fetchChat === 'function') {
                    try {
                        return await provider.fetchChat(payload, requestOptions)
                    } catch (error) {
                        if (requestOptions.signal?.aborted) throw error
                        lastError = error
                        const hasNextProvider = offset < configuredProviders.length - 1
                        if (!hasNextProvider) throw error
                        options.logger?.warn?.(`[LLM] mock provider 不可用: ${error.message}`)
                        continue
                    }
                }

                const requestSignal = createRequestSignal(
                    requestOptions.signal,
                    requestOptions.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS,
                )

                try {
                    const response = await fetch(buildChatUrl(provider.baseUrl), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${provider.apiKey}`,
                        },
                        body: JSON.stringify({ ...payload, model: provider.model }),
                        signal: requestSignal.signal,
                    })

                    if (!response.ok) {
                        const debug = (await response.text()).slice(0, 500)
                        throw createProviderError(provider, response.status, debug)
                    }

                    if (providerIndex !== activeIndex) {
                        const previousProvider = configuredProviders[activeIndex]
                        activeIndex = providerIndex
                        options.onSwitch?.({
                            from: previousProvider,
                            to: provider,
                            reason: describeFailure(lastError),
                        })
                    }
                    // 非流式请求附带 usage（token 统计），流式请求透出 null
                    const usage = payload.stream ? null : await extractUsage(response)
                    return { response, provider, usage }
                } catch (error) {
                    if (requestOptions.signal?.aborted) throw error
                    const normalizedError = requestSignal.isTimeout()
                        ? Object.assign(new Error(`${provider.name} LLM 请求超时`), { status: 408 })
                        : error
                    lastError = normalizedError
                    const hasNextProvider = offset < configuredProviders.length - 1
                    if (!hasNextProvider || !shouldFailover(normalizedError)) throw normalizedError
                    const nextProvider = configuredProviders[(providerIndex + 1) % configuredProviders.length]
                    options.logger?.warn?.(
                        `[LLM] ${provider.name} 不可用 (${describeFailure(normalizedError)})，切换至 ${nextProvider.name}`,
                    )
                } finally {
                    requestSignal.cleanup()
                }
            }

            throw lastError || new Error('所有 LLM 服务均不可用')
        },
    }
}

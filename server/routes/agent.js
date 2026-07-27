/**
 * AI Agent 多轮执行路由（Claude Code 风格，流式版）
 *
 * POST /api/ai/agent/round
 *  - stream=false（默认）：兼容旧客户端，返回完整 JSON
 *  - stream=true：SSE 流，实时推送 thinking/tool_call/tool_result 步骤
 *
 * 架构：纯路由层，所有步骤执行委托给 stepExecutor，
 *       SSE 工具函数委托给 sseHelper，上下文构建委托给 promptBuilder。
 */

import { Router } from 'express'
import { createProviderPool, getConfiguredAIProviders } from '../llmProvider.js'
import sessionStore from '../sessionStore.js'
import { buildSystemPrompt, buildContextMessages, formatUserInput } from '../agent/promptBuilder.js'
import { runAgentLoop } from '../agent/agentRunner.js'
import { parseAgentOutput } from '../agent/outputParser.js'
import { executeSteps } from '../agent/stepExecutor.js'
import { initSSE, createSSESender, bindAbortOnClose } from '../agent/sseHelper.js'
import { envNumber } from '../env.js'
import { validateAgentRequest } from '../utils/requestValidation.js'

const router = Router()

const AI_PROVIDERS = getConfiguredAIProviders()
const AI_MODEL = AI_PROVIDERS[0]?.model || 'step-3.7-flash'
const LEGACY_MAX_OUTPUT_TOKENS = envNumber('LEGACY_MAX_OUTPUT_TOKENS', 4096, { min: 512, max: 8192 })
const MAX_SESSION_HISTORY = envNumber('AGENT_MAX_SESSION_HISTORY', 20, { min: 3, max: 100 })

// ==================== 核心接口 ====================

router.post('/round', async (req, res) => {
    const validated = validateAgentRequest(req.body)
    if (validated.error) return res.status(validated.status).json({ error: validated.error })
    const { sessionId, userInput, stream, resume, context, mode } = validated.data

    // 查找或创建 session，并同步编辑器真实上下文
    let session = sessionId ? await sessionStore.get(sessionId) : null
    const isNewSession = !session
    if (!session) {
        session = sessionStore.create()
    }
    syncSessionContext(session, context, isNewSession)

    // 主路径：ReAct 闭环模式（适合多轮创作、模糊输入、需用户决策的场景）
    if (mode !== 'legacy') {
        if (!AI_PROVIDERS.length) {
            return res.status(503).json({ error: 'AI 服务尚未配置，请设置主模型或备用模型密钥' })
        }
        return handleLoopRound(req, res, session, userInput, stream)
    }

    // ══════════════════════════════════════════════════════════════
    // 以下为 Legacy 模式（Plan-and-Solve）降级路径
    // 仅在 mode='legacy' 时进入。适合确定性模板填充场景，
    // 但大部分用户场景推荐使用默认的 loop (ReAct) 模式。
    // ══════════════════════════════════════════════════════════════

    // 恢复模式 1：有缓存步骤，从断点继续执行（不再调 LLM）
    if (resume && session.pendingSteps?.length && userInput.type === 'card_select') {
        return handleResumeRound(req, res, session, userInput, stream)
    }

    // 恢复模式 2：用户选择后，注入决策上下文调 LLM 生成后续步骤
    if (resume && userInput.type === 'card_select' && sessionId) {
        return handleResumeWithLLM(req, res, session, userInput, stream)
    }

    if (!AI_PROVIDERS.length) {
        return res.status(503).json({ error: 'AI 服务尚未配置，请设置主模型或备用模型密钥' })
    }

    // 如果 session 有未消费的断点但用户发的是自由文本，清除断点重新开始
    if (session.pendingSteps) {
        await sessionStore.takeBreakpoint(session.id)
    }

    // 构建 LLM 消息
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        ...buildContextMessages(session),
        { role: 'user', content: formatUserInput(userInput) },
    ]

    const llmRequest = {
        model: AI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: LEGACY_MAX_OUTPUT_TOKENS,
        stream: true,
    }

    if (stream) {
        return handleStreamRound(req, res, session, llmRequest, userInput)
    } else {
        return handleBatchRound(req, res, session, llmRequest, userInput)
    }
})

// ==================== 闭环 Agent 处理 ====================

async function handleLoopRound(req, res, session, userInput, stream) {
    const config = AI_PROVIDERS[0]

    if (userInput.type === 'card_select' || hasPendingUserDecision(session)) {
        recordDecision(
            session,
            userInput,
            userInput.cardId || userInput.value,
            userInput.value,
        )
    }

    if (!stream) {
        try {
            const result = await runAgentLoop({ config, providers: AI_PROVIDERS, session, userInput })
            commitLoopResult(session, userInput, result)
            return res.json(buildResponse(session, result))
        } catch (error) {
            console.error('[Agent Loop] Error:', error)
            return res.status(500).json({ error: 'Agent 执行失败: ' + error.message })
        }
    }

    initSSE(res)
    const controller = new AbortController()
    const cleanup = bindAbortOnClose(res, controller)
    const send = createSSESender(res)

    try {
        const result = await runAgentLoop({
            config,
            providers: AI_PROVIDERS,
            session,
            userInput,
            send,
            signal: controller.signal,
        })
        commitLoopResult(session, userInput, result)
        send('done', buildResponse(session, result))
        res.end()
    } catch (error) {
        if (error.name === 'AbortError' || res.destroyed) return
        console.error('[Agent Loop] Stream error:', error)
        send('error', {
            message: error.message || 'Agent 执行失败',
            code: 'AGENT_LOOP_ERROR',
        })
        res.end()
    } finally {
        cleanup()
    }
}

function commitLoopResult(session, userInput, result) {
    session.round++
    session.currentCanvas = result.preview
    session.canvasStyle = result.canvasStyle
    session.currentDimension = result.currentDimension
    session.history.push({
        round: session.round,
        userInput,
        steps: result.steps,
        canvasAfter: result.preview,
    })
    trimSessionHistory(session)
    session.status = result.done ? 'completed' : 'active'
    sessionStore.update(session.id, session)
}

// ==================== 流式处理 ====================

async function handleStreamRound(req, res, session, llmRequest, userInput) {
    initSSE(res)
    const upstreamController = new AbortController()
    const cleanup = bindAbortOnClose(res, upstreamController)
    const send = createSSESender(res)

    let reasoningText = ''
    let contentText = ''
    let reasoningStarted = false
    let contentStarted = false

    const consumeProviderLine = (line) => {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) return
        const rawData = trimmed.slice(5).trim()
        if (!rawData || rawData === '[DONE]') return

        let chunk
        try {
            chunk = JSON.parse(rawData)
        } catch {
            return
        }

        const delta = chunk?.choices?.[0]?.delta
        if (!delta) return

        const reasoningDelta = delta.reasoning ?? delta.reasoning_content
        if (reasoningDelta) {
            reasoningText += reasoningDelta
            if (!reasoningStarted) {
                reasoningStarted = true
                send('thinking_start', {})
            }
            send('thinking_delta', { text: reasoningDelta })
        }

        if (delta.content) {
            if (!contentStarted && reasoningText) {
                contentStarted = true
                send('thinking', { text: reasoningText })
            }
            contentText += delta.content
        }
    }

    try {
        const providerPool = createProviderPool(AI_PROVIDERS, { logger: console })
        const { response } = await providerPool.fetchChat(llmRequest, {
            signal: upstreamController.signal,
        })
        if (!response.body) {
            send('error', { message: 'LLM 服务未返回可读取的数据流', code: 'EMPTY_STREAM' })
            return res.end()
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            lines.forEach(consumeProviderLine)
        }

        buffer += decoder.decode()
        if (buffer) consumeProviderLine(buffer)

        if (reasoningText && !contentStarted) {
            send('thinking', { text: reasoningText })
        }

        finalizeRound(session, contentText, reasoningText, userInput, send, res)
    } catch (err) {
        if (err.name === 'AbortError' || res.destroyed) return
        console.error('[Agent] Stream error:', err)
        send('error', { message: '生成失败: ' + err.message, code: 'INTERNAL_ERROR' })
        res.end()
    } finally {
        cleanup()
    }
}

// ==================== 批处理（兼容旧客户端）====================

async function handleBatchRound(req, res, session, llmRequest, userInput) {
    try {
        const providerPool = createProviderPool(AI_PROVIDERS, { logger: console })
        const { response } = await providerPool.fetchChat({ ...llmRequest, stream: false })

        const data = await response.json()
        const message = data.choices?.[0]?.message
        const contentText = message?.content || ''
        const reasoningText = message?.reasoning || message?.reasoning_content || ''

        let agentOutput = parseAgentOutput(contentText)
        if (!agentOutput) {
            const jsonMatches = reasoningText.match(/\{[\s\S]*\}/g)
            if (jsonMatches) {
                const sorted = jsonMatches.sort((a, b) => b.length - a.length)
                for (const candidate of sorted) {
                    agentOutput = parseAgentOutput(candidate)
                    if (agentOutput) break
                }
            }
        }
        if (!agentOutput) {
            return res.status(502).json({
                error: '解析 LLM 输出失败',
                debug: contentText.slice(0, 200) || reasoningText.slice(0, 200),
            })
        }

        const result = executeSteps(agentOutput.steps, session)

        session.round++
        session.currentCanvas = result.preview
        session.canvasStyle = result.canvasStyle
        session.history.push({ round: session.round, userInput, steps: result.steps, canvasAfter: result.preview })
        trimSessionHistory(session)
        if (result.done) session.status = 'completed'
        sessionStore.update(session.id, session)

        res.json(buildResponse(session, result))
    } catch (err) {
        console.error('[Agent] Error:', err)
        res.status(500).json({ error: '生成失败: ' + err.message })
    }
}

// ==================== 统一收尾（流式共用）====================

async function handleResumeWithLLM(req, res, session, userInput, stream) {
    const cardId = userInput.cardId || userInput.value
    const decisionValue = userInput.value

    recordDecision(session, userInput, cardId, decisionValue)

    const lastRound = session.history[session.history.length - 1]
    const askStep = lastRound?.steps.find(s => s.type === 'ask_user' || s.type === 'user_input')
    const decisionContext = `用户在上轮「${askStep?.title || '选择'}」中选择了「${decisionValue}」(${cardId})。请基于此选择继续生成后续步骤。`

    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        ...buildContextMessages(session),
        { role: 'user', content: decisionContext },
    ]

    const llmRequest = {
        model: AI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: LEGACY_MAX_OUTPUT_TOKENS,
        stream: true,
    }

    if (stream) {
        return handleStreamRound(req, res, session, llmRequest, userInput)
    } else {
        return handleBatchRound(req, res, session, llmRequest, userInput)
    }
}

function finalizeRound(session, contentText, reasoningText, userInput, send, res) {
    let agentOutput = parseAgentOutput(contentText)
    if (!agentOutput) {
        const jsonMatches = reasoningText.match(/\{[\s\S]*\}/g)
        if (jsonMatches) {
            const sorted = jsonMatches.sort((a, b) => b.length - a.length)
            for (const candidate of sorted) {
                agentOutput = parseAgentOutput(candidate)
                if (agentOutput) break
            }
        }
    }
    if (!agentOutput) {
        send('error', {
            message: '解析 LLM 输出失败',
            code: 'PARSE_ERROR',
            debug: contentText.slice(0, 200) || reasoningText.slice(0, 200),
        })
        return res.end()
    }

    const result = executeSteps(agentOutput.steps, session, { send })

    session.round++
    session.currentCanvas = result.preview
    session.canvasStyle = result.canvasStyle
    session.history.push({ round: session.round, userInput, steps: result.steps, canvasAfter: result.preview })
    trimSessionHistory(session)
    if (result.done) session.status = 'completed'
    sessionStore.update(session.id, session)

    const response = buildResponse(session, result)
    send('done', response)
    res.end()
}

function buildResponse(session, result) {
    return {
        sessionId: session.id,
        steps: result.steps,
        preview: result.preview,
        canvasStyle: result.canvasStyle,
        done: result.done,
        waitingForInput: result.waitingForInput,
        stepLimitReached: Boolean(result.stepLimitReached),
        currentDimension: result.currentDimension,
        validation: result.validation,
        progress: {
            currentStep: result.steps.filter(s => s.type === 'tool_call' && s.status === 'success').length,
            totalSteps: result.steps.filter(s => s.type === 'tool_call').length,
            dimensions: Object.keys(session.decisions),
        },
    }
}

// ==================== 步骤执行（从断点恢复）====================

async function handleResumeRound(req, res, session, userInput, stream) {
    const breakpoint = await sessionStore.takeBreakpoint(session.id)
    if (!breakpoint || !breakpoint.pendingSteps) {
        return res.status(409).json({ error: '决策断点已过期，请重新开始' })
    }

    const { pendingSteps, pendingContext } = breakpoint
    const cardId = userInput.cardId || userInput.value
    const decisionValue = userInput.value

    recordDecision(session, userInput, cardId, decisionValue)

    if (stream) {
        initSSE(res)
    }

    const result = executeSteps(pendingSteps, session, {
        initialPreview: pendingContext?.preview,
        initialCanvasStyle: pendingContext?.canvasStyle,
        initialDimension: pendingContext?.currentDimension,
        resForStream: stream ? res : undefined,
    })

    const decisionStep = {
        id: `decision_${Date.now()}`,
        type: 'tool_result',
        title: `已选择：${decisionValue}`,
        description: `用户选择: ${cardId}`,
        status: 'success',
    }
    result.steps.unshift(decisionStep)

    session.round++
    session.currentCanvas = result.preview
    session.canvasStyle = result.canvasStyle
    if (result.currentDimension) session.currentDimension = result.currentDimension
    session.history.push({
        round: session.round,
        userInput,
        steps: result.steps,
        canvasAfter: result.preview,
    })
    trimSessionHistory(session)
    if (result.done) session.status = 'completed'
    sessionStore.update(session.id, session)

    const response = buildResponse(session, result)

    if (stream) {
        const send = createSSESender(res)
        send('done', response)
        res.end()
    } else {
        res.json(response)
    }
}

// ==================== 辅助函数 ====================

function syncSessionContext(session, context, forceCanvasSync = false) {
    if (!context || typeof context !== 'object') return

    session.selectedComponentIds = Array.isArray(context.selectedComponentIds)
        ? context.selectedComponentIds.filter(id => typeof id === 'string')
        : []
    if (context.viewport && typeof context.viewport === 'object') {
        session.viewport = {
            width: Number(context.viewport.width) || session.viewport?.width || 0,
            height: Number(context.viewport.height) || session.viewport?.height || 0,
            scale: Number(context.viewport.scale) || session.viewport?.scale || 100,
        }
    }

    const hasNewEditorVersion = Number.isFinite(Number(context.dataVersion))
        && Number(context.dataVersion) !== session.sourceDataVersion
    if ((forceCanvasSync || hasNewEditorVersion) && Array.isArray(context.components) && context.canvasStyle) {
        session.currentCanvas = JSON.parse(JSON.stringify(context.components))
        session.canvasStyle = JSON.parse(JSON.stringify(context.canvasStyle))
        session.sourceDataVersion = Number(context.dataVersion) || 0
        session.status = 'active'
    }
}

/**
 * 记录用户决策到 session（handleResumeRound / handleResumeWithLLM 共用）
 */
function recordDecision(session, userInput, cardId, decisionValue) {
    const lastRound = session.history[session.history.length - 1]
    const askStep = [...(lastRound?.steps || [])].reverse().find(s => (
        (s.type === 'ask_user' || s.type === 'user_input') && s.status === 'pending'
    ))
    const dimensionKey = askStep?.title || `decision_${Date.now()}`
    session.decisions ||= {}
    session.decisions[dimensionKey] = decisionValue

    if (lastRound) {
        for (let i = lastRound.steps.length - 1; i >= 0; i--) {
            const s = lastRound.steps[i]
            if ((s.type === 'ask_user' || s.type === 'user_input') && s.status === 'pending') {
                s.status = 'success'
                s.selectedCardId = cardId
                s.selectedValue = decisionValue
                break
            }
        }
    }
}

function hasPendingUserDecision(session) {
    const lastRound = session.history[session.history.length - 1]
    return Boolean(lastRound?.steps?.some(step => (
        (step.type === 'ask_user' || step.type === 'user_input') && step.status === 'pending'
    )))
}

function trimSessionHistory(session) {
    if (session.history.length > MAX_SESSION_HISTORY) {
        session.history = session.history.slice(-MAX_SESSION_HISTORY)
    }
}

export default router

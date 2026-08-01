/**
 * 有限步闭环 Agent Runner
 *
 * 依赖新拆分模块：
 *   - promptBuilder.js  → 消息构建
 *   - outputParser.js   → 决策解析
 *   - stepExecutor.js   → 步骤/反馈管理
 *   - componentHelper.js → 画布观察
 */

import { createProviderPool } from '../llmProvider.js'
import { nanoid } from '../utils/nanoid.js'
import { buildInitialMessages, LOOP_SYSTEM_PROMPT } from './promptBuilder.js'
import { parseDecision, parseDecisions } from './outputParser.js'
import { executeTool } from './agentTools.js'
import { validateCanvas } from './canvasValidator.js'
import { createToolCallStep, createToolResultStep, addFeedback, finishWithValidation } from './stepExecutor.js'
import { TOOLS } from './toolRegistry.js'
import { normalizeToolError } from './toolError.js'
import { envNumber } from '../env.js'

const MAX_AGENT_STEPS = envNumber('AGENT_MAX_STEPS', 12, { min: 2, max: 25 })
const MAX_REPAIR_ROUNDS = envNumber('AGENT_MAX_REPAIR_ROUNDS', 2, { min: 0, max: 5 })
const MAX_TOOL_ERRORS = envNumber('AGENT_MAX_TOOL_ERRORS', 3, { min: 1, max: 5 })
const MAX_MUTATING_STEPS_BEFORE_CONFIRM = envNumber('AGENT_MUTATIONS_BEFORE_CONFIRM', 5, { min: 1, max: 12 })
const MAX_AGENT_DURATION_MS = envNumber('AGENT_MAX_DURATION_MS', 90_000, { min: 5000 })
const MAX_OUTPUT_TOKENS = envNumber('AGENT_MAX_OUTPUT_TOKENS', 1024, { min: 256, max: 4096 })
/** 单轮批处理最多执行的独立工具数量，防止一次返回过多调用撑爆单轮 */
const MAX_BATCH_DECISIONS = envNumber('AGENT_MAX_BATCH_DECISIONS', 4, { min: 1, max: 8 })
const READ_ONLY_TOOLS = new Set(['observe_canvas', 'inspect_component'])
const CANVAS_STATE_MUTATING_TOOLS = new Set([
    'apply_color_scheme',
    'set_canvas_style',
    'add_component',
    'modify_component',
    'move_component',
    'resize_component',
    'delete_component',
    'reorder_layer',
])

const DIRECT_EXECUTION_PATTERN = /(直接|立即|马上)(生成|创建|制作|设计|做)|不要(再)?问|不用(再)?问|无需(再)?确认|不要(再)?确认|跳过(询问|确认)|directly|without asking|no questions/i
const VAGUE_INITIAL_REQUEST_PATTERN = /^(帮我)?(做|生成|创建|设计|来)(一个|个)?(页面|海报|表单|报名表|设计)?[吧。！!]?$/i

export function shouldRequireInitialChoice(session, userInput) {
    const goal = String(userInput.value || '').trim()
    if (userInput.type === 'card_select' || DIRECT_EXECUTION_PATTERN.test(goal)) return false

    const isEmptyFirstRound = (session.currentCanvas || []).length === 0
        && (session.history || []).length === 0
        && Object.keys(session.decisions || {}).length === 0
    const isVagueGoal = goal.length < 8 || VAGUE_INITIAL_REQUEST_PATTERN.test(goal)

    return isEmptyFirstRound && isVagueGoal
}

function createInitialChoice(userInput, plannedDecision) {
    const goal = String(userInput.value || '').trim()
    const recommendation = plannedDecision?.summary || '按当前描述完成页面结构、风格与内容'
    return {
        type: 'ask_user',
        summary: '开始搭建前确认整体方向',
        question: '开始搭建前，先确认你更看重哪个方向？',
        description: goal ? `我会围绕「${goal.slice(0, 80)}」继续生成。` : '',
        options: [
            {
                id: 'follow_brief',
                title: '按当前描述生成',
                description: recommendation,
                tag: '推荐',
            },
            {
                id: 'layout_first',
                title: '优先信息与布局',
                description: '先保证层级清晰、留白合理和内容易读',
            },
            {
                id: 'visual_first',
                title: '优先视觉表现',
                description: '强化配色、对比和氛围感，再补充细节',
            },
        ],
    }
}

function createProgressChoice() {
    return {
        type: 'ask_user',
        summary: '关键结构已完成，等待确认收尾方向',
        question: '当前预览已完成一轮关键调整，接下来怎么处理？',
        description: '你也可以先应用当前预览，再回到画布中手动微调。',
        options: [
            {
                id: 'finish_current',
                title: '保持方向并完成',
                description: '沿用当前布局与视觉，补齐细节后交付',
                tag: '推荐',
            },
            {
                id: 'improve_layout',
                title: '继续优化布局',
                description: '重点调整层级、间距、对齐和留白',
            },
            {
                id: 'improve_visual',
                title: '继续强化视觉',
                description: '重点调整配色、对比、字号和装饰',
            },
        ],
    }
}

function pauseForUserChoice(decision, state, send) {
    const userInputStep = {
        id: `input_${nanoid(8)}`,
        type: 'user_input',
        title: decision.question,
        description: decision.description,
        status: 'pending',
        cards: decision.options,
    }
    state.steps.push(userInputStep)
    send?.('user_input', { step: userInputStep })
    return {
        steps: state.steps,
        preview: state.preview,
        canvasStyle: state.canvasStyle,
        done: false,
        waitingForInput: true,
        currentDimension: state.currentDimension,
        validation: state.validation,
    }
}

/**
 * 向 LLM 发送非流式请求，返回 message 对象与 usage
 */
async function requestCompletion(providerPool, messages, signal, withTools, timeoutMs) {
    const { response, usage } = await providerPool.fetchChat({
        messages,
        temperature: 0.35,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: false,
        ...(withTools ? { tools: TOOLS, tool_choice: 'auto' } : {}),
    }, { signal, timeoutMs })

    const data = await response.json()
    const message = data.choices?.[0]?.message
    if (!message) throw new Error('LLM 服务没有返回消息')
    return { message, usage }
}

/**
 * 请求 LLM 决策，自动降级（函数调用 → JSON）
 * 返回决策数组：支持一次返回多个独立工具调用（批处理），减少 LLM 往返。
 */
async function requestDecisions(providerPool, messages, signal, timeoutMs) {
    try {
        const { message, usage } = await requestCompletion(providerPool, messages, signal, true, timeoutMs)
        return { decisions: parseDecisions(message), usage }
    } catch (error) {
        if (error.name === 'AbortError') throw error
        if (error.status && ![400, 422].includes(error.status)) throw error
        const fallbackMessages = [
            ...messages,
            { role: 'system', content: '当前服务不支持函数工具或动作格式无效，请严格使用约定 JSON 返回单个动作。' },
        ]
        const { message, usage } = await requestCompletion(providerPool, fallbackMessages, signal, false, timeoutMs)
        return { decisions: [parseDecision(message)], usage }
    }
}

/** 累计单次调用 token 用量到总账 */
function accumulateUsage(total, usage) {
    if (!usage) return total
    total.promptTokens += usage.promptTokens || 0
    total.completionTokens += usage.completionTokens || 0
    total.totalTokens += usage.totalTokens || 0
    return total
}

/**
 * 结构化日志（JSON 行），便于采集与复盘。
 */
function logAgentEvent(sessionId, event, fields = {}) {
    console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event,
        sessionId,
        ...fields,
    }))
}

/**
 * 发送思考摘要的 SSE 事件
 */
function emitThinking(send, summary) {
    if (!summary) return
    send?.('thinking_start', {})
    send?.('thinking_delta', { text: summary })
    send?.('thinking', { text: summary })
}

/**
 * 有限步闭环 Agent 执行
 *
 * @param {object} options
 * @param {object} [options.config] — 单 provider 配置（向后兼容）
 * @param {object[]} [options.providers=[]]
 * @param {import('../agent.types.js').AgentSession} options.session
 * @param {import('../agent.types.js').UserInput} options.userInput
 * @param {function} [options.send]
 * @param {AbortSignal} [options.signal]
 */
export async function runAgentLoop({
    config,
    providers = [],
    session,
    userInput,
    send = undefined,
    signal = undefined,
}) {
    const providerConfigs = providers.length ? providers : [config].filter(Boolean)
    const providerPool = createProviderPool(providerConfigs, {
        logger: console,
        onSwitch: ({ from, to }) => {
            emitThinking(send, `模型 ${from.model} 暂不可用，已切换至 ${to.model}`)
        },
    })
    let steps = []
    let preview = JSON.parse(JSON.stringify(session.currentCanvas || []))
    let canvasStyle = { ...session.canvasStyle }
    let currentDimension = session.currentDimension
    let repairRounds = 0
    let consecutiveToolErrors = 0
    let successfulMutatingSteps = 0
    let canvasChangedSinceObservation = false
    let validation = validateCanvas(preview, canvasStyle)
    /** 本轮累计 token 用量（同时回写 session 总账） */
    const tokenUsage = session.tokenUsage
        || (session.tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 })
    const requireInitialChoice = shouldRequireInitialChoice(session, userInput)
    const deadline = Date.now() + MAX_AGENT_DURATION_MS
    logAgentEvent(session.id, 'agent_round_start', {
        round: session.round + 1,
        canvasCount: preview.length,
        goal: String(userInput?.value || '').slice(0, 120),
    })

    // 第一步：观察画布
    const observeCall = createToolCallStep('observe_canvas', {}, '读取当前画布')
    steps.push(observeCall)
    send?.('tool_call', { step: observeCall })
    const observeResult = executeTool('observe_canvas', {}, preview, canvasStyle, session)
    const observeStep = createToolResultStep(observeCall, observeResult)
    steps[0] = { ...observeCall, status: 'success' }
    steps.push(observeStep)
    send?.('tool_result', { step: observeStep })

    const messages = buildInitialMessages(session, userInput, observeResult.observation)

    // 主循环
    for (let index = 0; index < MAX_AGENT_STEPS; index++) {
        const remainingTime = deadline - Date.now()
        if (remainingTime <= 0) throw new Error('Agent 执行超时，请缩小任务范围后重试')
        // 批处理：一次 LLM 往返可返回多个独立工具调用，逐个执行
        const { decisions: rawDecisions, usage } = await requestDecisions(providerPool, messages, signal, remainingTime)
        accumulateUsage(tokenUsage, usage)
        const decisions = rawDecisions.slice(0, MAX_BATCH_DECISIONS)

        for (const decision of decisions) {
            // 本轮开始时已经读取过画布。画布未变化时再次 observe 只会制造重复步骤。
            if (decision.type === 'tool_call'
                && decision.toolName === 'observe_canvas'
                && !canvasChangedSinceObservation) {
                const currentObservation = executeTool('observe_canvas', {}, preview, canvasStyle, session)
                addFeedback(messages, decision, {
                    ...currentObservation,
                    success: true,
                    summary: '当前画布观察结果仍为最新，无需重复读取',
                })
                continue
            }

            emitThinking(send, decision.summary)

            if (index === 0 && requireInitialChoice && decision.type !== 'ask_user') {
                return pauseForUserChoice(createInitialChoice(userInput, decision), {
                    steps, preview, canvasStyle, currentDimension, validation,
                }, send)
            }

            if (decision.type === 'ask_user') {
                return pauseForUserChoice(decision, {
                    steps, preview, canvasStyle, currentDimension, validation,
                }, send)
            }

            if (decision.type === 'finish') {
                const vResult = finishWithValidation({
                    steps, preview, canvasStyle, repairRounds,
                    MAX_REPAIR_ROUNDS, validation, send, decision, messages,
                })
                steps = vResult.steps
                if (vResult.shouldRetry) {
                    repairRounds = vResult.repairRounds ?? (repairRounds + 1)
                    break
                }
                logAgentEvent(session.id, 'agent_round_end', {
                    done: true,
                    toolSteps: steps.filter(s => s.type === 'tool_call').length,
                    tokenUsage,
                })
                return { ...vResult.result, tokenUsage }
            }

            // tool_call
            const callStep = createToolCallStep(decision.toolName, decision.args, decision.summary)
            steps.push(callStep)
            send?.('tool_call', { step: callStep })

            try {
                const toolResult = executeTool(decision.toolName, decision.args, preview, canvasStyle, session)
                preview = toolResult.preview
                canvasStyle = toolResult.canvasStyle
                currentDimension = toolResult.currentDimension || currentDimension
                session.currentCanvas = preview
                session.canvasStyle = canvasStyle
                session.currentDimension = currentDimension
                consecutiveToolErrors = 0

                const callIndex = steps.findIndex(s => s.id === callStep.id)
                steps[callIndex] = { ...callStep, status: 'success' }
                const resultStep = createToolResultStep(callStep, toolResult)
                steps.push(resultStep)
                send?.('tool_result', { step: resultStep })
                addFeedback(messages, decision, { ...toolResult, success: true })

                if (decision.toolName === 'observe_canvas') {
                    canvasChangedSinceObservation = false
                } else if (CANVAS_STATE_MUTATING_TOOLS.has(decision.toolName)) {
                    canvasChangedSinceObservation = true
                }

                if (CANVAS_STATE_MUTATING_TOOLS.has(decision.toolName)) {
                    successfulMutatingSteps++
                    if (successfulMutatingSteps >= MAX_MUTATING_STEPS_BEFORE_CONFIRM) {
                        validation = validateCanvas(preview, canvasStyle)
                        return pauseForUserChoice(createProgressChoice(), {
                            steps, preview, canvasStyle, currentDimension, validation,
                        }, send)
                    }
                }
            } catch (error) {
                consecutiveToolErrors++
                const normalized = normalizeToolError(error)
                const message = normalized.message
                const callIndex = steps.findIndex(s => s.id === callStep.id)
                steps[callIndex] = { ...callStep, status: 'error', result: message, errorCode: normalized.code }
                const resultStep = createToolResultStep(callStep, {
                    preview,
                    canvasStyle,
                    summary: message,
                    observation: { error: message, errorCode: normalized.code, errorHint: normalized.hint },
                }, 'error')
                steps.push(resultStep)
                send?.('tool_result', { step: resultStep })
                addFeedback(messages, decision, {
                    success: false,
                    summary: message,
                    observation: { error: message, errorCode: normalized.code, errorHint: normalized.hint },
                })
                if (consecutiveToolErrors >= MAX_TOOL_ERRORS) {
                    throw new Error(`连续 ${MAX_TOOL_ERRORS} 次工具执行失败，已停止本轮任务`)
                }
            }
        }
    }

    // 触顶时交付当前画布，但标记为 stepLimitReached，让前端提示用户继续
    steps.push({
        id: `limit_${nanoid(8)}`,
        type: 'done',
        title: `已达到 ${MAX_AGENT_STEPS} 步上限，可以继续输入让 AI 接着做`,
        status: 'pending',
        preview,
        canvasStyle,
    })
    logAgentEvent(session.id, 'agent_round_end', {
        done: false,
        stepLimitReached: true,
        toolSteps: steps.filter(s => s.type === 'tool_call').length,
        tokenUsage,
    })
    return {
        steps,
        preview,
        canvasStyle,
        done: false,
        waitingForInput: false,
        stepLimitReached: true,
        currentDimension,
        validation: validateCanvas(preview, canvasStyle),
        tokenUsage,
    }
}

export default runAgentLoop

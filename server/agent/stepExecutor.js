/**
 * Agent 步骤执行器
 * 统一管理 tool_call 步骤的解析、执行与结果收集
 * 合并了 executeSteps / executeStepsFromContext 的重复逻辑
 */

import { executeTool } from './agentTools.js'
import { validateCanvas } from './canvasValidator.js'
import { nanoid } from '../utils/nanoid.js'
import sessionStore from '../sessionStore.js'
import { writeSSE } from './sseHelper.js'

// ==================== 步骤节点工厂 ====================

/**
 * 创建 tool_call 步骤节点
 * @param {string} toolName
 * @param {object} args
 * @param {string} [title]
 * @returns {object}
 */
export function createToolCallStep(toolName, args, title) {
    return {
        id: `tool_${nanoid(8)}`,
        type: 'tool_call',
        title: title || `执行 ${toolName}`,
        description: '',
        status: 'running',
        toolName,
        toolArgs: args,
    }
}

/**
 * 创建 tool_result 步骤节点
 * @param {object} callStep — 原始 tool_call step
 * @param {object} result — 执行结果
 * @param {'success'|'error'} [status='success']
 * @returns {object}
 */
export function createToolResultStep(callStep, result, status = 'success') {
    return {
        id: `result_${callStep.id}`,
        type: 'tool_result',
        title: status === 'success' ? `已完成: ${callStep.title}` : `执行失败: ${callStep.title}`,
        description: result.summary,
        status,
        preview: result.preview,
        canvasStyle: result.canvasStyle,
        observation: result.observation,
    }
}

// ==================== 步骤执行核心 ====================

/**
 * 执行一组 step 并收集结果
 * 合并原 executeSteps 与 executeStepsFromContext 的逻辑
 *
 * @param {object[]} steps — 待执行的步骤数组
 * @param {object} session — Agent session
 * @param {object} [options]
 * @param {import('../agent.types.js').ComponentData[]} [options.initialPreview] — 初始画布（默认用 session.currentCanvas）
 * @param {import('../agent.types.js').CanvasStyleData} [options.initialCanvasStyle] — 初始画布样式（默认用 session.canvasStyle）
 * @param {string} [options.initialDimension] — 初始维度（默认用 session.currentDimension）
 * @param {function} [options.send] — SSE 发送函数（可选，流式向前端推送）
 * @param {object} [options.resForStream] — Express response 对象（可选，直接写 SSE 流）
 * @param {number} [options.startIndex] — 从 steps 的哪个索引开始执行（默认 0）
 * @returns {{ steps: object[], preview, canvasStyle, done, waitingForInput, currentDimension }}
 */
export function executeSteps(steps, session, options = {}) {
    const {
        initialPreview,
        initialCanvasStyle,
        initialDimension,
        send,
        resForStream,
        startIndex = 0,
    } = options

    const executedSteps = []
    let preview = initialPreview
        ? [...initialPreview]
        : [...(session.currentCanvas || [])]
    let canvasStyle = initialCanvasStyle
        ? { ...initialCanvasStyle }
        : { ...(session.canvasStyle || {}) }
    let currentDimension = initialDimension || session.currentDimension || ''
    let done = false
    let waitingForInput = false

    const emit = send || (resForStream
        ? (event, data) => writeSSE(resForStream, event, data)
        : undefined)

    for (let i = startIndex; i < steps.length; i++) {
        const step = steps[i]

        // 已处于等待用户输入状态 → 跳过后续直至遇到新的 ask_user 再保存断点
        if (waitingForInput) {
            executedSteps.push({ ...step, status: 'pending' })
            if (step.type === 'ask_user' || step.type === 'user_input') {
                const futureSteps = steps.slice(i + 1).map(s => ({
                    ...s,
                    status: (s.type === 'ask_user' || s.type === 'user_input') ? 'pending' : 'success',
                }))
                sessionStore.saveBreakpoint(session.id, {
                    pendingSteps: futureSteps,
                    pendingStepIndex: i + 1,
                    pendingContext: { preview, canvasStyle, currentDimension },
                })
            }
            continue
        }

        if (step.type === 'thinking') {
            executedSteps.push({ ...step, status: 'success' })
        } else if (step.type === 'tool_call') {
            const runningStep = { ...step, status: 'running' }
            executedSteps.push(runningStep)
            if (emit) emit('tool_call', { step: { ...runningStep } })

            try {
                const result = executeTool(
                    step.toolName,
                    step.toolArgs || step.args || {},
                    preview,
                    canvasStyle,
                    session,
                )
                preview = result.preview
                canvasStyle = result.canvasStyle
                currentDimension = result.currentDimension || currentDimension
                executedSteps[executedSteps.length - 1] = { ...executedSteps[executedSteps.length - 1], status: 'success' }

                const resultStep = {
                    id: `result_${step.id}`,
                    type: 'tool_result',
                    title: step.title ? `已完成: ${step.title}` : '执行完成',
                    description: result.summary,
                    status: 'success',
                    preview,
                    canvasStyle,
                }
                executedSteps.push(resultStep)
                if (emit) emit('tool_result', { step: resultStep })
            } catch (err) {
                executedSteps[executedSteps.length - 1] = {
                    ...executedSteps[executedSteps.length - 1],
                    status: 'error',
                    result: err.message,
                }
                const errStep = {
                    id: `result_${step.id}`,
                    type: 'tool_result',
                    title: `执行失败: ${step.title || step.toolName}`,
                    description: err.message,
                    status: 'error',
                }
                executedSteps.push(errStep)
                if (emit) emit('tool_result', { step: errStep })
            }
        } else if (step.type === 'ask_user' || step.type === 'user_input') {
            waitingForInput = true
            const userInputStep = {
                ...step,
                type: 'user_input',
                status: 'pending',
                cards: step.cards || step.options || [],
            }
            executedSteps.push(userInputStep)
            if (emit) emit('user_input', { step: userInputStep })

            // 保存断点
            const pendingSteps = steps.slice(i + 1).map(s => ({
                ...s,
                status: (s.type === 'ask_user' || s.type === 'user_input') ? 'pending' : 'success',
            }))
            sessionStore.saveBreakpoint(session.id, {
                pendingSteps,
                pendingStepIndex: i + 1,
                pendingContext: { preview, canvasStyle, currentDimension },
            })
        } else if (step.type === 'done' || step.type === 'finish') {
            done = true
            executedSteps.push({ ...step, status: 'success' })
        } else {
            executedSteps.push({ ...step, status: 'success' })
        }
    }

    return { steps: executedSteps, preview, canvasStyle, done, waitingForInput, currentDimension }
}

// ==================== 验证与反馈工具 ====================

/**
 * 向 messages 中添加工具执行反馈
 * @param {object[]} messages
 * @param {object} decision
 * @param {object} result
 */
export function addFeedback(messages, decision, result) {
    messages.push({
        role: 'assistant',
        content: JSON.stringify({
            action: 'tool_call',
            summary: decision.summary,
            toolName: decision.toolName,
            args: decision.args,
        }),
    })
    messages.push({
        role: 'user',
        content: `工具执行结果：${JSON.stringify({
            success: result.success,
            summary: result.summary,
            observation: result.observation,
        })}`,
    })
}

/**
 * 对最终的画布运行验证，返回验证通过的 done step 或失败状态
 * @param {object[]} steps
 * @param {object[]} preview
 * @param {object} canvasStyle
 * @param {number} repairRounds
 * @param {number} MAX_REPAIR_ROUNDS
 * @param {object} validation
 * @param {function} send
 * @param {object} decision — finish 决策
 * @param {object[]} messages
 * @returns {{ shouldRetry: boolean, result?: object, steps: object[] }}
 */
export function finishWithValidation({ steps, preview, canvasStyle, repairRounds, MAX_REPAIR_ROUNDS, validation, send, decision, messages }) {
    validation = validateCanvas(preview, canvasStyle)
    const validationIssues = [...validation.errors, ...validation.warnings]

    if (validationIssues.length && repairRounds < MAX_REPAIR_ROUNDS) {
        repairRounds++
        const validationStep = {
            id: `validation_${nanoid(8)}`,
            type: 'tool_result',
            title: '画布验证发现问题，继续修复',
            description: validationIssues.map(issue => issue.message).join('；'),
            status: 'error',
            preview,
            canvasStyle,
            validation,
        }
        steps.push(validationStep)
        if (send) send('tool_result', { step: validationStep })
        messages.push({
            role: 'user',
            content: `完成前验证发现问题，请先修复后再 finish：${JSON.stringify(validationIssues)}`,
        })
        return { shouldRetry: true, steps }
    }

    if (validation.errors.length) {
        const failedStep = {
            id: `validation_failed_${nanoid(8)}`,
            type: 'done',
            title: '画布校验未通过',
            description: validation.errors.map(issue => issue.message).join('；'),
            status: 'error',
            preview,
            canvasStyle,
            validation,
        }
        steps.push(failedStep)
        if (send) send('tool_result', { step: failedStep })
        return {
            shouldRetry: false,
            result: { steps, preview, canvasStyle, done: false, waitingForInput: false, currentDimension: null, validation },
            steps,
        }
    }

    steps.push({
        id: `done_${nanoid(8)}`,
        type: 'done',
        title: decision.finishSummary || '页面任务已完成',
        description: validation.warnings.length
            ? `仍有 ${validation.warnings.length} 个布局提醒`
            : '画布验证已通过',
        status: 'success',
        validation,
    })
    return {
        shouldRetry: false,
        result: { steps, preview, canvasStyle, done: true, waitingForInput: false, currentDimension: null, validation },
        steps,
    }
}

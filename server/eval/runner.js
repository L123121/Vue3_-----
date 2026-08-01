/**
 * Agent Eval 运行器
 *
 * 两种模式：
 *   - mock：使用脚本化 mock LLM（fetchChat 委托），确定性回归工具/循环逻辑，无 API 成本
 *   - live：使用真实 LLM Provider，量化端到端生成质量
 *
 * 每次运行都会记录完整步骤轨迹（tool_call/tool_result/ask_user/done），
 * 供失败复盘与后续轨迹回放使用。
 */

import { runAgentLoop } from '../agent/agentRunner.js'
import { getConfiguredAIProviders } from '../llmProvider.js'
import { scoreRun } from './scorer.js'
import { getEvalTasks } from './tasks.js'
import { getMockScript } from './mockScripts.js'

/**
 * 创建 mock LLM provider（fetchChat 委托，供 createProviderPool 识别）
 *
 * @param {Array<{toolName:string,args:object,summary?:string}|{type:'ask_user'|'finish',...}>} script
 *        逐轮决策脚本。每轮 fetchChat 消耗一个决策。
 * @param {object} [options]
 * @param {string} [options.name='mock']
 * @returns {object} provider 实例
 */
export function createMockProvider(script, options = {}) {
    const name = options.name || 'mock'
    let index = 0
    const provider = {
        name,
        model: options.model || 'mock-model',
        apiKey: 'mock-key',
        baseUrl: 'http://mock.invalid',
    }

    provider.fetchChat = async () => {
        if (index >= script.length) {
            // 脚本耗尽：返回 finish，避免死循环
            return buildMockResponse(provider, {
                type: 'tool_call',
                toolName: 'finish',
                args: { summary: '脚本执行完毕' },
            })
        }
        const decision = script[index]
        index++
        return buildMockResponse(provider, decision)
    }

    return provider
}

function buildMockResponse(provider, decision) {
    let name
    let args
    let summary = ''

    if (decision.type === 'ask_user' || decision.type === 'finish') {
        name = decision.type
        args = decision.args || {}
        summary = decision.summary || ''
    } else {
        name = decision.toolName || 'finish'
        args = decision.args || {}
        summary = decision.summary || ''
    }

    return {
        response: {
            json: async () => ({
                choices: [{
                    message: {
                        content: summary,
                        tool_calls: [{
                            id: `mock_${name}`,
                            type: 'function',
                            function: {
                                name,
                                arguments: JSON.stringify(args),
                            },
                        }],
                    },
                }],
            }),
        },
        provider,
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
    }
}

/**
 * 创建 Eval 会话（对齐 sessionStore.create 的结构）
 * @param {import('./eval.types.js').EvalTask} task
 * @returns {object} AgentSession
 */
export function createEvalSession(task) {
    return {
        id: `eval_${task.id}_${Date.now().toString(36)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        history: [],
        decisions: {},
        currentCanvas: JSON.parse(JSON.stringify(task.initialCanvas || [])),
        canvasStyle: JSON.parse(JSON.stringify(task.canvasStyle || {})),
        currentDimension: '',
        selectedComponentIds: [],
        viewport: { width: 0, height: 0, scale: 100 },
        sourceDataVersion: undefined,
        round: 0,
        status: 'active',
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
}

/**
 * 运行单个 Eval 任务
 * @param {import('./eval.types.js').EvalTask} task
 * @param {object} [options]
 * @param {'mock'|'live'} [options.mode='mock']
 * @param {Array} [options.script] — mock 模式决策脚本
 * @param {object[]} [options.providers] — live 模式 Provider 列表
 * @param {string} [options.providerName] — 报告中的 provider 标识
 * @returns {Promise<import('./eval.types.js').EvalRunResult>}
 */
export async function runEvalTask(task, options = {}) {
    const {
        mode = 'mock',
        script,
        providers = [],
        providerName,
    } = options

    const session = createEvalSession(task)
    const startedAt = Date.now()

    try {
        let providerPoolConfigs
        if (mode === 'mock') {
            // mock 模式：未显式传脚本时使用该任务的内置确定性脚本
            const mockScript = script ?? getMockScript(task.id)
            providerPoolConfigs = [createMockProvider(mockScript)]
        } else {
            providerPoolConfigs = providers.length ? providers : getConfiguredAIProviders()
            if (!providerPoolConfigs.length) {
                throw new Error('live 模式需要配置 AI Provider（AI_API_KEY 等）')
            }
        }

        const result = await runAgentLoop({
            providers: providerPoolConfigs,
            session,
            userInput: { type: 'free_text', value: task.prompt },
        })

        const durationMs = Date.now() - startedAt
        return scoreRun(task, {
            finalCanvas: result.preview,
            canvasStyle: result.canvasStyle,
            steps: result.steps,
            durationMs,
            tokenUsage: result.tokenUsage || null,
            provider: providerName || (mode === 'mock' ? 'mock' : providerPoolConfigs[0]?.name),
        })
    } catch (error) {
        const durationMs = Date.now() - startedAt
        return scoreRun(task, {
            finalCanvas: session.currentCanvas,
            canvasStyle: session.canvasStyle,
            steps: [],
            durationMs,
            tokenUsage: session.tokenUsage || null,
            provider: providerName || (mode === 'mock' ? 'mock' : providers[0]?.name),
            error: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * 运行整个任务集，返回汇总报告
 * @param {object} [options]
 * @param {'mock'|'live'} [options.mode='mock']
 * @param {Record<string,Array>} [options.scripts] — taskId → mock 脚本
 * @param {string[]} [options.taskIds] — 只跑指定任务
 * @param {object[]} [options.providers]
 * @returns {Promise<import('./eval.types.js').EvalReport>}
 */
export async function runEvalSuite(options = {}) {
    const {
        mode = 'mock',
        scripts = {},
        taskIds = [],
        providers = [],
    } = options

    const tasks = taskIds.length
        ? getEvalTasks().filter(task => taskIds.includes(task.id))
        : getEvalTasks()

    const results = []
    for (const task of tasks) {
        const result = await runEvalTask(task, {
            mode,
            script: scripts[task.id],
            providers,
        })
        results.push(result)
    }

    const passed = results.filter(result => result.pass).length
    const totalTokens = results.reduce(
        (sum, result) => sum + (result.tokenUsage?.totalTokens || 0),
        0,
    )
    const totalDurationMs = results.reduce((sum, result) => sum + result.durationMs, 0)
    const avgScore = results.length
        ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
        : 0

    return {
        mode,
        provider: mode === 'mock' ? 'mock' : (providers[0]?.name || 'live'),
        createdAt: new Date().toISOString(),
        total: results.length,
        passed,
        passRate: results.length ? passed / results.length : 0,
        avgScore,
        totalDurationMs,
        totalTokens,
        results,
    }
}

/**
 * AI 页面生成路由（多工具自适应 Agent）
 *
 * POST /api/ai/chat
 * Response: {
 *   reply: string,
 *   actions?: [...],          // 画布操作
 *   options?: [...],          // 选项卡片（propose_options）
 *   question?: string,        // 开放提问（ask_question）
 *   plan?: { summary, details } // 方案确认（confirm_plan）
 * }
 */

import { Router } from 'express'
import { createProviderPool, getConfiguredAIProviders } from '../llmProvider.js'
import { nanoid } from '../utils/nanoid.js'
import { normalizeComponent, summarizeComponent } from '../agent/componentHelper.js'
import { SYSTEM_PROMPT, LEGACY_CHAT_TOOLS } from '../agent/legacyChatConfig.js'
import { envNumber } from '../env.js'
import { validateLegacyChatRequest } from '../utils/requestValidation.js'

const router = Router()

const AI_PROVIDERS = getConfiguredAIProviders()
const CHAT_MAX_OUTPUT_TOKENS = envNumber('CHAT_MAX_OUTPUT_TOKENS', 3072, { min: 512, max: 4096 })

// 提示词与工具定义已抽离到 ../agent/legacyChatConfig.js，保持路由聚焦请求处理。

// ==================== 辅助函数 ====================

// normalizeComponent / summarizeComponent 从 ../agent/componentHelper.js 导入

// ==================== 路由 ====================

router.post('/chat', async (req, res) => {
    const validated = validateLegacyChatRequest(req.body)
    if (validated.error) return res.status(validated.status).json({ error: validated.error })
    const { prompt, history, components, canvasStyle, canvasWidth, canvasHeight } = validated.data
    if (!AI_PROVIDERS.length) {
        return res.status(503).json({ error: 'AI 服务尚未配置，请设置主模型或备用模型密钥' })
    }

    const canvasW = canvasWidth || canvasStyle?.width || 375
    const canvasH = canvasHeight || canvasStyle?.height || 667
    const hasComponents = components.length > 0

    let canvasContext = `当前画布: ${canvasW}x${canvasH}px`
    if (hasComponents) {
        canvasContext += `\n画布上已有 ${components.length} 个组件:\n`
        canvasContext += components.map(summarizeComponent).map(c =>
            `- [${c.id}] ${c.component} "${typeof c.propValue === 'string' ? c.propValue : JSON.stringify(c.propValue)}" 位置(${c.style.left},${c.style.top}) 尺寸${c.style.width}x${c.style.height} 字号${c.style.fontSize} 颜色${c.style.color} 背景${c.style.backgroundColor}`,
        ).join('\n')
    } else {
        canvasContext += '\n画布为空。'
    }

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10),
        { role: 'user', content: `${prompt}\n\n【画布状态】\n${canvasContext}` },
    ]

    try {
        const providerPool = createProviderPool(AI_PROVIDERS, { logger: console })
        const { response } = await providerPool.fetchChat({
            messages,
            tools: LEGACY_CHAT_TOOLS,
            tool_choice: 'required',
            temperature: 0.7,
            max_tokens: CHAT_MAX_OUTPUT_TOKENS,
        })
        const data = await response.json()
        const message = data.choices?.[0]?.message

        if (!message?.tool_calls?.length) {
            return res.json({ reply: message?.content || '抱歉，我没有理解你的需求', actions: [] })
        }

        // 解析 tool_calls
        const result = { reply: '', actions: [] }

        for (const toolCall of message.tool_calls) {
            let args
            try {
                args = JSON.parse(toolCall.function.arguments)
            } catch {
                // LLM 返回非法 JSON 时跳过该工具调用，避免 500
                console.error('[AI] 工具参数 JSON 解析失败:', toolCall.function.name)
                continue
            }

            switch (toolCall.function.name) {
                case 'ask_question':
                    result.question = args.question || ''
                    result.reply = args.question || ''
                    result.suggestions = args.suggestions || []
                    break

                case 'propose_options':
                    result.reply = args.reply || ''
                    result.options = (args.options || []).map(opt => ({
                        id: opt.id || nanoid(6),
                        title: opt.title || '方案',
                        description: opt.description || '',
                        tag: opt.tag || '',
                    }))
                    break

                case 'confirm_plan':
                    result.reply = args.summary || ''
                    result.plan = {
                        summary: args.summary || '',
                        details: args.details || [],
                    }
                    break

                case 'generate_page':
                    result.reply = args.reply || '页面已生成'
                    result.actions.push({
                        type: 'generate',
                        components: (args.components || []).map(normalizeComponent),
                        canvasStyle: {
                            width: args.canvasStyle?.width || canvasW,
                            height: args.canvasStyle?.height || canvasH,
                            scale: 100,
                            color: args.canvasStyle?.color || '#000',
                            opacity: args.canvasStyle?.opacity ?? 100,
                            backgroundColor: args.canvasStyle?.backgroundColor || '#ffffff',
                            fontSize: args.canvasStyle?.fontSize || 14,
                        },
                    })
                    break

                case 'edit_page':
                    result.reply = args.reply || '已修改'
                    for (const op of args.operations || []) {
                        if (op.type === 'add' && op.component) {
                            result.actions.push({ type: 'add', component: normalizeComponent(op.component, result.actions.length) })
                        } else if (op.type === 'modify' && op.id) {
                            result.actions.push({ type: 'modify', id: op.id, style: op.style, propValue: op.propValue })
                        } else if (op.type === 'delete' && op.id) {
                            result.actions.push({ type: 'delete', id: op.id })
                        } else if (op.type === 'move' && op.id) {
                            result.actions.push({ type: 'move', id: op.id, top: op.top, left: op.left })
                        }
                    }
                    break
            }
        }

        res.json(result)
    } catch (err) {
        console.error('[AI] Error:', err)
        res.status(500).json({ error: '生成失败，请稍后重试' })
    }
})

export default router

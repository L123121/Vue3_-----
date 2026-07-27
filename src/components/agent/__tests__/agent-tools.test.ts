import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeTool } from '../../../../server/agent/agentTools.js'
import { validateCanvas } from '../../../../server/agent/canvasValidator.js'
import { runAgentLoop } from '../../../../server/agent/agentRunner.js'
import { normalizeFunctionDecision } from '../../../../server/agent/outputParser.js'
import { buildInitialMessages } from '../../../../server/agent/promptBuilder.js'

function createComponent(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        component: 'VText',
        label: id,
        icon: '',
        propValue: id,
        style: {
            width: 120,
            height: 40,
            top: 10,
            left: 10,
            rotate: 0,
            opacity: 1,
        },
        parentId: null,
        slot: 'default',
        zIndex: 1,
        animations: [],
        events: {},
        groupStyle: {},
        isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
        ...overrides,
    }
}

const canvasStyle = {
    width: 375,
    height: 667,
    scale: 100,
    color: '#000',
    opacity: 1,
    backgroundColor: '#fff',
    fontSize: 14,
}

function createSession(selectedComponentIds: string[] = []) {
    return {
        currentDimension: '',
        selectedComponentIds,
        decisions: {},
    }
}

describe('Agent canvas tools', () => {
    it('观察画布时返回真实组件和选中组件', () => {
        const components = [createComponent('title'), createComponent('button')]
        const result = executeTool('observe_canvas', {}, components, canvasStyle, createSession(['button']))
        const observation = result.observation as unknown as {
            canvas: { componentCount: number }
            selectedComponentIds: string[]
            selectedComponents: Array<{ id: string }>
        }

        expect(observation.canvas.componentCount).toBe(2)
        expect(observation.selectedComponentIds).toEqual(['button'])
        expect(observation.selectedComponents[0].id).toBe('button')
    })

    it('移动组件后返回更新后的观察结果', () => {
        const result = executeTool(
            'move_component',
            { id: 'title', top: 80, left: 60 },
            [createComponent('title')],
            canvasStyle,
            createSession(),
        )
        const observation = result.observation as unknown as { component: { id: string } }

        expect(result.preview[0].style.top).toBe(80)
        expect(result.preview[0].style.left).toBe(60)
        expect(observation.component.id).toBe('title')
    })

    it('删除父组件时级联删除子组件', () => {
        const components = [
            createComponent('group', { component: 'Group' }),
            createComponent('child', { parentId: 'group' }),
            createComponent('other'),
        ]
        const result = executeTool(
            'delete_component',
            { id: 'group' },
            components,
            canvasStyle,
            createSession(),
        )
        const observation = result.observation as unknown as { deletedComponentIds: string[] }

        expect(result.preview.map((component: { id: string }) => component.id)).toEqual(['other'])
        expect(observation.deletedComponentIds).toEqual(expect.arrayContaining(['group', 'child']))
    })
})

describe('Agent canvas validator', () => {
    it('识别重复 ID、非法尺寸和越界组件', () => {
        const report = validateCanvas([
            createComponent('same'),
            createComponent('same', {
                style: { width: 0, height: 40, top: 10, left: 10 },
            }),
            createComponent('outside', {
                style: { width: 100, height: 40, top: 650, left: 330 },
            }),
        ], canvasStyle)

        expect(report.valid).toBe(false)
        expect(report.errors.map(issue => issue.code)).toEqual(expect.arrayContaining(['DUPLICATE_ID', 'INVALID_SIZE']))
        expect(report.warnings.map(issue => issue.code)).toContain('OUT_OF_BOUNDS')
    })

    it('识别两个内容组件的严重重叠', () => {
        const report = validateCanvas([
            createComponent('first'),
            createComponent('second', {
                style: { width: 120, height: 40, top: 12, left: 12 },
            }),
        ], canvasStyle)

        expect(report.warnings.map(issue => issue.code)).toContain('SEVERE_OVERLAP')
    })
})
afterEach(() => {
    vi.unstubAllGlobals()
})

describe('Agent runner validation', () => {
    it('画布未变化时跳过模型重复请求的 observe_canvas', async () => {
        const responses = [
            {
                choices: [{
                    message: {
                        content: '',
                        tool_calls: [{
                            function: {
                                name: 'observe_canvas',
                                arguments: '{}',
                            },
                        }],
                    },
                }],
            },
            {
                choices: [{
                    message: {
                        content: '',
                        tool_calls: [{
                            function: {
                                name: 'finish',
                                arguments: JSON.stringify({ summary: '检查完成' }),
                            },
                        }],
                    },
                }],
            },
        ]
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => responses.shift(),
            text: async () => '',
        }))
        const send = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const result = await runAgentLoop({
            config: { baseUrl: 'https://example.test/v1', apiKey: 'test', model: 'test-model' },
            session: {
                currentCanvas: [createComponent('existing')],
                canvasStyle,
                currentDimension: '',
                selectedComponentIds: [],
                history: [],
                decisions: {},
            } as any,
            userInput: { type: 'free_text', value: '检查当前画布' },
            send,
            signal: undefined,
        }) as any

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(result.done).toBe(true)
        expect(result.steps.filter((step: any) => (
            step.type === 'tool_call' && step.toolName === 'observe_canvas'
        ))).toHaveLength(1)
        expect(send.mock.calls.some(([event, data]) => (
            event === 'thinking_delta' && String(data.text).includes('observe_canvas')
        ))).toBe(false)
    })

    it('空画布首次创作会在执行工具前要求用户确认方向', async () => {
        const addComponentResponse = {
            choices: [{
                message: {
                    content: '',
                    tool_calls: [{
                        function: {
                            name: 'add_component',
                            arguments: JSON.stringify({
                                component: 'VText',
                                label: '主标题',
                                propValue: '街舞社招新',
                                style: { width: 300, height: 60, top: 60, left: 38 },
                            }),
                        },
                    }],
                },
            }],
        }
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => addComponentResponse,
            text: async () => '',
        }))
        vi.stubGlobal('fetch', fetchMock)

        const result = await runAgentLoop({
            config: { baseUrl: 'https://example.test/v1', apiKey: 'test', model: 'test-model' },
            session: {
                currentCanvas: [],
                canvasStyle,
                currentDimension: '',
                selectedComponentIds: [],
                history: [],
                decisions: {},
            } as any,
            userInput: { type: 'free_text', value: '做个海报' },
            send: undefined,
            signal: undefined,
        }) as any

        const choiceStep = result.steps.at(-1)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(result.preview).toEqual([])
        expect(result.waitingForInput).toBe(true)
        expect(choiceStep).toMatchObject({ type: 'user_input', status: 'pending' })
        expect(choiceStep.cards).toHaveLength(3)
    })

    it('修复轮次耗尽后不会把错误画布标记为完成', async () => {
        const finishResponse = {
            choices: [{
                message: {
                    content: '',
                    tool_calls: [{
                        function: {
                            name: 'finish',
                            arguments: JSON.stringify({ summary: '任务完成' }),
                        },
                    }],
                },
            }],
        }
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => finishResponse,
            text: async () => '',
        }))
        vi.stubGlobal('fetch', fetchMock)

        const result = await runAgentLoop({
            config: { baseUrl: 'https://example.test/v1', apiKey: 'test', model: 'test-model' },
            session: {
                currentCanvas: [createComponent('invalid', {
                    style: { width: 0, height: 40, top: 10, left: 10 },
                })],
                canvasStyle,
                currentDimension: '',
                selectedComponentIds: [],
                history: [],
            } as any,
            userInput: { type: 'free_text', value: '完成页面' },
            send: undefined,
            signal: undefined,
        }) as any

        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(result.done).toBe(false)
        expect(result.validation.errors.map((issue: { code: string }) => issue.code)).toContain('INVALID_SIZE')
        expect(result.steps.at(-1)).toMatchObject({ type: 'done', status: 'error' })
    })
})

describe('Agent decision continuity', () => {
    it('模型未提供完整选项时补齐可点击卡片', () => {
        const decision = normalizeFunctionDecision('ask_user', {
            question: '选择下一步',
            options: ['保持当前方向'],
        }) as any

        expect(decision.options.length).toBeGreaterThanOrEqual(2)
        expect(decision.options[0]).toMatchObject({
            id: 'option_1',
            title: '保持当前方向',
        })
    })

    it('卡片选择后的消息仍包含首次用户目标', () => {
        const messages = buildInitialMessages({
            selectedComponentIds: [],
            history: [{
                round: 1,
                userInput: { type: 'free_text', value: '做一个街舞社招新海报' },
                steps: [{
                    id: 'input_1',
                    type: 'user_input',
                    title: '开始搭建前，先确认你更看重哪个方向？',
                    status: 'success',
                    selectedValue: '优先视觉表现',
                }],
                canvasAfter: [],
            }],
        } as any, {
            type: 'card_select',
            value: '优先视觉表现',
            cardId: 'visual_first',
        }, { canvas: { componentCount: 0 } })
        const content = messages.at(-1)?.content || ''

        expect(content).toContain('做一个街舞社招新海报')
        expect(content).toContain('优先视觉表现')
    })
})

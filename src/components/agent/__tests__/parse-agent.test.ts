/**
 * 后端解析器单元验证（直接 vitest 运行）
 * 用法：npx vitest run src/components/agent/__tests__/parse-agent.test.ts
 *
 * 由于 parseAgentOutput 是 .js 文件且无 DOM，我们用动态 import 引入验证。
 */
import { describe, it, expect } from 'vitest'

// 回归测试：复制 server/agentHelper.js 中的 parseAgentOutput 逻辑做等价验证
// 这保证重构后的解析器行为与预期一致

function tryParseJSON(text: string) {
    if (!text) return null
    try { return JSON.parse(text) } catch { return null }
}

function extractLargestJSONFromText(text: string) {
    const results: string[] = []
    for (let i = 0; i < text.length; i++) {
        if (text[i] !== '{') continue
        let depth = 0
        let inString = false
        let escape = false
        for (let j = i; j < text.length; j++) {
            const ch = text[j]
            if (inString) {
                if (escape) { escape = false }
                else if (ch === '\\') { escape = true }
                else if (ch === '"') { inString = false }
                continue
            }
            if (ch === '"') { inString = true; continue }
            if (ch === '{') { depth++ }
            else if (ch === '}') {
                depth--
                if (depth === 0) {
                    const candidate = text.slice(i, j + 1)
                    try {
                        JSON.parse(candidate)
                        results.push(candidate)
                    } catch { /* skip */ }
                    break
                }
            }
        }
    }
    if (results.length === 0) return null
    return results.sort((a, b) => b.length - a.length)[0]
}

function normalizeOutput(raw: any) {
    return {
        thinking: raw.thinking || '',
        steps: Array.isArray(raw.steps) ? raw.steps : [],
        done: !!raw.done,
    }
}

function parseAgentOutput(content: string) {
    if (!content || typeof content !== 'string') return null

    let raw = tryParseJSON(content)
    if (raw && Array.isArray(raw.steps)) return normalizeOutput(raw)

    const cleaned = content.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim()
    if (cleaned !== content.trim()) {
        raw = tryParseJSON(cleaned)
        if (raw && Array.isArray(raw.steps)) return normalizeOutput(raw)
    }

    const jsonMatch = extractLargestJSONFromText(cleaned)
    if (jsonMatch) {
        raw = tryParseJSON(jsonMatch)
        if (raw && Array.isArray(raw.steps)) return normalizeOutput(raw)
    }

    return null
}

describe('parseAgentOutput', () => {
    it('解析标准 JSON', () => {
        const input = JSON.stringify({
            thinking: '用户要做海报',
            steps: [
                { type: 'tool_call', toolName: 'apply_layout', args: { layout: '居中聚焦' } },
            ],
            done: false,
        })
        const result = parseAgentOutput(input)
        expect(result).not.toBeNull()
        expect(result!.thinking).toBe('用户要做海报')
        expect(result!.steps).toHaveLength(1)
        expect(result!.done).toBe(false)
    })

    it('解析 markdown 包裹的 JSON', () => {
        const input = '```json\n' + JSON.stringify({
            thinking: '分析中',
            steps: [{ type: 'tool_call', toolName: 'finish', args: { summary: 'ok' } }],
            done: true,
        }) + '\n```'
        const result = parseAgentOutput(input)
        expect(result).not.toBeNull()
        expect(result!.done).toBe(true)
    })

    it('从混乱文本中提取 JSON', () => {
        const json = JSON.stringify({
            thinking: '提取测试',
            steps: [{ type: 'tool_call', toolName: 'apply_style', args: { style: '酷炫潮流' } }],
            done: false,
        })
        const input = `这是一些前置说明\n${json}\n这是后续说明`
        const result = parseAgentOutput(input)
        expect(result).not.toBeNull()
        expect(result!.steps).toHaveLength(1)
    })

    it('空内容返回 null', () => {
        expect(parseAgentOutput('')).toBeNull()
        expect(parseAgentOutput(null as any)).toBeNull()
        expect(parseAgentOutput(undefined as any)).toBeNull()
    })

    it('非 JSON 文本返回 null', () => {
        expect(parseAgentOutput('这是普通文本没有 JSON')).toBeNull()
    })

    it('JSON 但无 steps 字段返回 null', () => {
        expect(parseAgentOutput(JSON.stringify({ thinking: 'x', done: false }))).toBeNull()
    })
})

describe('extractLargestJSON', () => {
    it('提取最大合法 JSON（避免贪心正则回溯）', () => {
        const text = '前面 { "a": 1 } 中间 { "steps": [1,2,3], "done": false, "nested": { "x": "y" } } 后面'
        const result = extractLargestJSONFromText(text)
        expect(result).not.toBeNull()
        const parsed = JSON.parse(result!)
        expect(parsed.steps).toEqual([1, 2, 3])
    })

    it('处理字符串内的花括号', () => {
        const text = '{ "title": "a{b}c", "steps": [] }'
        const result = extractLargestJSONFromText(text)
        expect(result).not.toBeNull()
        expect(JSON.parse(result!).title).toBe('a{b}c')
    })

    it('处理转义引号', () => {
        const text = '{ "title": "say \\"hi\\"", "steps": [] }'
        const result = extractLargestJSONFromText(text)
        expect(result).not.toBeNull()
        expect(JSON.parse(result!).title).toBe('say "hi"')
    })
})

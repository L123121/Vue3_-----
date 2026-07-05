import { describe, it, expect } from 'vitest'
import { exportToHtml } from '@/utils/exportHtml'
import type { ComponentData, CanvasStyleData } from '@/types'

function makeComponent(overrides: Partial<ComponentData> = {}): ComponentData {
    return {
        id: 'comp-1',
        component: 'VText',
        label: '文字',
        icon: '',
        propValue: 'Hello World',
        style: { width: 200, height: 50, top: 100, left: 100, rotate: 0, fontSize: 16, color: '#333' },
        animations: [],
        events: {},
        groupStyle: {},
        isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
        ...overrides,
    } as ComponentData
}

const canvasStyle: CanvasStyleData = {
    width: 1200, height: 740, scale: 100,
    color: '#000', opacity: 1, backgroundColor: '#fff', fontSize: 14,
}

describe('exportToHtml - HTML 导出引擎', () => {
    it('导出有效 HTML 文档字符串', () => {
        const html = exportToHtml({
            title: '测试页面',
            componentData: [makeComponent()],
            canvasStyle,
        })
        expect(html).toContain('<!DOCTYPE html>')
        expect(html).toContain('<title>测试页面</title>')
    })

    it('包含画布尺寸(内联样式)', () => {
        const html = exportToHtml({ title: '', componentData: [makeComponent()], canvasStyle })
        expect(html).toContain('width:1200px')
        expect(html).toContain('height:740px')
    })

    it('包含组件内容和样式', () => {
        const html = exportToHtml({ title: '', componentData: [makeComponent()], canvasStyle })
        expect(html).toContain('Hello World')
        expect(html).toContain('font-size: 16px')
        expect(html).toContain('color: #333')
        expect(html).toContain('top: 100px')
        expect(html).toContain('left: 100px')
    })

    it('包含动画关键帧标记', () => {
        const html = exportToHtml({ title: '', componentData: [makeComponent()], canvasStyle })
        expect(html).toContain('@keyframes fadeIn')
        expect(html).toContain('@keyframes bounceIn')
    })

    it('XSS 防护: propValue 中的 HTML 被转义', () => {
        const html = exportToHtml({
            title: '',
            componentData: [makeComponent({ propValue: '<script>alert("xss")</script>' })],
            canvasStyle,
        })
        expect(html).toContain('&lt;script&gt;')
        expect(html).not.toContain('<script>alert')
    })

    it('VButton 事件绑定生成 data-event 属性', () => {
        const html = exportToHtml({
            title: '',
            componentData: [makeComponent({
                component: 'VButton',
                events: { redirect: 'https://example.com' },
            })],
            canvasStyle,
        })
        expect(html).toContain('data-event-type="redirect"')
        expect(html).toContain('data-event-param="https://example.com"')
    })

    it('带动画的组件含 animation class', () => {
        const html = exportToHtml({
            title: '',
            componentData: [makeComponent({
                animations: [{ type: 'fadeIn', duration: 1000, delay: 0, iterationNum: 1, infinite: false, applyTo: 'enter' }],
            })],
            canvasStyle,
        })
        expect(html).toContain('fadeIn')
    })

    it('空组件数组生成空画布', () => {
        const html = exportToHtml({ title: '', componentData: [], canvasStyle })
        expect(html).toContain('<!DOCTYPE html>')
    })

    it('默认标题为"低代码页面"', () => {
        const html = exportToHtml({ componentData: [makeComponent()], canvasStyle })
        expect(html).toContain('<title>低代码页面</title>')
    })

    it('画布背景色正确', () => {
        const html = exportToHtml({
            title: '',
            componentData: [makeComponent()],
            canvasStyle: { ...canvasStyle, backgroundColor: '#1a1a2e' },
        })
        expect(html).toContain('background: #1a1a2e')
    })
})
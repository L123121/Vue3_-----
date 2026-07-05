import { describe, it, expect, vi, beforeEach } from 'vitest'
import { events, eventList } from '@/utils/events'

describe('events.redirect - 跳转事件', () => {
    beforeEach(() => {
        // 模拟 window.open
        vi.spyOn(window, 'open').mockImplementation(() => null)
    })

    it('https URL 打开新窗口', () => {
        events.redirect('https://example.com')
        expect(window.open).toHaveBeenCalledWith(
            'https://example.com', '_blank', 'noopener,noreferrer',
        )
    })

    it('空 URL 不跳转', () => {
        events.redirect('')
        expect(window.open).not.toHaveBeenCalled()
    })

    it('javascript: 协议不跳转', () => {
        events.redirect('javascript:alert(1)')
        expect(window.open).not.toHaveBeenCalled()
    })

    it('相对路径跳转', () => {
        events.redirect('/page/1')
        expect(window.open).toHaveBeenCalled()
    })
})

describe('events.alert - alert 事件', () => {
    beforeEach(() => {
        vi.spyOn(window, 'alert').mockImplementation(() => {})
    })

    it('有消息时弹窗', () => {
        events.alert('Hello')
        expect(window.alert).toHaveBeenCalledWith('Hello')
    })

    it('空消息不弹窗', () => {
        events.alert('')
        expect(window.alert).not.toHaveBeenCalled()
    })
})

describe('eventList - 事件列表', () => {
    it('包含跳转和 alert 事件', () => {
        const keys = eventList.map(e => e.key)
        expect(keys).toContain('redirect')
        expect(keys).toContain('alert')
    })

    it('每个事件项有 label 和 event 函数', () => {
        eventList.forEach(item => {
            expect(typeof item.label).toBe('string')
            expect(typeof item.event).toBe('function')
        })
    })
})
/**
 * eventBus 事件总线测试
 */
import { describe, it, expect, vi } from 'vitest'
import eventBus from '@/utils/eventBus'

describe('eventBus - 发布订阅', () => {
    it('on + emit 基础功能', () => {
        const fn = vi.fn()
        eventBus.on('save', fn)
        eventBus.emit('save')
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('emit 传递参数', () => {
        const fn = vi.fn()
        eventBus.on('preview', fn)
        eventBus.emit('preview', true)
        expect(fn).toHaveBeenCalledWith(true)
    })

    it('off 取消指定监听器', () => {
        const fn = vi.fn()
        eventBus.on('save', fn)
        eventBus.off('save', fn)
        eventBus.emit('save')
        expect(fn).not.toHaveBeenCalled()
    })

    it('off 不传 callback 清空该事件所有监听器', () => {
        const fn1 = vi.fn()
        const fn2 = vi.fn()
        eventBus.on('save', fn1)
        eventBus.on('save', fn2)
        eventBus.off('save')
        eventBus.emit('save')
        expect(fn1).not.toHaveBeenCalled()
        expect(fn2).not.toHaveBeenCalled()
    })

    it('多个监听器依次触发', () => {
        const order: number[] = []
        eventBus.on('save', () => order.push(1))
        eventBus.on('save', () => order.push(2))
        eventBus.emit('save')
        expect(order).toEqual([1, 2])
    })

    it('未注册的事件 emit 不报错', () => {
        expect(() => eventBus.emit('save')).not.toThrow()
    })

    it('once 一次性订阅', () => {
        const fn = vi.fn()
        eventBus.once('save', fn)
        eventBus.emit('save')
        eventBus.emit('save')
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('once 携带参数', () => {
        const fn = vi.fn()
        eventBus.once('preview', fn)
        eventBus.emit('preview', false)
        expect(fn).toHaveBeenCalledWith(false)
    })
})
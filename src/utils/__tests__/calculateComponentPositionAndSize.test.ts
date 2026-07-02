import { describe, it, expect } from 'vitest'
import calculateComponentPositionAndSize from '@/utils/calculateComponentPositionAndSize'
import type { ComponentStyle } from '@/types'

function baseStyle(overrides: Partial<ComponentStyle> = {}): ComponentStyle {
    return {
        top: 100, left: 100, width: 200, height: 100, rotate: 0,
        ...overrides,
    }
}

function point(x: number, y: number) { return { x, y } }

describe('calculateComponentPositionAndSize - 八点缩放', () => {
    describe('lt - 左上角(对角:rb)', () => {
        it('向左上拉伸', () => {
            const style = baseStyle()
            // lt(100,100) → 拖动到(50,50), 对角 rb(300,200)
            calculateComponentPositionAndSize('lt', style, point(50, 50), 0, false, {
                symmetricPoint: point(300, 200),
                curPoint: point(50, 50),
            })
            expect(style.left).toBe(50)
            expect(style.top).toBe(50)
            expect(style.width).toBeGreaterThan(200)
            expect(style.height).toBeGreaterThan(100)
        })
    })

    describe('rt - 右上角(对角:lb)', () => {
        it('向右上拉伸', () => {
            const style = baseStyle()
            // rt(300,100) → 拖动到(350,50), 对角 lb(100,200)
            calculateComponentPositionAndSize('rt', style, point(350, 50), 0, false, {
                symmetricPoint: point(100, 200),
                curPoint: point(350, 50),
            })
            expect(style.left).toBe(100)     // leftFrom='sym'
            expect(style.top).toBe(50)       // topFrom='cur'
            expect(style.width).toBeGreaterThan(200)
            expect(style.height).toBeGreaterThan(100)
        })
    })

    describe('rb - 右下角(对角:lt)', () => {
        it('向右下拉伸', () => {
            const style = baseStyle()
            // rb(300,200) → 拖动到(350,250), 对角 lt(100,100)
            calculateComponentPositionAndSize('rb', style, point(350, 250), 0, false, {
                symmetricPoint: point(100, 100),
                curPoint: point(350, 250),
            })
            expect(style.left).toBe(100)
            expect(style.top).toBe(100)
            expect(style.width).toBeGreaterThan(200)
            expect(style.height).toBeGreaterThan(100)
        })
    })

    describe('lb - 左下角(对角:rt)', () => {
        it('向左下拉伸', () => {
            const style = baseStyle()
            // lb(100,200) → 拖动到(50,250), 对角 rt(300,100)
            calculateComponentPositionAndSize('lb', style, point(50, 250), 0, false, {
                symmetricPoint: point(300, 100),
                curPoint: point(50, 250),
            })
            expect(style.left).toBe(50)
            expect(style.top).toBe(100)
            expect(style.width).toBeGreaterThan(200)
            expect(style.height).toBeGreaterThan(100)
        })
    })

    describe('t - 上边缘(对称点:下边缘中点)', () => {
        it('向上拉伸', () => {
            const style = baseStyle()
            // 上边缘中点(200,100), 下边缘中点(200,200)
            // 拖动到 y=50
            calculateComponentPositionAndSize('t', style, point(200, 50), 0, false, {
                symmetricPoint: point(200, 200), // 下边缘中点
                curPoint: point(200, 100),       // 上边缘中点(拖前)
            })
            expect(style.height).toBeGreaterThan(100)
            expect(style.top).toBeLessThan(100)
        })
    })

    describe('b - 下边缘(对称点:上边缘中点)', () => {
        it('向下拉伸', () => {
            const style = baseStyle()
            calculateComponentPositionAndSize('b', style, point(200, 300), 0, false, {
                symmetricPoint: point(200, 100),
                curPoint: point(200, 200),
            })
            expect(style.height).toBeGreaterThan(100)
            expect(style.top).toBe(100) // topFrom='sym' → 不变
        })
    })

    describe('r - 右边缘', () => {
        it('向右拉伸后宽高 > 0', () => {
            const style = baseStyle()
            calculateComponentPositionAndSize('r', style, point(400, 150), 0, false, {
                symmetricPoint: point(200, 200),
                curPoint: point(200, 150),
            })
            expect(style.width).toBeGreaterThan(0)
            expect(style.height).toBeGreaterThan(0)
        })
    })

    describe('l - 左边缘', () => {
        it('向左拉伸后宽高 > 0', () => {
            const style = baseStyle()
            calculateComponentPositionAndSize('l', style, point(50, 150), 0, false, {
                symmetricPoint: point(200, 100),
                curPoint: point(200, 150),
            })
            expect(style.width).toBeGreaterThan(0)
            expect(style.height).toBeGreaterThan(0)
        })
    })

    describe('比例锁定', () => {
        it('rb 拖动时宽高比接近正方形', () => {
            const style = baseStyle({ width: 200, height: 200 })
            // rb(300,300) → 拖动到(350,250), 对角 lt(100,100)
            // 期望比例 ~1:1
            calculateComponentPositionAndSize('rb', style, point(350, 250), 1, true, {
                symmetricPoint: point(100, 100),
                curPoint: point(350, 250),
            })
            const ratio = style.width / style.height
            expect(ratio).toBeGreaterThan(0.5)
            expect(ratio).toBeLessThan(2)
        })
    })

    describe('旋转后缩放', () => {
        it('90° 旋转时 rb 拖动, 宽高 > 0', () => {
            const style = baseStyle({ rotate: 90 })
            calculateComponentPositionAndSize('rb', style, point(350, 250), 0, false, {
                symmetricPoint: point(100, 100),
                curPoint: point(350, 250),
            })
            expect(style.width).toBeGreaterThan(0)
            expect(style.height).toBeGreaterThan(0)
        })
    })

    describe('边界情况', () => {
        it('缩小尺寸', () => {
            const style = baseStyle()
            calculateComponentPositionAndSize('rb', style, point(250, 150), 0, false, {
                symmetricPoint: point(100, 100),
                curPoint: point(250, 150),
            })
            expect(style.width).toBeLessThan(200)
            expect(style.height).toBeLessThan(100)
        })

        it('拖动到负值区域', () => {
            const style = baseStyle()
            calculateComponentPositionAndSize('lt', style, point(-50, -50), 0, false, {
                symmetricPoint: point(300, 200),
                curPoint: point(-50, -50),
            })
            expect(style.left).toBe(-50)
            expect(style.top).toBe(-50)
            expect(style.width).toBeGreaterThan(200)
        })
    })
})
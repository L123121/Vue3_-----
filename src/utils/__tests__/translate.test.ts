import { describe, it, expect } from 'vitest'
import {
    calculateRotatedPointCoordinate,
    getRotatedPointCoordinate,
    getCenterPoint,
    sin,
    cos,
    mod360,
    toPercent,
} from '@/utils/translate'

describe('translate - 旋转/坐标工具', () => {
    describe('calculateRotatedPointCoordinate', () => {
        it('0° 旋转应返回原坐标', () => {
            const p = calculateRotatedPointCoordinate({ x: 10, y: 20 }, { x: 5, y: 5 }, 0)
            expect(p.x).toBeCloseTo(10, 10)
            expect(p.y).toBeCloseTo(20, 10)
        })

        it('90° 旋转：点绕圆心转过四分之一圈', () => {
            // 圆心 (0,0)，点 (10,0)，逆时针 90° → (0,10)
            const p = calculateRotatedPointCoordinate({ x: 10, y: 0 }, { x: 0, y: 0 }, 90)
            expect(p.x).toBeCloseTo(0, 6)
            expect(p.y).toBeCloseTo(10, 6)
        })

        it('180° 旋转：点关于圆心对称', () => {
            const p = calculateRotatedPointCoordinate({ x: 10, y: 10 }, { x: 0, y: 0 }, 180)
            expect(p.x).toBeCloseTo(-10, 6)
            expect(p.y).toBeCloseTo(-10, 6)
        })

        it('旋转不改变到圆心的距离', () => {
            const center = { x: 3, y: 7 }
            const point = { x: 13, y: 2 }
            const r0 = Math.hypot(point.x - center.x, point.y - center.y)
            const rotated = calculateRotatedPointCoordinate(point, center, 37)
            const r1 = Math.hypot(rotated.x - center.x, rotated.y - center.y)
            expect(r1).toBeCloseTo(r0, 10)
        })
    })

    describe('getRotatedPointCoordinate - 八个控制点', () => {
        const style = { left: 0, top: 0, width: 100, height: 50, rotate: 0 }
        const center = { x: 50, y: 25 }

        it('0° 时 lt 点 = 左上角 (0,0)', () => {
            const p = getRotatedPointCoordinate(style, center, 'lt')
            expect(p.x).toBeCloseTo(0, 10)
            expect(p.y).toBeCloseTo(0, 10)
        })

        it('0° 时 rb 点 = 右下角 (100,50)', () => {
            const p = getRotatedPointCoordinate(style, center, 'rb')
            expect(p.x).toBeCloseTo(100, 10)
            expect(p.y).toBeCloseTo(50, 10)
        })

        it('0° 时 t 点 = 上中 (50,0)', () => {
            const p = getRotatedPointCoordinate(style, center, 't')
            expect(p.x).toBeCloseTo(50, 10)
            expect(p.y).toBeCloseTo(0, 10)
        })

        it('未知点名 default 走 rb 分支', () => {
            const p = getRotatedPointCoordinate(style, center, 'zzz' as never)
            expect(p.x).toBeCloseTo(100, 10)
            expect(p.y).toBeCloseTo(50, 10)
        })

        it('90° 旋转后 lt 点绕中心转动', () => {
            const rotated = getRotatedPointCoordinate({ ...style, rotate: 90 }, center, 'lt')
            // lt(0,0) 绕 center(50,25) 旋转 90°：
            //   nx = cos90*(0-50) - sin90*(0-25) + 50 = 0 - (-25) + 50 = 75
            //   ny = sin90*(0-50) + cos90*(0-25) + 25 = -50 + 0 + 25 = -25
            expect(rotated.x).toBeCloseTo(75, 6)
            expect(rotated.y).toBeCloseTo(-25, 6)
        })
    })

    describe('getCenterPoint', () => {
        it('返回两点的中点', () => {
            const m = getCenterPoint({ x: 0, y: 0 }, { x: 10, y: 20 })
            expect(m).toEqual({ x: 5, y: 10 })
        })

        it('两点重合时中点即自身', () => {
            const m = getCenterPoint({ x: 4, y: 4 }, { x: 4, y: 4 })
            expect(m).toEqual({ x: 4, y: 4 })
        })
    })

    describe('sin / cos（取绝对值）', () => {
        it('0° 的 sin=0, cos=1', () => {
            expect(sin(0)).toBeCloseTo(0, 10)
            expect(cos(0)).toBeCloseTo(1, 10)
        })

        it('90° 的 sin=1, cos=0', () => {
            expect(sin(90)).toBeCloseTo(1, 10)
            expect(cos(90)).toBeCloseTo(0, 10)
        })

        it('负角度取绝对值，与正角度一致', () => {
            expect(sin(-90)).toBeCloseTo(sin(90), 10)
            expect(cos(-45)).toBeCloseTo(cos(45), 10)
        })
    })

    describe('mod360', () => {
        it('正角度原值返回', () => {
            expect(mod360(90)).toBe(90)
        })

        it('大于 360 取模', () => {
            expect(mod360(450)).toBe(90)
            expect(mod360(720)).toBe(0)
        })

        it('负角度归一化到 0-360', () => {
            expect(mod360(-90)).toBe(270)
            expect(mod360(-360)).toBe(0)
        })
    })

    describe('toPercent', () => {
        it('0.5 → "50%"', () => {
            expect(toPercent(0.5)).toBe('50%')
        })

        it('1 → "100%"', () => {
            expect(toPercent(1)).toBe('100%')
        })
    })
})

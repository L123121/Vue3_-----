import { describe, it, expect } from 'vitest'
import {
    getShapeStyle,
    getSVGStyle,
    getStyle,
    getComponentRotatedStyle,
    getCanvasStyle,
    createGroupStyle,
} from '@/utils/style'
import type { ComponentStyle, ComponentData, CanvasStyleData } from '@/types'

describe('getShapeStyle - 基础形状样式', () => {
    it('width/height/top/left 加 px, rotate 转为 transform', () => {
        const result = getShapeStyle({ width: 100, height: 50, top: 20, left: 30, rotate: 45 })
        expect(result).toEqual({
            width: '100px',
            height: '50px',
            top: '20px',
            left: '30px',
            transform: 'rotate(45deg)',
        })
    })

    it('缺失字段返回空字符串', () => {
        const result = getShapeStyle({})
        expect(result).toEqual({
            width: '',
            height: '',
            top: '',
            left: '',
            transform: 'rotate(0deg)',
        })
    })

    it('rotate 为 undefined 时默认为 0', () => {
        const result = getShapeStyle({ width: 10, height: 10, top: 0, left: 0 })
        expect(result.transform).toBe('rotate(0deg)')
    })
})

describe('getSVGStyle - SVG 组件样式', () => {
    it('基本 SVG 样式含单位', () => {
        const result = getSVGStyle({ width: 200, height: 100, top: 10, left: 20, fontSize: 14, color: 'red', rotate: 0 })
        expect(result.width).toBe('200px')
        expect(result.height).toBe('100px')
        expect(result.top).toBe('10px')
        expect(result.left).toBe('20px')
        expect(result.fontSize).toBe('14px')
        expect(result.color).toBe('red')
        expect(result.transform).toBe('rotate(0deg)')
    })

    it('过滤指定属性', () => {
        const result = getSVGStyle({ width: 100, height: 50, top: 0, left: 0, fontSize: 14, color: 'red' }, ['fontSize', 'color'])
        expect(result.fontSize).toBeUndefined()
        expect(result.color).toBeUndefined()
        expect(result.width).toBe('100px')
    })

    it('空字符串值被跳过', () => {
        const result = getSVGStyle({ width: 100, height: 50, top: 0, left: 0, fontSize: undefined, color: '' })
        expect(result.fontSize).toBeUndefined()
        expect(result.color).toBeUndefined()
    })
})

describe('getStyle - 通用样式', () => {
    it('遍历所有属性,需要单位的字段加 px', () => {
        const result = getStyle({ width: 100, height: 50, top: 10, fontSize: 14, color: '#333', opacity: 0.8 })
        expect(result.width).toBe('100px')
        expect(result.height).toBe('50px')
        expect(result.top).toBe('10px')
        expect(result.fontSize).toBe('14px')
        expect(result.color).toBe('#333')
        expect(result.opacity).toBe(0.8)
    })

    it('过滤指定属性不输出', () => {
        const result = getStyle({ width: 100, height: 50, color: '#333' }, ['color'])
        expect(result.color).toBeUndefined()
        expect(result.width).toBe('100px')
    })

    it('rotate 转为 transform', () => {
        const result = getStyle({ width: 100, height: 50, rotate: 90 })
        expect(result.transform).toBe('rotate(90deg)')
    })

    it('空字符串属性被跳过', () => {
        const result = getStyle({ width: 100, height: 50, color: '' })
        expect(result.color).toBeUndefined()
    })
})

describe('getComponentRotatedStyle - 旋转后边界计算', () => {
    it('0° 旋转: bottom/right 直接由 top+height / left+width 得出', () => {
        const result = getComponentRotatedStyle({ top: 10, left: 20, width: 100, height: 50, rotate: 0 })
        expect(result.top).toBe(10)
        expect(result.left).toBe(20)
        expect(result.width).toBe(100)
        expect(result.height).toBe(50)
        expect(result.bottom).toBe(60)    // top + height
        expect(result.right).toBe(120)    // left + width
    })

    it('90° 旋转: width 和 height 交换', () => {
        // width=100, height=50, rotate=90
        // newWidth = 100*cos90 + 50*sin90 = 0 + 50 = 50
        // newHeight = 50*cos90 + 100*sin90 = 0 + 100 = 100
        const result = getComponentRotatedStyle({ top: 10, left: 20, width: 100, height: 50, rotate: 90 })
        expect(result.width).toBeCloseTo(50, 6)
        expect(result.height).toBeCloseTo(100, 6)
    })

    it('180° 旋转: 宽度不变,边界位置改变', () => {
        const result = getComponentRotatedStyle({ top: 10, left: 20, width: 100, height: 50, rotate: 180 })
        // newWidth = 100*cos180 + 50*sin180 = -100 + 0 = 100(取绝对值?)
        // Actually sin(180) = 0, cos(180) = 1, 但 sin/cos 函数取绝对值!
        // 看 translate.ts: sin = Math.abs(Math.sin), cos = Math.abs(Math.cos)
        // 所以 sin(180°) = 0, cos(180°) = 1
        // newWidth = 100*1 + 50*0 = 100
        expect(result.width).toBeCloseTo(100, 6)
        expect(result.height).toBeCloseTo(50, 6)
    })

    it('rotate 为 undefined 时按未旋转处理', () => {
        const result = getComponentRotatedStyle({ top: 0, left: 0, width: 200, height: 100 } as ComponentStyle)
        expect(result.bottom).toBe(100)
        expect(result.right).toBe(200)
    })
})

describe('getCanvasStyle - 画布样式', () => {
    it('过滤 width/height/scale, 保留其余字段', () => {
        const canvas: CanvasStyleData = {
            width: 1200, height: 740, scale: 100,
            backgroundColor: '#fff', color: '#333', opacity: 1, fontSize: 14,
        }
        const result = getCanvasStyle(canvas)
        expect(result.width).toBeUndefined()
        expect(result.height).toBeUndefined()
        expect(result.scale).toBeUndefined()
        expect(result.backgroundColor).toBe('#fff')
        expect(result.color).toBe('#333')
        expect(result.opacity).toBe(1)
        expect(result.fontSize).toBe('14px')
    })

    it('空画布样式返回空对象', () => {
        const result = getCanvasStyle({} as CanvasStyleData)
        expect(result).toEqual({})
    })
})

describe('createGroupStyle - 组合组件百分比坐标', () => {
    function makeComponent(overrides: Partial<ComponentData>): ComponentData {
        return {
            id: 'c1',
            component: 'VText',
            label: '',
            icon: '',
            propValue: 'text',
            style: { width: 100, height: 50, top: 20, left: 30 },
            animations: [],
            events: {},
            groupStyle: {},
            isLock: false,
            collapseName: 'style',
            linkage: { duration: 0, data: [] },
            ...overrides,
        } as ComponentData
    }

    it('子组件相对 Group 坐标转为百分比', () => {
        const groupComponent = makeComponent({
            id: 'group1',
            component: 'Group',
            style: { width: 400, height: 300, top: 100, left: 100 },
            propValue: [
                makeComponent({ id: 'child1', style: { width: 100, height: 50, top: 20, left: 30, rotate: 0 } }),
            ],
        })
        createGroupStyle(groupComponent)

        const groupStyle = (groupComponent.propValue as ComponentData[])[0].groupStyle
        // left = (30 - 100) / 400 = -17.5%
        // top = (20 - 100) / 300 = -26.67%
        // width = 100 / 400 = 25%
        // height = 50 / 300 = 16.67%
        expect(groupStyle.left).toBe('-17.5%')
        expect(groupStyle.top).toMatch(/^-26\.666/)
        expect(groupStyle.width).toBe('25%')
        expect(groupStyle.height).toMatch(/^16\.666/)
    })

    it('已有 groupStyle 时跳过重新计算', () => {
        const groupComponent = makeComponent({
            id: 'group1',
            component: 'Group',
            style: { width: 400, height: 300, top: 100, left: 100 },
            propValue: [
                makeComponent({ id: 'child1', groupStyle: { left: '10%' } }),
            ],
        })

        // 已有 groupStyle 不应被覆盖
        const child = (groupComponent.propValue as ComponentData[])[0]
        const original = { ...child.groupStyle }
        createGroupStyle(groupComponent)
        expect(child.groupStyle).toEqual(original)
    })
})

import { sin, cos, toPercent } from '@/utils/translate'
import type { ComponentStyle, ComponentData, CanvasStyleData } from '@/types'

/**
 * 需要添加 px 单位的样式属性
 */
const needUnit: (keyof ComponentStyle)[] = [
    'fontSize',
    'width',
    'height',
    'top',
    'left',
    'borderWidth',
    'letterSpacing',
    'borderRadius',
]

/**
 * 样式对象类型（CSS 样式）
 */
type CSSStyleResult = Record<string, string | number>

/**
 * 获取组件的基础形状样式
 * @param style 组件样式
 * @returns CSS 样式对象
 */
export function getShapeStyle(style: Partial<ComponentStyle>): CSSStyleResult {
    const result: CSSStyleResult = {}
  ;(['width', 'height', 'top', 'left', 'rotate'] as const).forEach(attr => {
        if (attr !== 'rotate') {
            result[attr] = style[attr] !== undefined ? `${style[attr]}px` : ''
        } else {
            result.transform = `rotate(${style[attr] ?? 0}deg)`
        }
    })
    return result
}

/**
 * 获取 SVG 组件的样式
 * @param style 组件样式
 * @param filter 需要过滤的属性
 * @returns CSS 样式对象
 */
export function getSVGStyle(
    style: Partial<ComponentStyle>,
    filter: (keyof ComponentStyle)[] = [],
): CSSStyleResult {
    const result: CSSStyleResult = {}

    const attrs: (keyof ComponentStyle)[] = [
        'opacity',
        'width',
        'height',
        'top',
        'left',
        'rotate',
        'fontSize',
        'fontWeight',
        'lineHeight',
        'letterSpacing',
        'textAlign',
        'color',
    ]

    attrs.forEach(key => {
        if (!filter.includes(key)) {
            if (key !== 'rotate') {
                if (style[key] !== undefined && style[key] !== '') {
                    result[key] = style[key] as string | number
                    if (needUnit.includes(key)) {
                        result[key] = `${style[key]}px`
                    }
                }
            } else {
                result.transform = `rotate(${style[key] ?? 0}deg)`
            }
        }
    })

    return result
}

/**
 * 获取组件的通用样式
 * @param style 组件样式
 * @param filter 需要过滤的属性
 * @returns CSS 样式对象
 */
export function getStyle(
    style: Partial<ComponentStyle>,
    filter: (keyof ComponentStyle)[] = [],
): CSSStyleResult {
    const result: CSSStyleResult = {}

    Object.keys(style).forEach(key => {
        const styleKey = key as keyof ComponentStyle
        if (!filter.includes(styleKey)) {
            if (styleKey !== 'rotate') {
                if (style[styleKey] !== undefined && style[styleKey] !== '') {
                    result[styleKey] = style[styleKey] as string | number
                    if (needUnit.includes(styleKey)) {
                        result[styleKey] = `${style[styleKey]}px`
                    }
                }
            } else {
                result.transform = `rotate(${style[styleKey] ?? 0}deg)`
            }
        }
    })

    return result
}

/**
 * 组件旋转后的扩展样式
 */
export interface RotatedStyle extends ComponentStyle {
  bottom: number
  right: number
}

/**
 * 获取一个组件旋转 rotate 后的样式
 * @param style 原始样式
 * @returns 旋转后的样式（包含边界信息）
 */
export function getComponentRotatedStyle(style: ComponentStyle): RotatedStyle {
    const newStyle = { ...style } as RotatedStyle

    if (newStyle.rotate !== 0 && newStyle.rotate !== undefined) {
        const newWidth = newStyle.width * cos(newStyle.rotate) + newStyle.height * sin(newStyle.rotate)
        const diffX = (newStyle.width - newWidth) / 2 // 旋转后范围变小是正值，变大是负值
        newStyle.left = (newStyle.left ?? 0) + diffX
        newStyle.right = (newStyle.left ?? 0) + newWidth

        const newHeight = newStyle.height * cos(newStyle.rotate) + newStyle.width * sin(newStyle.rotate)
        const diffY = (newHeight - newStyle.height) / 2 // 始终是正
        newStyle.top = (newStyle.top ?? 0) - diffY
        newStyle.bottom = (newStyle.top ?? 0) + newHeight

        newStyle.width = newWidth
        newStyle.height = newHeight
    } else {
        newStyle.bottom = (newStyle.top ?? 0) + newStyle.height
        newStyle.right = (newStyle.left ?? 0) + newStyle.width
    }

    return newStyle
}

/**
 * 画布样式中需要过滤的属性
 */
const filterKeys: (keyof CanvasStyleData)[] = ['width', 'height', 'scale']

/**
 * 获取画布样式
 * @param canvasStyleData 画布样式数据
 * @returns CSS 样式对象
 */
export function getCanvasStyle(canvasStyleData: CanvasStyleData): CSSStyleResult {
    const result: CSSStyleResult = {}

  ;(Object.keys(canvasStyleData) as (keyof CanvasStyleData)[])
        .filter(key => !filterKeys.includes(key))
        .forEach(key => {
            result[key] = canvasStyleData[key]
            if (key === 'fontSize') {
                result[key] = `${canvasStyleData[key]}px`
            }
        })

    return result
}

/**
 * 创建组合组件的样式
 * @param groupComponent 组合组件
 */
export function createGroupStyle(groupComponent: ComponentData): void {
    const parentStyle = groupComponent.style
    const components = groupComponent.propValue as ComponentData[]

    components.forEach(component => {
    // component.groupStyle 的 top left 是相对于 group 组件的位置
    // 如果已存在 component.groupStyle，说明已经计算过一次了。不需要再次计算
        if (!Object.keys(component.groupStyle).length) {
            const style = { ...component.style }

            if (component.component.startsWith('SVG')) {
                component.groupStyle = getSVGStyle(style)
            } else {
                component.groupStyle = getStyle(style)
            }

            component.groupStyle.left = toPercent(
                ((style.left ?? 0) - (parentStyle.left ?? 0)) / parentStyle.width,
            )
            component.groupStyle.top = toPercent(
                ((style.top ?? 0) - (parentStyle.top ?? 0)) / parentStyle.height,
            )
            component.groupStyle.width = toPercent(style.width / parentStyle.width)
            component.groupStyle.height = toPercent(style.height / parentStyle.height)
        }
    })
}

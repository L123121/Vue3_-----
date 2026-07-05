/* eslint-disable no-useless-escape, max-len */
/**
 * HTML 导出引擎
 *
 * 将画布组件数据（componentData）转换为自包含的独立 HTML 文件。
 * 导出的 HTML 无需任何外部依赖，双击即可在浏览器中打开。
 *
 * 功能：
 * - 所有组件样式内联（position: absolute 布局）
 * - 事件绑定（跳转链接、弹窗提示）
 * - 动画支持（内嵌 animate.css 关键帧）
 * - 嵌套组件（parentId 递归渲染）
 * - 图片资源以 URL 形式引用
 */

import type { ComponentData, CanvasStyleData, Animation } from '@/types'
import { escapeHtml, isValidImageUrl, isValidCssColor } from './sanitize'

// ==================== 嵌入的动画关键帧（animate.css 子集） ====================

const ANIMATION_KEYFRAMES = `
@-webkit-keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@-webkit-keyframes fadeInUp { from { opacity: 0; -webkit-transform: translate3d(0, 30px, 0); transform: translate3d(0, 30px, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@keyframes fadeInUp { from { opacity: 0; -webkit-transform: translate3d(0, 30px, 0); transform: translate3d(0, 30px, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@-webkit-keyframes fadeInDown { from { opacity: 0; -webkit-transform: translate3d(0, -30px, 0); transform: translate3d(0, -30px, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@keyframes fadeInDown { from { opacity: 0; -webkit-transform: translate3d(0, -30px, 0); transform: translate3d(0, -30px, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@-webkit-keyframes fadeInLeft { from { opacity: 0; -webkit-transform: translate3d(-30px, 0, 0); transform: translate3d(-30px, 0, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@keyframes fadeInLeft { from { opacity: 0; -webkit-transform: translate3d(-30px, 0, 0); transform: translate3d(-30px, 0, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@-webkit-keyframes fadeInRight { from { opacity: 0; -webkit-transform: translate3d(30px, 0, 0); transform: translate3d(30px, 0, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@keyframes fadeInRight { from { opacity: 0; -webkit-transform: translate3d(30px, 0, 0); transform: translate3d(30px, 0, 0); } to { opacity: 1; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@-webkit-keyframes bounceIn { from, 20%, 40%, 60%, 80%, to { -webkit-animation-timing-function: cubic-bezier(.215, .61, .355, 1); animation-timing-function: cubic-bezier(.215, .61, .355, 1); } 0% { opacity: 0; -webkit-transform: scale3d(.3, .3, .3); transform: scale3d(.3, .3, .3); } 20% { -webkit-transform: scale3d(1.1, 1.1, 1.1); transform: scale3d(1.1, 1.1, 1.1); } 40% { -webkit-transform: scale3d(.9, .9, .9); transform: scale3d(.9, .9, .9); } 60% { opacity: 1; -webkit-transform: scale3d(1.03, 1.03, 1.03); transform: scale3d(1.03, 1.03, 1.03); } 80% { -webkit-transform: scale3d(.97, .97, .97); transform: scale3d(.97, .97, .97); } to { opacity: 1; -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } }
@keyframes bounceIn { from, 20%, 40%, 60%, 80%, to { -webkit-animation-timing-function: cubic-bezier(.215, .61, .355, 1); animation-timing-function: cubic-bezier(.215, .61, .355, 1); } 0% { opacity: 0; -webkit-transform: scale3d(.3, .3, .3); transform: scale3d(.3, .3, .3); } 20% { -webkit-transform: scale3d(1.1, 1.1, 1.1); transform: scale3d(1.1, 1.1, 1.1); } 40% { -webkit-transform: scale3d(.9, .9, .9); transform: scale3d(.9, .9, .9); } 60% { opacity: 1; -webkit-transform: scale3d(1.03, 1.03, 1.03); transform: scale3d(1.03, 1.03, 1.03); } 80% { -webkit-transform: scale3d(.97, .97, .97); transform: scale3d(.97, .97, .97); } to { opacity: 1; -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } }
@-webkit-keyframes zoomIn { from { opacity: 0; -webkit-transform: scale3d(.3, .3, .3); transform: scale3d(.3, .3, .3); } 50% { opacity: 1; } }
@keyframes zoomIn { from { opacity: 0; -webkit-transform: scale3d(.3, .3, .3); transform: scale3d(.3, .3, .3); } 50% { opacity: 1; } }
@-webkit-keyframes rotateIn { from { -webkit-transform-origin: center; transform-origin: center; -webkit-transform: rotate3d(0, 0, 1, -200deg); transform: rotate3d(0, 0, 1, -200deg); opacity: 0; } to { -webkit-transform-origin: center; transform-origin: center; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); opacity: 1; } }
@keyframes rotateIn { from { -webkit-transform-origin: center; transform-origin: center; -webkit-transform: rotate3d(0, 0, 1, -200deg); transform: rotate3d(0, 0, 1, -200deg); opacity: 0; } to { -webkit-transform-origin: center; transform-origin: center; -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); opacity: 1; } }
@-webkit-keyframes slideInUp { from { -webkit-transform: translate3d(0, 100%, 0); transform: translate3d(0, 100%, 0); visibility: visible; } to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@keyframes slideInUp { from { -webkit-transform: translate3d(0, 100%, 0); transform: translate3d(0, 100%, 0); visibility: visible; } to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@-webkit-keyframes slideInDown { from { -webkit-transform: translate3d(0, -100%, 0); transform: translate3d(0, -100%, 0); visibility: visible; } to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@keyframes slideInDown { from { -webkit-transform: translate3d(0, -100%, 0); transform: translate3d(0, -100%, 0); visibility: visible; } to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@-webkit-keyframes bounce { from, 20%, 53%, 80%, to { -webkit-animation-timing-function: cubic-bezier(.215, .61, .355, 1); animation-timing-function: cubic-bezier(.215, .61, .355, 1); -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 40%, 43% { -webkit-animation-timing-function: cubic-bezier(.755, .05, .855, .06); animation-timing-function: cubic-bezier(.755, .05, .855, .06); -webkit-transform: translate3d(0, -30px, 0); transform: translate3d(0, -30px, 0); } 70% { -webkit-animation-timing-function: cubic-bezier(.755, .05, .855, .06); animation-timing-function: cubic-bezier(.755, .05, .855, .06); -webkit-transform: translate3d(0, -15px, 0); transform: translate3d(0, -15px, 0); } 90% { -webkit-transform: translate3d(0, -4px, 0); transform: translate3d(0, -4px, 0); } }
@keyframes bounce { from, 20%, 53%, 80%, to { -webkit-animation-timing-function: cubic-bezier(.215, .61, .355, 1); animation-timing-function: cubic-bezier(.215, .61, .355, 1); -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 40%, 43% { -webkit-animation-timing-function: cubic-bezier(.755, .05, .855, .06); animation-timing-function: cubic-bezier(.755, .05, .855, .06); -webkit-transform: translate3d(0, -30px, 0); transform: translate3d(0, -30px, 0); } 70% { -webkit-animation-timing-function: cubic-bezier(.755, .05, .855, .06); animation-timing-function: cubic-bezier(.755, .05, .855, .06); -webkit-transform: translate3d(0, -15px, 0); transform: translate3d(0, -15px, 0); } 90% { -webkit-transform: translate3d(0, -4px, 0); transform: translate3d(0, -4px, 0); } }
@-webkit-keyframes flash { from, 50%, to { opacity: 1; } 25%, 75% { opacity: 0; } }
@keyframes flash { from, 50%, to { opacity: 1; } 25%, 75% { opacity: 0; } }
@-webkit-keyframes pulse { from { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } 50% { -webkit-transform: scale3d(1.05, 1.05, 1.05); transform: scale3d(1.05, 1.05, 1.05); } to { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } }
@keyframes pulse { from { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } 50% { -webkit-transform: scale3d(1.05, 1.05, 1.05); transform: scale3d(1.05, 1.05, 1.05); } to { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } }
@-webkit-keyframes swing { 20% { -webkit-transform: rotate3d(0, 0, 1, 15deg); transform: rotate3d(0, 0, 1, 15deg); } 40% { -webkit-transform: rotate3d(0, 0, 1, -10deg); transform: rotate3d(0, 0, 1, -10deg); } 60% { -webkit-transform: rotate3d(0, 0, 1, 5deg); transform: rotate3d(0, 0, 1, 5deg); } 80% { -webkit-transform: rotate3d(0, 0, 1, -5deg); transform: rotate3d(0, 0, 1, -5deg); } to { -webkit-transform: rotate3d(0, 0, 1, 0deg); transform: rotate3d(0, 0, 1, 0deg); } }
@keyframes swing { 20% { -webkit-transform: rotate3d(0, 0, 1, 15deg); transform: rotate3d(0, 0, 1, 15deg); } 40% { -webkit-transform: rotate3d(0, 0, 1, -10deg); transform: rotate3d(0, 0, 1, -10deg); } 60% { -webkit-transform: rotate3d(0, 0, 1, 5deg); transform: rotate3d(0, 0, 1, 5deg); } 80% { -webkit-transform: rotate3d(0, 0, 1, -5deg); transform: rotate3d(0, 0, 1, -5deg); } to { -webkit-transform: rotate3d(0, 0, 1, 0deg); transform: rotate3d(0, 0, 1, 0deg); } }
@-webkit-keyframes shake { from, to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 10%, 30%, 50%, 70%, 90% { -webkit-transform: translate3d(-10px, 0, 0); transform: translate3d(-10px, 0, 0); } 20%, 40%, 60%, 80% { -webkit-transform: translate3d(10px, 0, 0); transform: translate3d(10px, 0, 0); } }
@keyframes shake { from, to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 10%, 30%, 50%, 70%, 90% { -webkit-transform: translate3d(-10px, 0, 0); transform: translate3d(-10px, 0, 0); } 20%, 40%, 60%, 80% { -webkit-transform: translate3d(10px, 0, 0); transform: translate3d(10px, 0, 0); } }
@-webkit-keyframes tada { from { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } 10%, 20% { -webkit-transform: scale3d(.9, .9, .9) rotate3d(0, 0, 1, -3deg); transform: scale3d(.9, .9, .9) rotate3d(0, 0, 1, -3deg); } 30%, 50%, 70%, 90% { -webkit-transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); } 40%, 60%, 80% { -webkit-transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); } to { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } }
@keyframes tada { from { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } 10%, 20% { -webkit-transform: scale3d(.9, .9, .9) rotate3d(0, 0, 1, -3deg); transform: scale3d(.9, .9, .9) rotate3d(0, 0, 1, -3deg); } 30%, 50%, 70%, 90% { -webkit-transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); } 40%, 60%, 80% { -webkit-transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); } to { -webkit-transform: scale3d(1, 1, 1); transform: scale3d(1, 1, 1); } }
@-webkit-keyframes wobble { from { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 15% { -webkit-transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg); transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg); } 30% { -webkit-transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg); transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg); } 45% { -webkit-transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg); transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg); } 60% { -webkit-transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg); transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg); } 75% { -webkit-transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg); transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg); } to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@keyframes wobble { from { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 15% { -webkit-transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg); transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg); } 30% { -webkit-transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg); transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg); } 45% { -webkit-transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg); transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg); } 60% { -webkit-transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg); transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg); } 75% { -webkit-transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg); transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg); } to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } }
@-webkit-keyframes jello { from, 11.1%, to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 22.2% { -webkit-transform: skewX(-12.5deg) skewY(-12.5deg); transform: skewX(-12.5deg) skewY(-12.5deg); } 33.3% { -webkit-transform: skewX(6.25deg) skewY(6.25deg); transform: skewX(6.25deg) skewY(6.25deg); } 44.4% { -webkit-transform: skewX(-3.125deg) skewY(-3.125deg); transform: skewX(-3.125deg) skewY(-3.125deg); } 55.5% { -webkit-transform: skewX(1.5625deg) skewY(1.5625deg); transform: skewX(1.5625deg) skewY(1.5625deg); } 66.6% { -webkit-transform: skewX(-.78125deg) skewY(-.78125deg); transform: skewX(-.78125deg) skewY(-.78125deg); } 77.7% { -webkit-transform: skewX(.390625deg) skewY(.390625deg); transform: skewX(.390625deg) skewY(.390625deg); } 88.8% { -webkit-transform: skewX(-.1953125deg) skewY(-.1953125deg); transform: skewX(-.1953125deg) skewY(-.1953125deg); } }
@keyframes jello { from, 11.1%, to { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); } 22.2% { -webkit-transform: skewX(-12.5deg) skewY(-12.5deg); transform: skewX(-12.5deg) skewY(-12.5deg); } 33.3% { -webkit-transform: skewX(6.25deg) skewY(6.25deg); transform: skewX(6.25deg) skewY(6.25deg); } 44.4% { -webkit-transform: skewX(-3.125deg) skewY(-3.125deg); transform: skewX(-3.125deg) skewY(-3.125deg); } 55.5% { -webkit-transform: skewX(1.5625deg) skewY(1.5625deg); transform: skewX(1.5625deg) skewY(1.5625deg); } 66.6% { -webkit-transform: skewX(-.78125deg) skewY(-.78125deg); transform: skewX(-.78125deg) skewY(-.78125deg); } 77.7% { -webkit-transform: skewX(.390625deg) skewY(.390625deg); transform: skewX(.390625deg) skewY(.390625deg); } 88.8% { -webkit-transform: skewX(-.1953125deg) skewY(-.1953125deg); transform: skewX(-.1953125deg) skewY(-.1953125deg); } }
.animated { -webkit-animation-duration: var(--animate-time, 1s); animation-duration: var(--animate-time, 1s); -webkit-animation-fill-mode: both; animation-fill-mode: both; }
.infinite { -webkit-animation-iteration-count: infinite; animation-iteration-count: infinite; }
`

// ==================== 组件类型 → HTML 渲染函数 ====================

interface RenderContext {
  component: ComponentData
  allComponents: ComponentData[]
}

/**
 * 将组件样式转换为内联 CSS 字符串
 */
function styleToInline(style: Record<string, unknown>): string {
    const styleMap: Record<string, string> = {
        width: 'width',
        height: 'height',
        top: 'top',
        left: 'left',
        rotate: 'transform',
        opacity: 'opacity',
        fontSize: 'font-size',
        fontWeight: 'font-weight',
        lineHeight: 'line-height',
        letterSpacing: 'letter-spacing',
        textAlign: 'text-align',
        color: 'color',
        backgroundColor: 'background-color',
        borderColor: 'border-color',
        borderWidth: 'border-width',
        borderStyle: 'border-style',
        borderRadius: 'border-radius',
        padding: 'padding',
        verticalAlign: 'vertical-align',
    }

    const lines: string[] = []
    let transformStr = ''

    for (const [key, value] of Object.entries(style)) {
        if (value === undefined || value === null || value === '') continue
        const cssKey = styleMap[key]
        if (!cssKey) continue

        if (key === 'rotate') {
            transformStr = `rotate(${value}deg)`
            continue
        }

        const needsPx = ['width', 'height', 'top', 'left', 'fontSize', 'borderWidth', 'letterSpacing', 'borderRadius', 'padding'].includes(key)
        // borderRadius can be a string like '50%', don't add px if it already has a unit
        if (needsPx && key === 'borderRadius' && typeof value === 'string' && /%|px|em|rem/.test(value)) {
            lines.push(`${cssKey}: ${value}`)
        } else if (needsPx && typeof value === 'number') {
            lines.push(`${cssKey}: ${value}px`)
        } else {
            lines.push(`${cssKey}: ${value}`)
        }
    }

    if (transformStr) {
        lines.push(`transform: ${transformStr}`)
    }

    return lines.join('; ')
}

/**
 * 生成动画的 HTML 属性
 */
function getAnimationAttributes(animations: Animation[]): string {
    if (!animations || animations.length === 0) return ''

    // 只取第一个动画用于进入效果
    const enterAnim = animations.find(a => a.applyTo === 'enter' || !a.applyTo) || animations[0]
    if (!enterAnim) return ''

    const classes = ['animated', enterAnim.type]
    if (enterAnim.infinite) classes.push('infinite')

    const style = `--animate-time: ${enterAnim.duration / 1000}s; animation-delay: ${enterAnim.delay}ms;`
    return `class="${classes.join(' ')}" style="${style}"`
}

/**
 * 渲染文本组件（VText）
 */
function renderVText(ctx: RenderContext): string {
    const { component } = ctx
    const text = component.propValue as string || ''
    const style = styleToInline(component.style as unknown as Record<string, unknown>)
    const animAttr = getAnimationAttributes(component.animations)
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')

    return `<div ${animAttr} style="position:absolute; ${style}">${escapedText}</div>`
}

/**
 * 渲染按钮组件（VButton）
 */
function renderVButton(ctx: RenderContext): string {
    const { component } = ctx
    const text = component.propValue as string || ''
    const style = styleToInline(component.style as unknown as Record<string, unknown>)
    const animAttr = getAnimationAttributes(component.animations)
    const escapedText = escapeHtml(text)
    const eventData = buildEventAttribute(component.events)

    return `<div ${animAttr} style="position:absolute; display:flex; align-items:center; justify-content:center; ${style}; cursor:pointer" ${eventData}>${escapedText}</div>`
}

/**
 * 渲染图片组件（Picture）
 */
function renderPicture(ctx: RenderContext): string {
    const { component } = ctx
    const propValue = component.propValue as { url?: string; flip?: { horizontal?: boolean; vertical?: boolean } } || {}
    const style = styleToInline(component.style as unknown as Record<string, unknown>)
    const imgUrl = propValue.url || ''
    const safeUrl = isValidImageUrl(imgUrl) ? escapeHtml(imgUrl) : ''
    const flipTransform = []
    if (propValue.flip?.horizontal) flipTransform.push('scaleX(-1)')
    if (propValue.flip?.vertical) flipTransform.push('scaleY(-1)')
    const imgStyle = flipTransform.length ? `transform: ${flipTransform.join(' ')}` : ''
    const animAttr = getAnimationAttributes(component.animations)

    return `<div ${animAttr} style="position:absolute; ${style}"><img src="${safeUrl}" style="width:100%;height:100%;object-fit:fill;${imgStyle}" /></div>`
}

/**
 * 渲染矩形组件（RectShape）
 */
function renderRectShape(ctx: RenderContext): string {
    const { component } = ctx
    const text = component.propValue as string || ''
    const baseStyle = styleToInline(component.style as unknown as Record<string, unknown>)
    const style = `position:absolute; overflow:hidden; ${baseStyle}`
    const animAttr = getAnimationAttributes(component.animations)
    const childrenHtml = renderChildren(ctx)
    const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return `<div ${animAttr} style="${style}"><div style="padding:4px;">${escapedText}</div>${childrenHtml}</div>`
}

/**
 * 渲染圆形组件（CircleShape）
 */
function renderCircleShape(ctx: RenderContext): string {
    const { component } = ctx
    const text = component.propValue as string || ''
    const baseStyle = styleToInline(component.style as unknown as Record<string, unknown>)
    const style = `position:absolute; display:flex; align-items:center; justify-content:center; overflow:hidden; ${baseStyle}`
    const animAttr = getAnimationAttributes(component.animations)
    const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return `<div ${animAttr} style="${style}"><span>${escapedText}</span></div>`
}

/**
 * 渲染线条组件（LineShape）
 */
function renderLineShape(ctx: RenderContext): string {
    const { component } = ctx
    const baseStyle = styleToInline(component.style as unknown as Record<string, unknown>)
    const animAttr = getAnimationAttributes(component.animations)

    return `<div ${animAttr} style="position:absolute; ${baseStyle}"></div>`
}

/**
 * 渲染 SVG 星形（SVGStar）
 */
function renderSVGStar(ctx: RenderContext): string {
    const { component } = ctx
    const style = component.style
    const w = style.width || 80
    const h = style.height || 80
    const fill = style.color || '#000'
    const bg = style.backgroundColor || 'transparent'
    const animAttr = getAnimationAttributes(component.animations)

    return `<div ${animAttr} style="position:absolute; left:${style.left ?? 0}px; top:${style.top ?? 0}px; width:${w}px; height:${h}px; background:${bg};">
    <svg viewBox="0 0 24 24" width="${w}" height="${h}" fill="${fill}">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  </div>`
}

/**
 * 渲染 SVG 三角形（SVGTriangle）
 */
function renderSVGTriangle(ctx: RenderContext): string {
    const { component } = ctx
    const style = component.style
    const w = style.width || 80
    const h = style.height || 80
    const fill = style.color || '#000'
    const bg = style.backgroundColor || 'transparent'
    const animAttr = getAnimationAttributes(component.animations)

    return `<div ${animAttr} style="position:absolute; left:${style.left ?? 0}px; top:${style.top ?? 0}px; width:${w}px; height:${h}px; background:${bg};">
    <svg viewBox="0 0 24 24" width="${w}" height="${h}" fill="${fill}">
      <path d="M12 2L2 22h20L12 2z"/>
    </svg>
  </div>`
}

/**
 * 渲染表格组件（VTable）
 */
function renderVTable(ctx: RenderContext): string {
    const { component } = ctx
    const style = styleToInline(component.style as unknown as Record<string, unknown>)
    const propValue = component.propValue as { data?: string[][]; stripe?: boolean; thBold?: boolean } || {}
    const data = propValue.data || []
    const animAttr = getAnimationAttributes(component.animations)

    if (data.length === 0) {
        return `<div style="position:absolute; display:flex; align-items:center; justify-content:center; ${style}">空表格</div>`
    }

    const headerRow = data[0] || []
    const bodyRows = data.slice(1)
    const headers = headerRow.map((h: string) => `<th style="border:1px solid #d9d9d9;padding:4px 8px;${propValue.thBold ? 'font-weight:bold' : ''}">${escapeHtml(h)}</th>`).join('')
    const rows = bodyRows.map((row: string[]) => {
        const cells = row.map((cell: string) => `<td style="border:1px solid #d9d9d9;padding:4px 8px;">${escapeHtml(cell)}</td>`).join('')
        return `<tr>${cells}</tr>`
    }).join('')

    const tableStyle = propValue.stripe ? 'border-collapse:collapse;width:100%;height:100%;' : 'border-collapse:collapse;width:100%;height:100%;'

    return `<div ${animAttr} style="position:absolute; overflow:auto; ${style}"><table style="${tableStyle}"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`
}

/**
 * 渲染图表组件（VChart）—— 降级为占位图
 */
function renderVChart(ctx: RenderContext): string {
    const { component } = ctx
    const style = styleToInline(component.style as unknown as Record<string, unknown>)
    const animAttr = getAnimationAttributes(component.animations)

    return `<div ${animAttr} style="position:absolute; display:flex; align-items:center; justify-content:center; background:#f5f5f5; color:#999; font-size:14px; ${style}"><div style="text-align:center;"><div>📊 图表</div><div style="font-size:12px;margin-top:4px;">导出 HTML 暂不支持动态图表</div></div></div>`
}

/**
 * 渲染 Group 组件
 */
function renderGroup(ctx: RenderContext): string {
    const { component } = ctx
    const style = styleToInline(component.style as unknown as Record<string, unknown>)
    const children = component.propValue as ComponentData[]

    let childrenHtml = ''
    if (Array.isArray(children)) {
        childrenHtml = children.map(child => renderComponent({ component: child, allComponents: ctx.allComponents })).join('\n')
    }

    return `<div style="position:absolute; ${style}">${childrenHtml}</div>`
}

/**
 * 渲染子组件（通过 parentId 查找）
 */
function renderChildren(ctx: RenderContext): string {
    const { component, allComponents } = ctx
    const children = allComponents.filter(c => c.parentId === component.id)
    if (children.length === 0) return ''

    return children.map(child => renderComponent({ component: child, allComponents })).join('\n')
}

// ==================== 渲染分发 ====================

const RENDERERS: Record<string, (ctx: RenderContext) => string> = {
    VText: renderVText,
    VButton: renderVButton,
    Picture: renderPicture,
    RectShape: renderRectShape,
    CircleShape: renderCircleShape,
    LineShape: renderLineShape,
    SVGStar: renderSVGStar,
    SVGTriangle: renderSVGTriangle,
    VTable: renderVTable,
    VChart: renderVChart,
    Group: renderGroup,
}

function renderComponent(ctx: RenderContext): string {
    const renderer = RENDERERS[ctx.component.component]
    if (!renderer) {
    // 未知组件，渲染为空白占位
        const style = styleToInline(ctx.component.style as unknown as Record<string, unknown>)
        return `<div style="position:absolute; display:flex; align-items:center; justify-content:center; background:#eee; color:#999; font-size:12px; ${style}">${ctx.component.component}</div>`
    }
    return renderer(ctx)
}

function buildEventAttribute(events: Record<string, string>): string {
    const entries = Object.entries(events)
    if (entries.length === 0) return ''

    // 只处理第一个事件，使用 data 属性存储（避免内联 JS 注入）
    const [type, param] = entries[0]
    return `data-event-type="${escapeHtml(type)}" data-event-param="${escapeHtml(param)}"`
}

// ==================== 主导出函数 ====================

export interface ExportHtmlOptions {
  title?: string
  componentData: ComponentData[]
  canvasStyle: CanvasStyleData
}

/**
 * 导出为独立 HTML 文件
 * @returns HTML 字符串
 */
export function exportToHtml({ title = '低代码页面', componentData, canvasStyle }: ExportHtmlOptions): string {
    const rootComponents = componentData.filter(c => !c.parentId)
    const canvasWidth = canvasStyle.width || 1200
    const canvasHeight = canvasStyle.height || 740
    const bgColor = isValidCssColor(canvasStyle.backgroundColor || '') ? canvasStyle.backgroundColor : '#fff'

    // 渲染所有根组件
    const componentsHtml = rootComponents
        .map(component => renderComponent({ component, allComponents: componentData }))
        .join('\n    ')

    // 构建完整 HTML
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: #f0f0f0;
  padding: 40px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.page-container {
  position: relative;
  background: ${bgColor};
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
${ANIMATION_KEYFRAMES}
</style>
</head>
<body>
<div class="page-container" style="width:${canvasWidth}px;height:${canvasHeight}px;">
  ${componentsHtml}
</div>
<script>
// 页面加载完成后执行进入动画
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.animated').forEach(function(el) {
    var time = el.style.getPropertyValue('--animate-time') || '1s';
    el.style.animationDuration = time;
  });

  // 委托事件处理（安全方式，避免内联 JS 注入）
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-event-type]');
    if (!el) return;
    var type = el.getAttribute('data-event-type');
    var param = el.getAttribute('data-event-param');
    if (type === 'redirect' && /^https?:\\/\\//.test(param)) {
      window.open(param, '_blank', 'noopener,noreferrer');
    } else if (type === 'alert') {
      window.alert(param);
    }
  });
});
<\/script>
</body>
</html>`
}

/**
 * 下载 HTML 文件
 */
export function downloadHtmlFile(html: string, filename: string = 'page.html'): void {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('download', filename)
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * 性能优化工具函数
 */

/**
 * requestAnimationFrame 批处理工具
 * 用于高频更新场景，将多次更新合并到一帧中
 */
export function createRAFThrottle<T extends (...args: unknown[]) => void>(
    fn: T,
): (...args: Parameters<T>) => void {
    let rafId: number | null = null
    let lastArgs: Parameters<T> | null = null

    return (...args: Parameters<T>) => {
        lastArgs = args
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                if (lastArgs !== null) {
                    fn(...lastArgs)
                }
                rafId = null
                lastArgs = null
            })
        }
    }
}

/**
 * 节流函数
 * 限制函数在指定时间间隔内只能执行一次
 */
export function throttle<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number,
): (...args: Parameters<T>) => void {
    let lastTime = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    return (...args: Parameters<T>) => {
        const now = Date.now()
        const remaining = delay - (now - lastTime)

        if (remaining <= 0) {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            lastTime = now
            fn(...args)
        } else if (!timer) {
            timer = setTimeout(() => {
                lastTime = Date.now()
                timer = null
                fn(...args)
            }, remaining)
        }
    }
}

/**
 * 判断元素是否在可视区域内
 * 用于视口裁剪优化
 */
interface ViewportRect {
  top: number
  left: number
  width: number
  height: number
}

interface ViewportOptions {
  viewportWidth: number
  viewportHeight: number
  scrollTop?: number
  scrollLeft?: number
  buffer?: number // 缓冲区域，提前渲染视口外的元素
}

export function isInViewport(
    rect: ViewportRect,
    options: ViewportOptions,
): boolean {
    const {
        viewportWidth,
        viewportHeight,
        scrollTop = 0,
        scrollLeft = 0,
        buffer = 100, // 默认缓冲 100px
    } = options

    const { top, left, width, height } = rect

    // 元素边界
    const elementTop = top
    const elementBottom = top + height
    const elementLeft = left
    const elementRight = left + width

    // 视口边界（带缓冲区）
    const viewTop = scrollTop - buffer
    const viewBottom = scrollTop + viewportHeight + buffer
    const viewLeft = scrollLeft - buffer
    const viewRight = scrollLeft + viewportWidth + buffer

    // 判断是否相交
    return (
        elementBottom >= viewTop &&
    elementTop <= viewBottom &&
    elementRight >= viewLeft &&
    elementLeft <= viewRight
    )
}

/**
 * 创建拖拽状态管理器
 * 用于在拖拽过程中临时禁用某些计算密集型操作
 */
export function createDragState() {
    let isDragging = false
    const listeners: Array<(dragging: boolean) => void> = []

    return {
        start(): void {
            isDragging = true
            listeners.forEach(fn => fn(true))
        },
        end(): void {
            isDragging = false
            listeners.forEach(fn => fn(false))
        },
        get isDragging(): boolean {
            return isDragging
        },
        subscribe(fn: (dragging: boolean) => void): () => void {
            listeners.push(fn)
            return () => {
                const index = listeners.indexOf(fn)
                if (index > -1) listeners.splice(index, 1)
            }
        },
    }
}


/**
 * 深拷贝函数
 * 优先使用 structuredClone（支持 Date、RegExp、Map、Set 等特殊对象）
 * 对于 structuredClone 无法处理的对象（如包含函数、DOM 节点等），降级为递归拷贝
 * 注意：降级路径仅处理普通对象和数组，不支持 Map/Set/Date 等特殊类型
 */
export function deepCopy<T>(target: T): T {
    if (target === null || typeof target !== 'object') {
        return target
    }

    try {
        return structuredClone(target)
    } catch {
    // 降级：仅处理普通对象和数组（适用于包含函数或 DOM 节点的场景）
        if (Array.isArray(target)) {
            return target.map(item => deepCopy(item)) as T
        }

        const result = {} as T
        for (const key in target) {
            if (Object.prototype.hasOwnProperty.call(target, key)) {
                result[key] = deepCopy(target[key])
            }
        }
        return result
    }
}

/**
 * 交换数组元素
 * @param arr 目标数组
 * @param i 第一个索引
 * @param j 第二个索引
 */
export function swap<T>(arr: T[], i: number, j: number): void {
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
}

/**
 * DOM 选择器
 * @param selector CSS 选择器
 * @returns 匹配的元素或 null
 */
export function $<T extends Element = Element>(selector: string): T | null {
    return document.querySelector<T>(selector)
}

/**
 * 不阻止拖放的组件列表
 */
const components = ['VText', 'RectShape', 'CircleShape'] as const

/**
 * 判断组件是否阻止拖放
 * @param component 组件名称
 * @returns 是否阻止拖放
 */
export function isPreventDrop(component: string): boolean {
    return !components.includes(component as typeof components[number]) && !component.startsWith('SVG')
}

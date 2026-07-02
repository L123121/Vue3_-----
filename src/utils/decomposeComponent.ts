import { $ } from './utils'
import { mod360 } from './translate'
import type { ComponentStyle, ComponentData } from '@/types'

/**
 * 将组合中的各个子组件拆分出来，并计算它们新的 style
 * @param component 子组件
 * @param editorRect 编辑器矩形区域
 * @param parentStyle 父组件样式
 */
export default function decomposeComponent(
    component: ComponentData,
    editorRect: DOMRect,
    parentStyle: ComponentStyle,
): void {
    const element = $(`#component${component.id}`)
    if (!element) return

    const componentRect = element.getBoundingClientRect()

    // 获取元素的中心点坐标
    const center = {
        x: componentRect.left - editorRect.left + componentRect.width / 2,
        y: componentRect.top - editorRect.top + componentRect.height / 2,
    }

    component.style.rotate = mod360((component.style.rotate ?? 0) + (parentStyle.rotate ?? 0))
    component.style.width =
    (parseFloat(component.groupStyle.width as string) / 100) * parentStyle.width
    component.style.height =
    (parseFloat(component.groupStyle.height as string) / 100) * parentStyle.height

    // 计算出元素新的 top left 坐标
    component.style.left = center.x - component.style.width / 2
    component.style.top = center.y - component.style.height / 2
    component.groupStyle = {}
}

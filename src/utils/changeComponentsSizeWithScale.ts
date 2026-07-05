import { deepCopy } from '@/utils/utils'
import { useStore } from '@/store'
import type { ComponentData } from '@/types'

/**
 * 需要根据缩放比例调整的属性
 */
const needToChangeAttrs: (keyof ComponentData['style'])[] = [
    'top',
    'left',
    'width',
    'height',
    'fontSize',
    'padding',
]

/**
 * 根据比例缩放组件尺寸
 * @param scale 目标缩放比例
 * @param snapshotData 快照数据（可选）
 * @param sourceScale 快照数据的原始缩放比例（可选，默认 100）
 */
export default function changeComponentsSizeWithScale(
    scale: number,
    snapshotData: ComponentData[] | null = null,
    sourceScale?: number,
): ComponentData[] | void {
    const store = useStore()
    const componentData = snapshotData || deepCopy(store.componentData)
    const baseScale = snapshotData ? (sourceScale ?? 100) : store.canvasStyleData.scale

    componentData.forEach(component => {
        Object.keys(component.style).forEach(key => {
            const styleKey = key as keyof ComponentData['style']
            if (needToChangeAttrs.includes(styleKey)) {
                const newKey = Number((((component.style[styleKey] as number) / baseScale) * scale).toFixed(4))

                const style = component.style as unknown as Record<string, number>
                if (styleKey === 'top' || styleKey === 'left') {
                    style[styleKey] = newKey
                } else {
                    style[styleKey] = newKey === 0 ? 1 : newKey
                }
            }
        })
    })

    if (snapshotData) {
        return componentData
    }

    store.setComponentData(componentData)

    // 更新后的组件数据
    if (store.curComponentIndex !== null) {
        store.setCurComponent({
            component: componentData[store.curComponentIndex],
            index: store.curComponentIndex,
        })
    }

    // 更新画布的比例
    store.setCanvasStyle({
        ...store.canvasStyleData,
        scale,
    })
}

/**
 * 需要根据缩放比例调整的属性（不包含位置）
 */
const needToChangeAttrs2: (keyof ComponentData['style'])[] = [
    'width',
    'height',
    'fontSize',
    'padding',
]

/**
 * 根据缩放比例调整单个组件尺寸
 * @param component 组件数据
 */
export function changeComponentSizeWithScale(component: ComponentData): void {
    const store = useStore()

    Object.keys(component.style).forEach(key => {
        const styleKey = key as keyof ComponentData['style']
        if (needToChangeAttrs2.includes(styleKey)) {
            if (styleKey === 'fontSize' && (component.style[styleKey] ?? 0) === 0) return

            ;(component.style as unknown as Record<string, number>)[styleKey] = format(
                component.style[styleKey] as number,
                store.canvasStyleData.scale,
            )
        }
    })
}

/**
 * 格式化缩放值
 * @param value 原始值
 * @param scale 缩放比例
 * @returns 缩放后的值
 */
function format(value: number, scale: number): number {
    return value * (scale / 100)
}

import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { deepCopy } from '@/utils/utils'
import generateID from '@/utils/generateID'
import componentList from '@/custom-component/component-list'
import { changeComponentSizeWithScale } from '@/utils/changeComponentsSizeWithScale'
import { isContainer } from '@/custom-component/registry'
import type { ComponentData } from '@/types'
import { addComponentWithCommand } from '@/composables/useCommandActions'

/**
 * 拖拽放置 composable
 * 处理从组件列表拖拽到画布的逻辑
 * 支持拖入容器时自动设置 parentId
 */
export function useDragDrop(): {
  handleDrop: (e: DragEvent) => void
  handleDragOver: (e: DragEvent) => void
  } {
    const store = useStore()
    const { editor, componentData } = storeToRefs(store)

    /**
   * 查找拖放位置所在的容器组件
   * 从顶层（数组末尾）向底层（数组开头）遍历
   */
    function findContainerAt(x: number, y: number): ComponentData | null {
    // 倒序遍历，先检测最上层的容器
        for (let i = componentData.value.length - 1; i >= 0; i--) {
            const component = componentData.value[i]
            if (component.isLock) continue
            if (!isContainer(component.component)) continue

            const s = component.style
            const cx = s.left ?? 0
            const cy = s.top ?? 0
            if (x >= cx && x <= cx + s.width && y >= cy && y <= cy + s.height) {
                return component
            }
        }
        return null
    }

    function handleDrop(e: DragEvent): void {
        e.preventDefault()
        e.stopPropagation()

        const index = e.dataTransfer?.getData('index')
        const rectInfo = editor.value!.getBoundingClientRect()
        if (index) {
            const component = deepCopy(componentList[parseInt(index)])
            const dropX = e.clientX - rectInfo.x
            const dropY = e.clientY - rectInfo.y

            // ==================== 容器检测 ====================
            // 检测拖放位置是否在某个容器组件内
            const container = findContainerAt(dropX, dropY)

            if (container) {
                // 拖入容器：坐标相对于容器，设置 parentId
                component.style.top = dropY - (container.style.top ?? 0)
                component.style.left = dropX - (container.style.left ?? 0)
                component.parentId = container.id
                ElMessage.success(`已放入 ${container.label} 容器`)
            } else {
                // 拖入画布空白区域：根级组件
                component.style.top = dropY
                component.style.left = dropX
                component.parentId = null
            }

            component.id = generateID()
            changeComponentSizeWithScale(component)
            addComponentWithCommand(component)
        }
    }

    function handleDragOver(e: DragEvent): void {
        e.preventDefault()
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy'
        }
    }

    return { handleDrop, handleDragOver }
}

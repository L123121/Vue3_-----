import { BaseCommand } from './BaseCommand'
import { CommandType } from './types'
import type { ComponentData } from '@/types'
import { useStore } from '@/store'

/**
 * 删除组件命令
 * 若删除的是容器组件，会同时删除其所有子组件（parentId 指向该容器）
 */
export class DeleteComponentCommand extends BaseCommand {
  type = CommandType.DELETE_COMPONENT
  description = '删除组件'
  mergeable = false

  private deletedComponent: ComponentData | null = null
  private deletedIndex = -1
  /** 级联删除的子组件（用于撤销恢复） */
  private deletedChildren: ComponentData[] = []
  private deletedChildIndices: number[] = []

  constructor(
    private componentId: string,
    private index?: number
  ) {
    super()
    this.data = {
      componentId,
      index,
    }
  }

  execute(): void {
    const store = useStore()
    const idx = this.index ?? store.componentData.findIndex(c => c.id === this.componentId)
    if (idx < 0 || idx >= store.componentData.length) return

    this.deletedIndex = idx
    this.deletedComponent = store.componentData[idx]

    // ==================== 级联删除子组件 ====================
    // 先收集所有子组件（通过 parentId 关联）
    this.deletedChildren = []
    this.deletedChildIndices = []
    const collectChildren = (parentId: string): void => {
      for (let i = store.componentData.length - 1; i >= 0; i--) {
        const c = store.componentData[i]
        if (c.parentId === parentId) {
          this.deletedChildren.push(c)
          this.deletedChildIndices.push(i)
          // 递归收集子组件的子组件
          collectChildren(c.id)
        }
      }
    }
    collectChildren(this.componentId)

    // 从后往前删除（避免索引错乱）
    const allIndices = [idx, ...this.deletedChildIndices].sort((a, b) => b - a)
    for (const i of allIndices) {
      store.componentData.splice(i, 1)
    }

    if (store.curComponent?.id === this.componentId) {
      store.curComponent = null
      store.curComponentIndex = null
    } else if (store.curComponentIndex !== null) {
      // 调整 curComponentIndex
      const removedCount = allIndices.filter(i => i < store.curComponentIndex!).length
      store.curComponentIndex -= removedCount
    }
  }

  undo(): void {
    const store = useStore()
    if (!this.deletedComponent || this.deletedIndex < 0) return

    // 先恢复原组件
    store.componentData.splice(this.deletedIndex, 0, this.deletedComponent)

    // 恢复子组件
    for (let i = 0; i < this.deletedChildren.length; i++) {
      const childIdx = this.deletedChildIndices[i]
      if (childIdx >= 0) {
        store.componentData.splice(childIdx, 0, this.deletedChildren[i])
      }
    }
  }
}

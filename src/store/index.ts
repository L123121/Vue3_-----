import { defineStore } from 'pinia'
import type {
  StoreState,
  ComponentData,
  CanvasStyleData,
  AreaData,
  CopyData,
  SetCurComponentPayload,
  SetShapeStylePayload,
  AddComponentPayload,
  AddEventPayload,
  AlterAnimationPayload,
  ShowContextMenuPayload,
  ComponentStyle,
  PageVersion,
} from '@/types'
import { deepCopy, swap, $ } from '@/utils/utils'
import eventBus from '@/utils/eventBus'
import { ElMessage } from 'element-plus'
import generateID from '@/utils/generateID'
import { CommandManager } from '@/commands/CommandManager'
import { validatePageVersions } from '@/utils/validation'
import {
  MoveCommand,
  ResizeCommand,
  RotateCommand,
  AddComponentCommand,
  DeleteComponentCommand,
  LayerCommand,
  ComposeCommand,
  DecomposeCommand,
  PasteCommand,
  ClearCanvasCommand,
  ImportDataCommand,
  CutCommand,
} from '@/commands'
import type { Command } from '@/commands'

// 命令管理器实例
const commandManager = new CommandManager({ mergeTimeWindow: 300 })

export const useStore = defineStore('main', {
  state: (): StoreState => ({
    editMode: 'edit',
    canvasStyleData: {
      width: 1200,
      height: 740,
      scale: 100,
      color: '#000',
      opacity: 1,
      backgroundColor: '#fff',
      fontSize: 14,
    },
    componentData: [],
    curComponent: null,
    curComponentIndex: null,
    isClickComponent: false,
    editor: null,
    menuTop: 0,
    menuLeft: 0,
    menuShow: false,
    copyData: null,
    isDarkMode: false,
    rightList: true,
    isInEditor: false,
    areaData: {
      style: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
      components: [],
    },
    versions: [],
    dataVersion: 0,
  }),

  actions: {
    /** 标记数据已变更，触发自动保存 */
    markDataDirty(): void {
      this.dataVersion++
    },

    setClickComponentStatus(status: boolean): void {
      this.isClickComponent = status
    },

    setEditor(el: HTMLElement): void {
      this.editor = el
    },

    getEditor(): void {
      this.editor = $('#editor')
    },

    setAreaData(data: AreaData): void {
      this.areaData = data
    },

    setCanvasStyle(style: CanvasStyleData): void {
      this.canvasStyleData = style
    },

    setCurComponent({ component, index }: SetCurComponentPayload): void {
      this.curComponent = component
      this.curComponentIndex = index
    },

    setShapeStyle({ top, left, width, height, rotate }: SetShapeStylePayload): void {
      if (!this.curComponent) return

      if (top !== undefined) this.curComponent.style.top = Math.round(top)
      if (left !== undefined) this.curComponent.style.left = Math.round(left)
      if (width !== undefined) this.curComponent.style.width = Math.round(width)
      if (height !== undefined) this.curComponent.style.height = Math.round(height)
      if (rotate !== undefined) this.curComponent.style.rotate = Math.round(rotate)
    },

    setShapeSingleStyle({ key, value }: { key: string; value: unknown }): void {
      if (this.curComponent) {
        (this.curComponent.style as Record<string, unknown>)[key] = value
      }
    },

    setComponentData(componentData: ComponentData[] = []): void {
      this.componentData = componentData
      // 兼容旧数据：为没有 zIndex 的组件自动分配（循环进位 +2，避免冲突）
      this.ensureZIndex()
      this.markDataDirty()
    },

    addComponent({ component, index }: AddComponentPayload): void {
      // 自动分配 zIndex = 当前最大值 + 1（保证新组件在最上面）
      const maxZ = this.componentData.reduce((max, c) => Math.max(max, c.zIndex || 0), 0)
      component.zIndex = maxZ + 1

      if (index !== undefined) {
        this.componentData.splice(index, 0, component)
      } else {
        this.componentData.push(component)
      }
      this.markDataDirty()
    },

    /**
     * 为所有组件分配连续 zIndex（1,2,3...），按数组当前顺序
     * 用于数据加载后的兼容处理
     */
    ensureZIndex(): void {
      let hasMissing = false
      for (const c of this.componentData) {
        if (!c.zIndex || c.zIndex === 0) { hasMissing = true; break }
      }
      if (!hasMissing) return
      // 按数组顺序重排 zIndex
      this.componentData.forEach((c, i) => { c.zIndex = (i + 1) * 2 })
    },

    deleteComponent(index?: number): void {
      if (index === undefined) {
        index = this.curComponentIndex ?? undefined
      }

      if (index === undefined) return

      if (index === this.curComponentIndex) {
        this.curComponentIndex = null
        this.curComponent = null
      }

      if (typeof index === 'number' && index >= 0) {
        this.componentData.splice(index, 1)
        this.markDataDirty()
      }
    },

    toggleRightList(): void {
      this.rightList = !this.rightList
    },

    updateComponentProps(data: Partial<ComponentData>): void {
      if (this.curComponent) {
        Object.assign(this.curComponent, data)
      }
    },

    /**
     * 上移一层：与 zIndex = current + 1 的组件交换 zIndex 值
     * 视觉上当前组件向上移动一层
     */
    upComponent(): void {
      if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
      const curZ = this.curComponent.zIndex
      // 找 zIndex 刚好比当前大 1 的组件
      const above = this.componentData.find(c => c.zIndex === curZ + 1)
      if (above) {
        above.zIndex = curZ
        this.curComponent.zIndex = curZ + 1
        this.markDataDirty()
      } else {
        ElMessage.warning('已经到顶了')
      }
    },

    /**
     * 下移一层：与 zIndex = current - 1 的组件交换 zIndex 值
     */
    downComponent(): void {
      if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
      const curZ = this.curComponent.zIndex
      const below = this.componentData.find(c => c.zIndex === curZ - 1)
      if (below) {
        below.zIndex = curZ
        this.curComponent.zIndex = curZ - 1
        this.markDataDirty()
      } else {
        ElMessage.warning('已经到底了')
      }
    },

    topComponent(): void {
      // 置顶：zIndex = 当前最大值 + 1
      if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
      const maxZ = this.componentData.reduce((max, c) => Math.max(max, c.zIndex), 0)
      if (this.curComponent.zIndex < maxZ) {
        this.curComponent.zIndex = maxZ + 1
        this.markDataDirty()
      } else {
        ElMessage.warning('已经到顶了')
      }
    },

    bottomComponent(): void {
      // 置底：zIndex = 当前最小值 - 1（最低为 1）
      if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
      const minZ = this.componentData.reduce((min, c) => Math.min(min, c.zIndex), Infinity)
      if (this.curComponent.zIndex > minZ) {
        this.curComponent.zIndex = Math.max(1, minZ - 1)
        this.markDataDirty()
      } else {
        ElMessage.warning('已经到底了')
      }
    },

    addAnimation(animation: { type: string }): void {
      if (this.curComponent) {
        this.curComponent.animations.push({
          ...animation,
          duration: 1000,
          delay: 0,
          interationNum: 1,
          infinite: false,
          applyTo: 'enter',
        })
      }
    },

    removeAnimation(index: number): void {
      if (this.curComponent) {
        this.curComponent.animations.splice(index, 1)
      }
    },

    addEvent({ event, param }: AddEventPayload): void {
      if (this.curComponent) {
        this.curComponent.events[event] = param
      }
    },

    removeEvent(event: string): void {
      if (this.curComponent) {
        delete this.curComponent.events[event]
      }
    },

    alterAnimation({ index, data = {} }: AlterAnimationPayload): void {
      if (this.curComponent && typeof index === 'number') {
        const original = this.curComponent.animations[index]
        if (original) {
          this.curComponent.animations[index] = { ...original, ...data }
        }
      }
    },

    setEditMode(mode: 'edit' | 'preview'): void {
      this.editMode = mode
    },

    setInEditorStatus(status: boolean): void {
      this.isInEditor = status
    },

    // ==================== 命令模式撤销重做 ====================

    /**
     * 执行命令
     */
    executeCommand(command: Command): void {
      commandManager.execute(command)
      this.markDataDirty()
    },

    /**
     * 撤销
     */
    undo(): void {
      commandManager.undo()
      this.refreshCurComponent()
      this.markDataDirty()
    },

    /**
     * 重做
     */
    redo(): void {
      commandManager.redo()
      this.refreshCurComponent()
      this.markDataDirty()
    },

    /**
     * 是否可以撤销
     */
    canUndo(): boolean {
      return commandManager.canUndo()
    },

    /**
     * 是否可以重做
     */
    canRedo(): boolean {
      return commandManager.canRedo()
    },

    /**
     * 清空命令历史
     */
    clearCommandHistory(): void {
      commandManager.clear()
    },

    /**
     * 刷新当前组件引用（撤销重做后需要）
     */
    refreshCurComponent(): void {
      if (this.curComponent) {
        const idx = this.componentData.findIndex(c => c.id === this.curComponent!.id)
        if (idx !== -1) {
          this.curComponent = this.componentData[idx]
          this.curComponentIndex = idx
        } else {
          this.curComponent = null
          this.curComponentIndex = null
        }
      }
    },

    // ==================== 带命令的操作方法 ====================

    /**
     * 移动组件（带命令）
     */
    moveComponent(componentId: string, oldStyle: Partial<ComponentStyle>, newStyle: Partial<ComponentStyle>): void {
      this.executeCommand(new MoveCommand(componentId, oldStyle, newStyle))
    },

    /**
     * 缩放组件（带命令）
     */
    resizeComponent(componentId: string, oldStyle: Partial<ComponentStyle>, newStyle: Partial<ComponentStyle>): void {
      this.executeCommand(new ResizeCommand(componentId, oldStyle, newStyle))
    },

    /**
     * 旋转组件（带命令）
     */
    rotateComponent(componentId: string, oldRotate: number, newRotate: number): void {
      this.executeCommand(new RotateCommand(componentId, oldRotate, newRotate))
    },

    /**
     * 添加组件（带命令）
     */
    addComponentWithCommand(component: ComponentData, index?: number): void {
      this.executeCommand(new AddComponentCommand(component, index))
    },

    /**
     * 删除组件（带命令）
     */
    deleteComponentWithCommand(id?: string, index?: number): void {
      const componentId = id ?? this.curComponent?.id
      if (!componentId) return
      this.executeCommand(new DeleteComponentCommand(componentId, index))
    },

    /**
     * 图层操作（带命令）
     */
    layerOperation(componentId: string, action: 'up' | 'down' | 'top' | 'bottom'): void {
      this.executeCommand(new LayerCommand(componentId, action))
    },

    /**
     * 组合组件（带命令）
     */
    composeWithCommand(): void {
      const componentIds = this.areaData.components.map(c => c.id)
      if (componentIds.length > 0) {
        this.executeCommand(new ComposeCommand(componentIds))
        eventBus.emit('hideArea')
      }
    },

    /**
     * 拆分组件（带命令）
     */
    decomposeWithCommand(): void {
      if (this.curComponent && this.curComponent.component === 'Group') {
        this.executeCommand(new DecomposeCommand(this.curComponent.id))
      }
    },

    /**
     * 清空画布（带命令）
     */
    clearCanvasWithCommand(): void {
      this.executeCommand(new ClearCanvasCommand())
    },

    /**
     * 剪切组件（带命令）
     */
    cutWithCommand(id?: string, index?: number): void {
      const componentId = id ?? this.curComponent?.id
      if (!componentId) return
      this.executeCommand(new CutCommand(componentId, index))
    },

    /**
     * 导入数据（带命令）
     */
    importDataWithCommand(componentData: ComponentData[], canvasStyle?: CanvasStyleData): void {
      this.executeCommand(new ImportDataCommand(componentData, canvasStyle))
    },

    /**
     * 粘贴组件（带命令）
     */
    pasteWithCommand(isMouse?: boolean): void {
      if (!this.copyData) return
      this.executeCommand(new PasteCommand(
        this.copyData.data,
        isMouse,
        this.menuTop,
        this.menuLeft
      ))
    },

    showContextMenu({ top, left }: ShowContextMenuPayload): void {
      this.menuShow = true
      this.menuTop = top
      this.menuLeft = left
    },

    hideContextMenu(): void {
      this.menuShow = false
    },

    toggleDarkMode(val: boolean): void {
      this.isDarkMode = val
      localStorage.setItem('isDarkMode', String(val))
    },

    lock(): void {
      if (this.curComponent) {
        this.curComponent.isLock = true
      }
    },

    unlock(): void {
      if (this.curComponent) {
        this.curComponent.isLock = false
      }
    },

    copy(): void {
      if (!this.curComponent) {
        ElMessage.warning('请选择组件')
        return
      }

      // 如果有剪切数据，需要先还原
      if (this.copyData) {
        this.copyData = null
      }

      this.copyData = {
        data: deepCopy(this.curComponent),
        index: this.curComponentIndex!,
      }
    },

    paste(isMouse?: boolean): void {
      if (!this.copyData) {
        ElMessage.warning('请选择组件')
        return
      }

      const data = deepCopy(this.copyData.data)

      if (isMouse) {
        data.style.top = this.menuTop
        data.style.left = this.menuLeft
      } else {
        data.style.top = (data.style.top ?? 0) + 10
        data.style.left = (data.style.left ?? 0) + 10
      }

      data.id = generateID()

      // Group's sub components id
      if (data.component === 'Group') {
        (data.propValue as ComponentData[]).forEach(component => {
          component.id = generateID()
        })
      }

      this.addComponent({ component: deepCopy(data) })

      if (this.copyData.isCut) {
        this.copyData = null
      }
    },

    cut(): void {
      if (!this.curComponent) {
        ElMessage.warning('请选择组件')
        return
      }

      this.cutWithCommand()
    },

    // ==================== 版本管理 ====================

    saveVersion(name: string, description: string): void {
      const version: PageVersion = {
        id: generateID(),
        name,
        description,
        snapshot: deepCopy(this.componentData),
        createdAt: new Date().toISOString(),
      }
      this.versions.push(version)
      this.saveVersionsToStorage()
      ElMessage.success('版本保存成功')
    },

    restoreVersion(versionId: string): void {
      const version = this.versions.find(v => v.id === versionId)
      if (version) {
        this.importDataWithCommand(deepCopy(version.snapshot))
        ElMessage.success('版本恢复成功')
      }
    },

    deleteVersion(versionId: string): void {
      this.versions = this.versions.filter(v => v.id !== versionId)
      this.saveVersionsToStorage()
      ElMessage.success('版本删除成功')
    },

    saveVersionsToStorage(): void {
      localStorage.setItem('pageVersions', JSON.stringify(this.versions))
    },

    loadVersionsFromStorage(): void {
      const data = localStorage.getItem('pageVersions')
      if (data) {
        try {
          const parsed = JSON.parse(data)
          const result = validatePageVersions(parsed)
          if (result.success && result.data) {
            this.versions = result.data
          } else {
            console.warn('版本数据校验失败，已重置:', result.errors)
            this.versions = []
          }
        } catch {
          this.versions = []
        }
      }
    },
  },
})

export function setDefaultcomponentData(data: ComponentData[] = []): void {
  const store = useStore()
  store.setComponentData(data)
}

// 导入类型用于 compose 方法





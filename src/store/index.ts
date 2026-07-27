import { defineStore } from 'pinia'
import type {
    StoreState,
    ComponentData,
    CanvasStyleData,
    AreaData,
    SetCurComponentPayload,
    SetShapeStylePayload,
    AddComponentPayload,
    AddEventPayload,
    AlterAnimationPayload,
    ShowContextMenuPayload,
} from '@/types'
import { deepCopy, $ } from '@/utils/utils'
import type { AnimationItem } from '@/utils/animationClassData'
import { ElMessage } from 'element-plus'
import generateID from '@/utils/generateID'
import { setCommandContext } from '@/commands/BaseCommand'
import { createCommandContext } from '@/commands/localContext'
import { moveArrayItem, normalizeComponentLayerOrder, normalizeComponentZIndex, resolveLayerInsertIndex } from '@/utils/layer'

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

        /**
         * 注入命令上下文(初始化时调用)。
         */
        initCommandContext(): void {
            setCommandContext(createCommandContext())
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

            if (top !== undefined) { this.curComponent.style.top = Math.round(top) }
            if (left !== undefined) { this.curComponent.style.left = Math.round(left) }
            if (width !== undefined) { this.curComponent.style.width = Math.round(width) }
            if (height !== undefined) { this.curComponent.style.height = Math.round(height) }
            if (rotate !== undefined) { this.curComponent.style.rotate = Math.round(rotate) }
        },

        setShapeSingleStyle({ key, value }: { key: string; value: unknown }): void {
            if (this.curComponent) {
                (this.curComponent.style as Record<string, unknown>)[key] = value
            }
        },

        setComponentData(componentData: ComponentData[] = []): void {
            this.componentData = componentData
            // 统一图层策略：数组顺序为准，zIndex 按数组顺序连续镜像
            this.ensureZIndex()
            this.markDataDirty()
        },

        addComponent({ component, index }: AddComponentPayload): void {
            const insertIndex = resolveLayerInsertIndex(this.componentData.length, index)
            this.componentData.splice(insertIndex, 0, component)
            normalizeComponentZIndex(this.componentData)
            this.markDataDirty()
        },

        /**
         * 按 zIndex 兼容旧数据后，再按数组顺序分配连续 zIndex（1,2,3...）
         */
        ensureZIndex(): void {
            normalizeComponentLayerOrder(this.componentData)
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
                normalizeComponentZIndex(this.componentData)
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

        upComponent(): void {
            if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
            const index = this.componentData.findIndex(c => c.id === this.curComponent!.id)
            if (index === -1 || index >= this.componentData.length - 1) { ElMessage.warning('已经到顶了'); return }
            moveArrayItem(this.componentData, index, index + 1)
            normalizeComponentZIndex(this.componentData)
            this.curComponentIndex = index + 1
            this.markDataDirty()
        },

        downComponent(): void {
            if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
            const index = this.componentData.findIndex(c => c.id === this.curComponent!.id)
            if (index <= 0) { ElMessage.warning('已经到底了'); return }
            moveArrayItem(this.componentData, index, index - 1)
            normalizeComponentZIndex(this.componentData)
            this.curComponentIndex = index - 1
            this.markDataDirty()
        },

        topComponent(): void {
            if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
            const index = this.componentData.findIndex(c => c.id === this.curComponent!.id)
            if (index === -1 || index >= this.componentData.length - 1) { ElMessage.warning('已经到顶了'); return }
            moveArrayItem(this.componentData, index, this.componentData.length - 1)
            normalizeComponentZIndex(this.componentData)
            this.curComponentIndex = this.componentData.length - 1
            this.markDataDirty()
        },

        bottomComponent(): void {
            if (!this.curComponent) { ElMessage.warning('请选择组件'); return }
            const index = this.componentData.findIndex(c => c.id === this.curComponent!.id)
            if (index <= 0) { ElMessage.warning('已经到底了'); return }
            moveArrayItem(this.componentData, index, 0)
            normalizeComponentZIndex(this.componentData)
            this.curComponentIndex = 0
            this.markDataDirty()
        },

        addAnimation(animation: AnimationItem | { label: string; value: string }): void {
            if (this.curComponent) {
                this.curComponent.animations.push({
                    label: animation.label,
                    type: animation.value,
                    duration: 1000,
                    delay: 0,
                    iterationNum: 1,
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

        setEditMode(mode: 'edit' | 'preview'): void {
            this.editMode = mode
        },

        setInEditorStatus(status: boolean): void {
            this.isInEditor = status
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

    },
})

export function setDefaultcomponentData(data: ComponentData[] = []): void {
    const store = useStore()
    store.setComponentData(data)
}

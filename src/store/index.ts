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
    ComponentStyle,
} from '@/types'
import { deepCopy, $ } from '@/utils/utils'
import type { AnimationItem } from '@/utils/animationClassData'
import { ElMessage } from 'element-plus'
import generateID from '@/utils/generateID'
import { setCommandContext } from '@/commands/BaseCommand'
import { applyLocalChange, getCollab } from '@/collab/useCollabStore'
import { createCommandContext } from '@/collab/commandContext'
import { replaceAllComponents, fromComponentData, findYMapIndex, writeCanvas } from '@/collab/yDoc'
import { isApplyingRemote } from '@/collab/undoOrigin'
import * as Y from 'yjs'

// ==================== Yjs 镜像助手 ====================
// store 中非命令路径(setComponentData/addComponent/setShapeStyle 等)的变更,
// 需镜像到 Yjs 文档以同步给协同端。命令路径经 CommandContext 已自行镜像。

/** 把当前 componentData 整体灌入 Yjs(用于加载/导入) */
function syncAllToYjs(componentData: ComponentData[]): void {
    const collab = getCollab()
    if (!collab) return
    applyLocalChange(() => {
        replaceAllComponents(collab.collabDoc.yComponents, componentData)
    })
}

/** 把单个组件的样式增量同步到 Yjs(属性级) */
function syncStyleToYjs(componentId: string, patch: Partial<ComponentStyle>): void {
    const collab = getCollab()
    if (!collab) return
    const arr = collab.collabDoc.yComponents
    const idx = findYMapIndex(arr, componentId)
    if (idx < 0) return
    const ymap = arr.get(idx)
    let styleMap = ymap.get('style') as Y.Map<unknown> | undefined
    applyLocalChange(() => {
        if (!styleMap) {
            styleMap = new Y.Map()
            ymap.set('style', styleMap)
        }
        for (const [k, v] of Object.entries(patch)) {
            styleMap!.set(k, v)
        }
    })
}

/** 把单个组件整体同步到 Yjs */
function syncComponentToYjs(component: ComponentData): void {
    const collab = getCollab()
    if (!collab) return
    const arr = collab.collabDoc.yComponents
    const idx = findYMapIndex(arr, component.id)
    applyLocalChange(() => {
        if (idx >= 0) {
            fromComponentData(arr.get(idx), component)
        } else {
            const ymap = new Y.Map()
            fromComponentData(ymap, component)
            arr.push([ymap])
        }
    })
}

/** 从 Yjs 按 id 删除一个组件 */
function syncRemoveToYjs(componentId: string): void {
    const collab = getCollab()
    if (!collab) return
    const arr = collab.collabDoc.yComponents
    const idx = findYMapIndex(arr, componentId)
    if (idx >= 0) {
        applyLocalChange(() => arr.delete(idx, 1))
    }
}

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
         * 注入命令上下文(协同初始化时调用)。
         * 命令经 ctx 操作组件数据,ctx 内部镜像到 Yjs。
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
            if (!isApplyingRemote()) {
                const collab = getCollab()
                if (collab) applyLocalChange(() => writeCanvas(collab.collabDoc.yCanvas, style))
            }
        },

        setCurComponent({ component, index }: SetCurComponentPayload): void {
            this.curComponent = component
            this.curComponentIndex = index
        },

        setShapeStyle({ top, left, width, height, rotate }: SetShapeStylePayload): void {
            if (!this.curComponent) return

            const patch: Partial<ComponentStyle> = {}
            if (top !== undefined) { this.curComponent.style.top = Math.round(top); patch.top = this.curComponent.style.top }
            if (left !== undefined) { this.curComponent.style.left = Math.round(left); patch.left = this.curComponent.style.left }
            if (width !== undefined) { this.curComponent.style.width = Math.round(width); patch.width = this.curComponent.style.width }
            if (height !== undefined) { this.curComponent.style.height = Math.round(height); patch.height = this.curComponent.style.height }
            if (rotate !== undefined) { this.curComponent.style.rotate = Math.round(rotate); patch.rotate = this.curComponent.style.rotate }

            // 拖拽/缩放期间高频更新:属性级同步到 Yjs(远端推送时跳过)
            if (!isApplyingRemote() && Object.keys(patch).length > 0) {
                syncStyleToYjs(this.curComponent.id, patch)
            }
        },

        setShapeSingleStyle({ key, value }: { key: string; value: unknown }): void {
            if (this.curComponent) {
                (this.curComponent.style as Record<string, unknown>)[key] = value
                if (!isApplyingRemote()) {
                    syncStyleToYjs(this.curComponent.id, { [key]: value } as Partial<ComponentStyle>)
                }
            }
        },

        setComponentData(componentData: ComponentData[] = []): void {
            this.componentData = componentData
            // 兼容旧数据：为没有 zIndex 的组件自动分配（循环进位 +2，避免冲突）
            this.ensureZIndex()
            if (!isApplyingRemote()) syncAllToYjs(this.componentData)
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
            if (!isApplyingRemote()) syncComponentToYjs(component)
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
                const removed = this.componentData.splice(index, 1)
                if (!isApplyingRemote() && removed[0]) syncRemoveToYjs(removed[0].id)
                this.markDataDirty()
            }
        },

        toggleRightList(): void {
            this.rightList = !this.rightList
        },

        updateComponentProps(data: Partial<ComponentData>): void {
            if (this.curComponent) {
                Object.assign(this.curComponent, data)
                if (!isApplyingRemote()) syncComponentToYjs(this.curComponent)
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
                if (!isApplyingRemote()) syncComponentToYjs(this.curComponent)
            }
        },

        removeAnimation(index: number): void {
            if (this.curComponent) {
                this.curComponent.animations.splice(index, 1)
                if (!isApplyingRemote()) syncComponentToYjs(this.curComponent)
            }
        },

        addEvent({ event, param }: AddEventPayload): void {
            if (this.curComponent) {
                this.curComponent.events[event] = param
                if (!isApplyingRemote()) syncComponentToYjs(this.curComponent)
            }
        },

        removeEvent(event: string): void {
            if (this.curComponent) {
                delete this.curComponent.events[event]
                if (!isApplyingRemote()) syncComponentToYjs(this.curComponent)
            }
        },

        alterAnimation({ index, data = {} }: AlterAnimationPayload): void {
            if (this.curComponent && typeof index === 'number') {
                const original = this.curComponent.animations[index]
                if (original) {
                    this.curComponent.animations[index] = { ...original, ...data }
                    if (!isApplyingRemote()) syncComponentToYjs(this.curComponent)
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
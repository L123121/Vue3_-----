<template>
    <div
        id="editor"
        class="editor"
        :class="{ edit: props.isEdit }"
        :style="{
            ...getCanvasStyle(canvasStyleData),
            width: changeStyleWithScale(canvasStyleData.width) + 'px',
            height: changeStyleWithScale(canvasStyleData.height) + 'px',
        }"
        @contextmenu="handleContextMenu"
        @mousedown="handleMouseDown"
    >
        <!-- 网格线 -->
        <Grid :is-dark-mode="isDarkMode" />

        <!--页面组件列表展示（递归渲染，支持 parentId 嵌套）-->
        <NodeRenderer
            v-for="item in visibleComponents"
            :key="item.id"
            :node="item"
            :index="componentIndexMap.get(item.id) ?? 0"
        />
        <!-- 右击菜单 -->
        <ContextMenu />
        <!-- 标线 -->
        <MarkLine />
        <!-- 选中区域 -->
        <Area
            v-show="isShowArea"
            :start="start"
            :width="width"
            :height="height"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import ContextMenu from './ContextMenu.vue'
import MarkLine from './MarkLine.vue'
import Area from './Area.vue'
import Grid from './Grid.vue'
import NodeRenderer from './NodeRenderer.vue'
import eventBus from '@/utils/eventBus'
import { provideEditorContext } from '@/composables/useEditorContext'
import {
    getComponentRotatedStyle,
    getCanvasStyle,
} from '@/utils/style'
import { $, isPreventDrop } from '@/utils/utils'
import { changeStyleWithScale } from '@/utils/translate'
import { isInViewport } from '@/utils/performance'
import type { ComponentData } from '@/types'

interface Props {
  isEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isEdit: true,
})

const store = useStore()
const { componentData, curComponent, canvasStyleData, editor, isDarkMode } = storeToRefs(store)

// 提供编辑器上下文给子组件（Shape、MarkLine、Area）
const editorContext = provideEditorContext()

const editorX = ref(0)
const editorY = ref(0)
const start = ref({ x: 0, y: 0 })
const width = ref(0)
const height = ref(0)
const isShowArea = ref(false)

// 视口裁剪：只渲染根级组件（无 parentId），子组件由 NodeRenderer 递归渲染
const visibleComponents = computed(() => {
    // 筛选出根级组件（parentId 为空）
    const rootComponents = componentData.value.filter(c => !c.parentId)

    // 如果组件数量较少，直接返回所有根组件
    if (rootComponents.length < 20) {
        return rootComponents
    }

    // 获取画布尺寸和滚动位置
    const viewportWidth = editor.value?.clientWidth ?? 1920
    const viewportHeight = editor.value?.clientHeight ?? 1080

    return rootComponents.filter(item => {
        const { top, left, width: w, height: h } = item.style
        return isInViewport(
            { top: top ?? 0, left: left ?? 0, width: w, height: h },
            { viewportWidth, viewportHeight, buffer: 200 },
        )
    })
})

// 组件 id → 原始数组索引的映射（O(1) 查找）
const componentIndexMap = computed(() => {
    const map = new Map<string, number>()
    componentData.value.forEach((c, i) => map.set(c.id, i))
    return map
})

onMounted(() => {
    // 获取编辑器元素
    store.getEditor()

    // 注册 hideArea 回调（editorContext 用于内部触发，eventBus 用于 store 触发）
    editorContext.onHideArea(hideArea)
    eventBus.on('hideArea', hideArea)
})

onUnmounted(() => {
    eventBus.off('hideArea', hideArea)
})

function handleMouseDown(e: MouseEvent): void {
    // 如果没有选中组件 在画布上点击时需要调用 e.preventDefault() 防止触发 drop 事件
    if (!curComponent.value || isPreventDrop(curComponent.value.component)) {
        e.preventDefault()
    }

    hideArea()

    // 获取编辑器的位移信息，每次点击时都需要获取一次。主要是为了方便开发时调试用。
    const rectInfo = editor.value!.getBoundingClientRect()
    editorX.value = rectInfo.x
    editorY.value = rectInfo.y

    const startX = e.clientX
    const startY = e.clientY
    start.value.x = startX - editorX.value
    start.value.y = startY - editorY.value
    // 展示选中区域
    isShowArea.value = true

    // 框选期间禁止文字选中
    const preventSelect = (e: Event) => e.preventDefault()
    document.addEventListener('selectstart', preventSelect)

    const move = (moveEvent: MouseEvent): void => {
        width.value = Math.abs(moveEvent.clientX - startX)
        height.value = Math.abs(moveEvent.clientY - startY)
        if (moveEvent.clientX < startX) {
            start.value.x = moveEvent.clientX - editorX.value
        }

        if (moveEvent.clientY < startY) {
            start.value.y = moveEvent.clientY - editorY.value
        }
    }

    const up = (e: MouseEvent): void => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.removeEventListener('selectstart', preventSelect)

        if (e.clientX === startX && e.clientY === startY) {
            hideArea()
            return
        }

        createGroup()
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
}

function hideArea(): void {
    isShowArea.value = false
    width.value = 0
    height.value = 0

    store.setAreaData({
        style: {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
        },
        components: [],
    })
}

function createGroup(): void {
    // 获取选中区域的组件数据
    const areaData = getSelectArea()
    if (areaData.length <= 1) {
        hideArea()
        return
    }

    // 根据选中区域和区域中每个组件的位移信息来创建 Group 组件
    // 要遍历选择区域的每个组件，获取它们的 left top right bottom 信息来进行比较
    let top = Infinity,
        left = Infinity
    let right = -Infinity,
        bottom = -Infinity
    areaData.forEach(component => {
        let style: { left?: number; top?: number; right?: number; bottom?: number } = {}
        if (component.component === 'Group') {
            (component.propValue as ComponentData[]).forEach(item => {
                const rectInfo = $(`#component${item.id}`)!.getBoundingClientRect()
                style.left = rectInfo.left - editorX.value
                style.top = rectInfo.top - editorY.value
                style.right = rectInfo.right - editorX.value
                style.bottom = rectInfo.bottom - editorY.value

                if (style.left < left) left = style.left
                if (style.top < top) top = style.top
                if (style.right > right) right = style.right
                if (style.bottom > bottom) bottom = style.bottom
            })
        } else {
            style = getComponentRotatedStyle(component.style)
        }

        if (style.left !== undefined && style.left < left) left = style.left
        if (style.top !== undefined && style.top < top) top = style.top
        if (style.right !== undefined && style.right > right) right = style.right
        if (style.bottom !== undefined && style.bottom > bottom) bottom = style.bottom
    })

    start.value.x = left
    start.value.y = top
    width.value = right - left
    height.value = bottom - top

    // 设置选中区域位移大小信息和区域内的组件数据
    store.setAreaData({
        style: {
            left,
            top,
            width: width.value,
            height: height.value,
        },
        components: areaData,
    })
}

function getSelectArea(): ComponentData[] {
    const result: ComponentData[] = []
    // 区域起点坐标
    const { x, y } = start.value
    // 计算所有的组件数据，判断是否在选中区域内
    componentData.value.forEach(component => {
        if (component.isLock) return

        const rotatedStyle = getComponentRotatedStyle(component.style)
        const { left = 0, top = 0, right = 0, bottom = 0 } = rotatedStyle
        const compWidth = right - left
        const compHeight = bottom - top
        if (
            x <= left &&
      y <= top &&
      left + compWidth <= x + width.value &&
      top + compHeight <= y + height.value
        ) {
            result.push(component)
        }
    })

    // 返回在选中区域内的所有组件
    return result
}

function handleContextMenu(e: MouseEvent): void {
    e.stopPropagation()
    e.preventDefault()

    // 计算菜单相对于编辑器的位移
    let target = e.target as HTMLElement
    let top = e.offsetY
    let left = e.offsetX
    while (target instanceof SVGElement) {
        target = target.parentNode as HTMLElement
    }

    while (!target.className.includes('editor')) {
        left += target.offsetLeft
        top += target.offsetTop
        target = target.parentNode as HTMLElement
    }

    store.showContextMenu({ top, left })
}
</script>

<style lang="scss" scoped>
.editor {
  position: relative;
  background: var(--main-bg-color);
  margin: auto;

  .lock {
    opacity: 0.5;

    &:hover {
      cursor: not-allowed;
    }
  }
}

.edit {
  .component {
    outline: none;
    width: 100%;
    height: 100%;
  }
}
</style>

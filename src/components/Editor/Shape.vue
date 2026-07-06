<template>
    <div
        ref="shapeRef"
        class="shape"
        :class="{ active }"
        @click="selectCurComponent"
        @mousedown.capture="handleMouseDownOnShape"
    >
        <el-icon v-show="isActive()" class="icon-xiangyouxuanzhuan" @mousedown="handleRotate">
            <RefreshRight />
        </el-icon>
        <el-icon v-show="element.isLock" class="icon-suo">
            <Lock />
        </el-icon>
        <div
            v-for="item in isActive() ? getPointList() : []"
            :key="item"
            class="shape-point"
            :style="getPointStyle(item)"
            @mousedown="handleMouseDownOnPoint(item, $event)"
        />
        <slot />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { RefreshRight, Lock } from '@element-plus/icons-vue'
import eventBus from '@/utils/eventBus'
import { useEditorContext } from '@/composables/useEditorContext'
import runAnimation from '@/utils/runAnimation'
import calculateComponentPositionAndSize from '@/utils/calculateComponentPositionAndSize'
import { mod360 } from '@/utils/translate'
import { isPreventDrop } from '@/utils/utils'
import { createRAFThrottle } from '@/utils/performance'
import type { ComponentData, ComponentStyle } from '@/types'
import { moveComponent, resizeComponent, rotateComponent } from '@/composables/useCommandActions'

interface Props {
  active?: boolean
  element: ComponentData
  defaultStyle: ComponentStyle
  index: number
}

const props = withDefaults(defineProps<Props>(), {
    active: false,
})

const store = useStore()
const { curComponent, editor } = storeToRefs(store)

const shapeRef = ref<HTMLElement | null>(null)
const pointList = ['lt', 't', 'rt', 'r', 'rb', 'b', 'lb', 'l'] as const // 八个方向
const pointList2 = ['r', 'l'] as const // 左右两个方向

type PointName = (typeof pointList)[number]

const initialAngle: Record<PointName, number> = {
    // 每个点对应的初始角度
    lt: 0,
    t: 45,
    rt: 90,
    r: 135,
    rb: 180,
    b: 225,
    lb: 270,
    l: 315,
}

interface AngleCursor {
  start: number
  end: number
  cursor: string
}

const angleToCursor: AngleCursor[] = [
    // 每个范围的角度对应的光标
    { start: 338, end: 23, cursor: 'nw' },
    { start: 23, end: 68, cursor: 'n' },
    { start: 68, end: 113, cursor: 'ne' },
    { start: 113, end: 158, cursor: 'e' },
    { start: 158, end: 203, cursor: 'se' },
    { start: 203, end: 248, cursor: 's' },
    { start: 248, end: 293, cursor: 'sw' },
    { start: 293, end: 338, cursor: 'w' },
]
const cursors = ref<Record<string, string>>({})
const editorCtx = useEditorContext()

onMounted(() => {
    // 用于 Group 组件
    if (curComponent.value) {
        cursors.value = getCursor() // 根据旋转角度获取光标位置
    }
    // 通过 editorContext 注册动画回调（替代 eventBus）
    editorCtx.onRunAnimation(handleRunAnimation)
    editorCtx.onStopAnimation(handleStopAnimation)
})

function handleRunAnimation(): void {
    if (props.element === curComponent.value && shapeRef.value) {
        runAnimation(shapeRef.value, curComponent.value.animations)
    }
}

function handleStopAnimation(): void {
    if (shapeRef.value) {
        shapeRef.value.classList.remove('animated', 'infinite')
    }
}

function getPointList(): readonly string[] {
    return props.element.component === 'LineShape' ? pointList2 : pointList
}

function isActive(): boolean {
    return props.active && !props.element.isLock
}

// 处理旋转
function handleRotate(e: MouseEvent): void {
    store.setClickComponentStatus(true)
    e.preventDefault()
    e.stopPropagation()
    // 初始坐标和初始角度
    const pos = { ...props.defaultStyle }
    const startY = e.clientY
    const startX = e.clientX
    const startRotate = pos.rotate ?? 0

    // 获取元素中心点位置
    const rect = shapeRef.value!.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // 旋转前的角度
    const rotateDegreeBefore = Math.atan2(startY - centerY, startX - centerX) / (Math.PI / 180)

    // 旋转期间禁止文字选中
    const preventSelect = (e: Event): void => e.preventDefault()
    document.addEventListener('selectstart', preventSelect)

    // 如果元素没有移动，则不保存快照
    let hasMove = false
    let newRotate = startRotate

    // 使用 RAF 批处理优化旋转更新
    const throttledSetShapeStyle = createRAFThrottle(((style: ComponentStyle) => {
        store.setShapeStyle(style)
    }) as (...args: unknown[]) => void)

    const move = (moveEvent: MouseEvent): void => {
        hasMove = true
        const curX = moveEvent.clientX
        const curY = moveEvent.clientY
        // 旋转后的角度
        const rotateDegreeAfter = Math.atan2(curY - centerY, curX - centerX) / (Math.PI / 180)
        // 获取旋转的角度值
        newRotate = startRotate + rotateDegreeAfter - rotateDegreeBefore
        pos.rotate = newRotate
        // 使用 RAF 批处理更新样式
        throttledSetShapeStyle(pos)
    }

    const up = (): void => {
        if (hasMove) rotateComponent(props.element.id, startRotate, newRotate)
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.removeEventListener('selectstart', preventSelect)
        cursors.value = getCursor() // 根据旋转角度获取光标位置
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
}

function getPointStyle(point: string): Record<string, string> {
    const { width, height } = props.defaultStyle
    const hasT = /t/.test(point)
    const hasB = /b/.test(point)
    const hasL = /l/.test(point)
    const hasR = /r/.test(point)
    let newLeft = 0
    let newTop = 0

    // 四个角的点
    if (point.length === 2) {
        newLeft = hasL ? 0 : width
        newTop = hasT ? 0 : height
    } else {
    // 上下两点的点，宽度居中
        if (hasT || hasB) {
            newLeft = width / 2
            newTop = hasT ? 0 : height
        }

        // 左右两边的点，高度居中
        if (hasL || hasR) {
            newLeft = hasL ? 0 : width
            newTop = Math.floor(height / 2)
        }
    }

    const style: Record<string, string> = {
        marginLeft: '-4px',
        marginTop: '-4px',
        left: `${newLeft}px`,
        top: `${newTop}px`,
        cursor: cursors.value[point] || 'pointer',
    }

    return style
}

function getCursor(): Record<string, string> {
    if (!curComponent.value) return {}

    const rotate = mod360(curComponent.value.style.rotate ?? 0) // 取余 360
    const result: Record<string, string> = {}
    let lastMatchIndex = -1 // 从上一个命中的角度的索引开始匹配下一个，降低时间复杂度

    pointList.forEach(point => {
        const angle = mod360(initialAngle[point as PointName] + rotate)
        const len = angleToCursor.length

        // 轮询匹配光标方向：循环体内通过 return 退出，不会真正死循环
        // eslint-disable-next-line no-constant-condition
        while (true) {
            lastMatchIndex = (lastMatchIndex + 1) % len
            const angleLimit = angleToCursor[lastMatchIndex]
            if (angle < 23 || angle >= 338) {
                result[point] = 'nw-resize'
                return
            }

            if (angleLimit.start <= angle && angle < angleLimit.end) {
                result[point] = angleLimit.cursor + '-resize'
                return
            }
        }
    })

    return result
}

function handleMouseDownOnShape(e: MouseEvent): void {
    // 将当前点击组件的事件传播出去，目前的消费是 VText 组件
    nextTick(() => eventBus.emit('componentClick'))

    store.setInEditorStatus(true)
    store.setClickComponentStatus(true)
    if (isPreventDrop(props.element.component)) {
        e.preventDefault()
    }

    e.stopPropagation()
    store.setCurComponent({ component: props.element, index: props.index })
    if (props.element.isLock) return

    cursors.value = getCursor() // 根据旋转角度获取光标位置

    const pos = { ...props.defaultStyle }
    let startY = e.clientY
    let startX = e.clientX
    // 如果直接修改属性，值的类型会变为字符串，所以要转为数值型
    let startTop = Number(pos.top ?? 0)
    let startLeft = Number(pos.left ?? 0)

    // 记录起始位置（用于命令）
    const oldStyle = { top: startTop, left: startLeft }
    let newStyle = { ...oldStyle }

    // 拖拽期间禁止文字选中
    const preventSelect = (e: Event): void => e.preventDefault()
    document.addEventListener('selectstart', preventSelect)

    // 如果元素没有移动，则不保存快照
    let hasMove = false

    // RAF 节流：将当前位移提交到 store 并重设基线，让 transform 始终保持微量偏移
    const throttledMove = createRAFThrottle(((curX: number, curY: number) => {
        const newTop = startTop + (curY - startY)
        const newLeft = startLeft + (curX - startX)
        pos.top = newTop
        pos.left = newLeft
        newStyle = { top: newTop, left: newLeft }

        // 1) 提交到 store，触发标线读取正确位置
        store.setShapeStyle({ top: newTop, left: newLeft })
        editorCtx.startMove(curY - startY > 0, curX - startX > 0)

        // 2) 重设基线，下一帧的 transform 只计算增量偏移
        startY = curY
        startX = curX
        startTop = newTop
        startLeft = newLeft

        // 3) 清除 transform（store 中的 top/left 已反映正确位置）
        if (shapeRef.value) {
            shapeRef.value.style.transform = ''
        }
    }) as (...args: unknown[]) => void)

    const move = (moveEvent: MouseEvent): void => {
        hasMove = true
        const curX = moveEvent.clientX
        const curY = moveEvent.clientY
        const deltaX = curX - startX
        const deltaY = curY - startY

        // 直接 DOM 操作：微量 transform，每帧 RAF 提交后会归零
        if (shapeRef.value) {
            shapeRef.value.style.transform = `translate(${deltaX}px, ${deltaY}px)`
        }

        throttledMove(curX, curY)
    }

    const up = (): void => {
        if (shapeRef.value) {
            shapeRef.value.style.transform = ''
        }

        if (hasMove) {
            store.setShapeStyle(pos)
            moveComponent(props.element.id, oldStyle, newStyle)
        }

        editorCtx.stopMove()
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.removeEventListener('selectstart', preventSelect)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
}

function selectCurComponent(e: MouseEvent): void {
    // 阻止向父组件冒泡
    e.stopPropagation()
    e.preventDefault()
    store.hideContextMenu()
    // 打开右侧组件列表
    if (!store.rightList) {
        store.toggleRightList()
    }
}

function handleMouseDownOnPoint(point: string, e: MouseEvent): void {
    store.setInEditorStatus(true)
    store.setClickComponentStatus(true)
    e.stopPropagation()
    e.preventDefault()

    const style = { ...props.defaultStyle }

    // 记录起始样式（用于命令）
    const oldStyle = {
        width: style.width,
        height: style.height,
        top: style.top,
        left: style.left,
    }

    // 组件宽高比
    const proportion = style.width / style.height

    // 组件中心点
    const center = {
        x: (style.left ?? 0) + style.width / 2,
        y: (style.top ?? 0) + style.height / 2,
    }

    // 获取画布位移信息
    const editorRectInfo = editor.value!.getBoundingClientRect()

    // 获取 point 与实际拖动基准点的差值
    const target = e.target as HTMLElement
    const pointRect = target.getBoundingClientRect()
    // 当前点击圆点相对于画布的中心坐标
    const curPoint = {
        x: Math.round(pointRect.left - editorRectInfo.left + target.offsetWidth / 2),
        y: Math.round(pointRect.top - editorRectInfo.top + target.offsetHeight / 2),
    }

    // 获取对称点的坐标
    const symmetricPoint = {
        x: center.x - (curPoint.x - center.x),
        y: center.y - (curPoint.y - center.y),
    }

    // 是否需要保存快照
    let needSave = false
    let isFirst = true

    // 缩放期间禁止文字选中
    const preventSelect = (e: Event): void => e.preventDefault()
    document.addEventListener('selectstart', preventSelect)

    // 使用 RAF 批处理优化缩放更新
    const throttledSetShapeStyle = createRAFThrottle(((style: ComponentStyle) => {
        store.setShapeStyle(style)
    }) as (...args: unknown[]) => void)

    const needLockProportion = isNeedLockProportion()
    const move = (moveEvent: MouseEvent): void => {
    // 第一次点击时也会触发 move，所以会有"刚点击组件但未移动，组件的大小却改变了"的情况发生
    // 因此第一次点击时不触发 move 事件
        if (isFirst) {
            isFirst = false
            return
        }

        needSave = true
        const curPosition = {
            x: moveEvent.clientX - Math.round(editorRectInfo.left),
            y: moveEvent.clientY - Math.round(editorRectInfo.top),
        }

        calculateComponentPositionAndSize(
      point as 'lt' | 't' | 'rt' | 'r' | 'rb' | 'b' | 'lb' | 'l',
      style,
      curPosition,
      proportion,
      needLockProportion,
      {
          symmetricPoint,
          curPoint,
      },
        )

        // 使用 RAF 批处理更新样式
        throttledSetShapeStyle(style)
    }

    const up = (): void => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.removeEventListener('selectstart', preventSelect)
        if (needSave) {
            const newStyle = {
                width: style.width,
                height: style.height,
                top: style.top,
                left: style.left,
            }
            resizeComponent(props.element.id, oldStyle, newStyle)
        }
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
}

function isNeedLockProportion(): boolean {
    if (props.element.component !== 'Group') return false
    const rotates = [0, 90, 180, 360]
    for (const component of props.element.propValue as ComponentData[]) {
        if (!rotates.includes(mod360(parseInt(String(component.style.rotate ?? 0))))) {
            return true
        }
    }

    return false
}
</script>

<style lang="scss" scoped>
.shape {
  position: absolute;

  &:hover {
    cursor: move;
  }
}

.active {
  outline: 1px solid #70c0ff;
  user-select: none;
}

.shape-point {
  position: absolute;
  background: #fff;
  border: 1px solid #59c7f9;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 1;
}

.icon-xiangyouxuanzhuan {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  cursor: grab;
  color: #59c7f9;
  font-size: 20px;
  font-weight: 600;

  &:active {
    cursor: grabbing;
  }
}

.icon-suo {
  position: absolute;
  top: 0;
  right: 0;
}
</style>

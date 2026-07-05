<template>
    <div class="mark-line">
        <div
            v-for="line in lines"
            v-show="lineStatus[line] || false"
            :key="line"
            :ref="(el) => { if (el) lineRefs[line] = el as HTMLElement }"
            class="line"
            :class="line.includes('x') ? 'xline' : 'yline'"
        />
    </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useEditorContext } from '@/composables/useEditorContext'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { getComponentRotatedStyle } from '@/utils/style'
import { throttle } from '@/utils/performance'
import type { RotatedStyle } from '@/utils/style'

const store = useStore()
const { curComponent, componentData } = storeToRefs(store)

const lines = ['xt', 'xc', 'xb', 'yl', 'yc', 'yr'] as const // 分别对应三条横线和三条竖线
type LineName = (typeof lines)[number]
const diff = 3 // 相距 diff 像素将自动吸附

const lineStatus = reactive<Record<LineName, boolean>>({
    xt: false,
    xc: false,
    xb: false,
    yl: false,
    yc: false,
    yr: false,
})

const lineRefs: Record<string, HTMLElement> = {}

interface Condition {
  isNearly: boolean
  lineNode: HTMLElement
  line: LineName
  dragShift: number
  lineShift: number
}

// 使用节流优化吸附检测，限制为 ~60fps
const throttledShowLine = throttle(showLine as (...args: unknown[]) => void, 16)

// 通过 editorContext 监听移动状态（替代 eventBus）
const { moveState } = useEditorContext()

watch(
    () => moveState.isMoving,
    (isMoving) => {
        if (isMoving) {
            throttledShowLine(moveState.isDownward, moveState.isRightward)
        } else {
            hideLine()
        }
    },
)

function hideLine(): void {
    Object.keys(lineStatus).forEach(line => {
        lineStatus[line as LineName] = false
    })
}

function showLine(isDownward: boolean, isRightward: boolean): void {
    if (!curComponent.value) return

    const components = componentData.value
    const curComponentStyle = getComponentRotatedStyle(curComponent.value.style)
    const curComponentHalfWidth = curComponentStyle.width / 2
    const curComponentHalfHeight = curComponentStyle.height / 2
    const curTop = curComponentStyle.top ?? 0
    const curLeft = curComponentStyle.left ?? 0
    const curBottom = curComponentStyle.bottom ?? 0
    const curRight = curComponentStyle.right ?? 0

    hideLine()
    components.forEach(component => {
        if (component === curComponent.value) return
        const componentStyle = getComponentRotatedStyle(component.style)
        const { top = 0, left = 0, bottom = 0, right = 0 } = componentStyle
        const componentHalfWidth = componentStyle.width / 2
        const componentHalfHeight = componentStyle.height / 2

        const conditions: Record<'top' | 'left', Condition[]> = {
            top: [
                {
                    isNearly: isNearly(curTop, top),
                    lineNode: lineRefs.xt,
                    line: 'xt',
                    dragShift: top,
                    lineShift: top,
                },
                {
                    isNearly: isNearly(curBottom, top),
                    lineNode: lineRefs.xt,
                    line: 'xt',
                    dragShift: top - curComponentStyle.height,
                    lineShift: top,
                },
                {
                    // 组件与拖拽节点的中间是否对齐
                    isNearly: isNearly(
                        curTop + curComponentHalfHeight,
                        top + componentHalfHeight,
                    ),
                    lineNode: lineRefs.xc,
                    line: 'xc',
                    dragShift: top + componentHalfHeight - curComponentHalfHeight,
                    lineShift: top + componentHalfHeight,
                },
                {
                    isNearly: isNearly(curTop, bottom),
                    lineNode: lineRefs.xb,
                    line: 'xb',
                    dragShift: bottom,
                    lineShift: bottom,
                },
                {
                    isNearly: isNearly(curBottom, bottom),
                    lineNode: lineRefs.xb,
                    line: 'xb',
                    dragShift: bottom - curComponentStyle.height,
                    lineShift: bottom,
                },
            ],
            left: [
                {
                    isNearly: isNearly(curLeft, left),
                    lineNode: lineRefs.yl,
                    line: 'yl',
                    dragShift: left,
                    lineShift: left,
                },
                {
                    isNearly: isNearly(curRight, left),
                    lineNode: lineRefs.yl,
                    line: 'yl',
                    dragShift: left - curComponentStyle.width,
                    lineShift: left,
                },
                {
                    // 组件与拖拽节点的中间是否对齐
                    isNearly: isNearly(
                        curLeft + curComponentHalfWidth,
                        left + componentHalfWidth,
                    ),
                    lineNode: lineRefs.yc,
                    line: 'yc',
                    dragShift: left + componentHalfWidth - curComponentHalfWidth,
                    lineShift: left + componentHalfWidth,
                },
                {
                    isNearly: isNearly(curLeft, right),
                    lineNode: lineRefs.yr,
                    line: 'yr',
                    dragShift: right,
                    lineShift: right,
                },
                {
                    isNearly: isNearly(curRight, right),
                    lineNode: lineRefs.yr,
                    line: 'yr',
                    dragShift: right - curComponentStyle.width,
                    lineShift: right,
                },
            ],
        }

        const needShow: LineName[] = []
        const rotate = curComponentStyle.rotate
        Object.keys(conditions).forEach(key => {
            const directionKey = key as 'top' | 'left'
            // 遍历符合的条件并处理
            conditions[directionKey].forEach(condition => {
                if (!condition.isNearly) return
                // 修改当前组件位移
                store.setShapeSingleStyle({
                    key: directionKey,
                    value:
            rotate !== 0
                ? translateCurComponentShift(directionKey, condition, curComponentStyle)
                : condition.dragShift,
                })

                condition.lineNode.style[directionKey] = `${condition.lineShift}px`
                needShow.push(condition.line)
            })
        })

        // 同一方向上同时显示三条线可能导致视觉混乱，因此限制为只显示一条
        if (needShow.length) {
            chooseTheTrueLine(needShow, isDownward, isRightward)
        }
    })
}

function translateCurComponentShift(
    key: 'top' | 'left',
    condition: Condition,
    curComponentStyle: RotatedStyle,
): number {
    if (!curComponent.value) return condition.dragShift

    const { width, height } = curComponent.value.style
    if (key === 'top') {
        return Math.round(condition.dragShift - (height - curComponentStyle.height) / 2)
    }

    return Math.round(condition.dragShift - (width - curComponentStyle.width) / 2)
}

function chooseTheTrueLine(
    needShow: LineName[],
    isDownward: boolean,
    isRightward: boolean,
): void {
    // 如果鼠标向右移动，则按从右到左的顺序显示竖线 否则按相反顺序显示
    // 如果鼠标向下移动，则按从下到上的顺序显示横线 否则按相反顺序显示
    if (isRightward) {
        if (needShow.includes('yr')) {
            lineStatus.yr = true
        } else if (needShow.includes('yc')) {
            lineStatus.yc = true
        } else if (needShow.includes('yl')) {
            lineStatus.yl = true
        }
    } else {
        if (needShow.includes('yl')) {
            lineStatus.yl = true
        } else if (needShow.includes('yc')) {
            lineStatus.yc = true
        } else if (needShow.includes('yr')) {
            lineStatus.yr = true
        }
    }

    if (isDownward) {
        if (needShow.includes('xb')) {
            lineStatus.xb = true
        } else if (needShow.includes('xc')) {
            lineStatus.xc = true
        } else if (needShow.includes('xt')) {
            lineStatus.xt = true
        }
    } else {
        if (needShow.includes('xt')) {
            lineStatus.xt = true
        } else if (needShow.includes('xc')) {
            lineStatus.xc = true
        } else if (needShow.includes('xb')) {
            lineStatus.xb = true
        }
    }
}

function isNearly(dragValue: number, targetValue: number): boolean {
    return Math.abs(dragValue - targetValue) <= diff
}
</script>

<style lang="scss" scoped>
.mark-line {
  height: 100%;
}

.line {
  background: #59c7f9;
  position: absolute;
  z-index: 1000;
}

.xline {
  width: 100%;
  height: 1px;
}

.yline {
  width: 1px;
  height: 100%;
}
</style>

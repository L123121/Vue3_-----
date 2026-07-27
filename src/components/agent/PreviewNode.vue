<template>
    <div class="preview-node" :style="wrapperStyle">
        <!-- VTable: inline 渲染，不依赖异步组件 -->
        <table v-if="node.component === 'VTable'" class="preview-vtable" :style="componentStyle">
            <tbody>
                <tr
                    v-for="(row, ri) in tableData"
                    :key="ri"
                    :class="{ stripe: tableStripe && ri % 2, bold: tableBold && ri === 0 }"
                >
                    <td v-for="(cell, ci) in row" :key="ci">
                        {{ cell }}
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- VChart: 占位图，避免加载 echarts -->
        <div v-else-if="node.component === 'VChart'" class="preview-vchart" :style="componentStyle">
            <svg viewBox="0 0 100 60" class="vchart-placeholder">
                <rect
                    x="5"
                    y="30"
                    width="15"
                    height="25"
                    rx="2"
                    fill="var(--chart-color, #409eff)"
                    opacity="0.8"
                />
                <rect
                    x="25"
                    y="15"
                    width="15"
                    height="40"
                    rx="2"
                    fill="var(--chart-color, #409eff)"
                    opacity="0.9"
                />
                <rect
                    x="45"
                    y="25"
                    width="15"
                    height="30"
                    rx="2"
                    fill="var(--chart-color, #409eff)"
                    opacity="0.7"
                />
                <rect
                    x="65"
                    y="10"
                    width="15"
                    height="45"
                    rx="2"
                    fill="var(--chart-color, #409eff)"
                    opacity="0.85"
                />
                <rect
                    x="85"
                    y="20"
                    width="10"
                    height="35"
                    rx="2"
                    fill="var(--chart-color, #409eff)"
                    opacity="0.75"
                />
            </svg>
            <span class="vchart-label">图表</span>
        </div>

        <!-- SVG 组件 -->
        <component
            :is="node.component"
            v-else-if="node.component && node.component.startsWith('SVG')"
            class="component"
            :style="svgStyle"
            :prop-value="node.propValue"
            :element="node"
        />

        <!-- 其他常规组件（VText/VButton/Picture/RectShape/CircleShape/LineShape） -->
        <component
            :is="node.component"
            v-else
            class="component"
            :style="componentStyle"
            :prop-value="node.propValue"
            :element="node"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentData, ComponentStyle } from '@/types'

const props = defineProps<{
  node: ComponentData
}>()

const wrapperStyle = computed((): Record<string, string> => {
    const s = props.node.style
    return {
        position: 'absolute' as const,
        top: `${s.top ?? 0}px`,
        left: `${s.left ?? 0}px`,
        width: `${s.width}px`,
        height: `${s.height}px`,
        transform: s.rotate ? `rotate(${s.rotate}deg)` : '',
        opacity: String(s.opacity ?? 1),
        zIndex: String(props.node.zIndex),
    }
})

const componentStyle = computed(() =>
    buildStyle(props.node.style, ['width', 'height', 'top', 'left', 'rotate']),
)
const svgStyle = computed(() => buildStyle(props.node.style, []))

// VTable 数据解析
const tableData = computed<[][]>(() => {
    const pv = props.node.propValue
    if (Array.isArray(pv)) return pv as unknown as [][]
    if (pv && typeof pv === 'object' && Array.isArray((pv as unknown as Record<string, unknown>).data))
        return (pv as unknown as Record<string, unknown>).data as [][]
    return []
})
const tableStripe = computed(() => {
    const pv = props.node.propValue
    return !!(pv && typeof pv === 'object' && (pv as unknown as Record<string, unknown>).stripe)
})
const tableBold = computed(() => {
    const pv = props.node.propValue
    return !!(pv && typeof pv === 'object' && (pv as unknown as Record<string, unknown>).thBold)
})

function buildStyle(style: ComponentStyle, exclude: string[]) {
    const result: Record<string, string | number> = {}
    const map: Record<string, string> = {
        fontSize: 'fontSize',
        fontWeight: 'fontWeight',
        lineHeight: 'lineHeight',
        letterSpacing: 'letterSpacing',
        textAlign: 'textAlign',
        color: 'color',
        backgroundColor: 'backgroundColor',
        borderColor: 'borderColor',
        borderWidth: 'borderWidth',
        borderStyle: 'borderStyle',
        borderRadius: 'borderRadius',
        padding: 'padding',
    }
    for (const [key, css] of Object.entries(map)) {
        const val = (style as any)[key]
        if (val !== undefined && val !== '' && !exclude.includes(key)) {
            result[css] =
        typeof val === 'number' &&
        ['fontSize', 'fontWeight', 'letterSpacing', 'borderWidth', 'padding'].includes(key)
            ? `${val}px`
            : val
        }
    }
    return result
}
</script>

<style lang="scss" scoped>
.preview-node {
  pointer-events: none;
  user-select: none;

  .component {
    width: 100%;
    height: 100%;
  }
}

.preview-vtable {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  word-break: break-all;

  td {
    border: 1px solid #ebeef5;
    padding: 6px 8px;
    font-size: 12px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bold td {
    font-weight: bold;
  }

  .stripe {
    background-color: #fafafa;
  }
}

.preview-vchart {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .vchart-placeholder {
    width: 80%;
    height: 70%;
  }

  .vchart-label {
    position: absolute;
    bottom: 4px;
    font-size: 10px;
    color: #999;
  }
}
</style>

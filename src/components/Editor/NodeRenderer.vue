<template>
    <Shape
        :default-style="node.style"
        :style="{ ...getShapeStyle(node.style), zIndex: node.zIndex }"
        :active="node.id === curComponent?.id"
        :element="node"
        :index="index"
        :class="{ lock: node.isLock }"
    >
        <!-- SVG 组件 -->
        <component
            :is="node.component"
            v-if="node.component.startsWith('SVG')"
            :id="'component' + node.id"
            :style="getSVGStyle(node.style)"
            class="component"
            :prop-value="node.propValue"
            :element="node"
            :request="node.request"
            :linkage="node.linkage"
        >
            <!-- 子组件通过插槽注入 -->
            <template v-if="children.length">
                <NodeRenderer
                    v-for="child in children"
                    :key="child.id"
                    :node="child"
                    :index="getIndex(child.id)"
                />
            </template>
        </component>

        <!-- 非 VText 组件（含容器） -->
        <component
            :is="node.component"
            v-else-if="node.component !== 'VText'"
            :id="'component' + node.id"
            class="component"
            :style="getComponentStyle(node.style)"
            :prop-value="node.propValue"
            :element="node"
            :request="node.request"
            :linkage="node.linkage"
        >
            <!-- 子组件通过插槽注入 -->
            <template v-if="children.length">
                <NodeRenderer
                    v-for="child in children"
                    :key="child.id"
                    :node="child"
                    :index="getIndex(child.id)"
                />
            </template>
        </component>

        <!-- VText 组件（带 input 事件） -->
        <component
            :is="node.component"
            v-else
            :id="'component' + node.id"
            class="component"
            :style="getComponentStyle(node.style)"
            :prop-value="node.propValue"
            :element="node"
            :request="node.request"
            :linkage="node.linkage"
            @input="handleInput"
        />
    </Shape>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import Shape from './Shape.vue'
import {
    getShapeStyle as getShapeStyleUtils,
    getSVGStyle as getSVGStyleUtils,
    getStyle,
} from '@/utils/style'
import type { ComponentData, ComponentStyle } from '@/types'

interface Props {
  node: ComponentData
  index: number
}

const props = defineProps<Props>()

const store = useStore()
const { componentData, curComponent, canvasStyleData } = storeToRefs(store)
const svgFilterAttrs: (keyof ComponentStyle)[] = ['width', 'height', 'top', 'left', 'rotate']

/**
 * 查找当前组件的所有子组件（parentId 等于当前节点 id）
 */
const children = computed<ComponentData[]>(() => {
    return componentData.value.filter(c => c.parentId === props.node.id)
})

/**
 * 获取组件在扁平数组中的索引（用于选中状态同步）
 */
function getIndex(id: string): number {
    return componentData.value.findIndex(c => c.id === id)
}

function getShapeStyle(style: ComponentStyle): Record<string, string | number> {
    return getShapeStyleUtils(style)
}

function getComponentStyle(style: ComponentStyle): Record<string, string | number> {
    return getStyle(style, svgFilterAttrs)
}

function getSVGStyle(style: ComponentStyle): Record<string, string | number> {
    return getSVGStyleUtils(style, svgFilterAttrs)
}

function handleInput(element: ComponentData, value: string): void {
    store.setShapeStyle({ height: getTextareaHeight(element, value) })
}

function getTextareaHeight(element: ComponentData, text: string): number {
    const { fontSize, height, lineHeight: rawLineHeight } = element.style
    const lineHeight = rawLineHeight ? parseFloat(rawLineHeight) : 1.5

    const newHeight =
    (text.split('<br>').length - 1) * lineHeight * (fontSize || canvasStyleData.value.fontSize)
    return height > newHeight ? height : newHeight
}
</script>

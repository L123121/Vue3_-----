<template>
    <div
        ref="wrapperRef"
        class="preview-node-wrapper"
        @click="onClick"
        @mouseenter="onMouseEnter"
    >
        <component
            :is="node.component"
            ref="componentRef"
            :style="getComponentStyle(node.style)"
            :class="['component', node.component.startsWith('SVG') ? 'svg-component' : '']"
            :prop-value="node.propValue"
            :element="node"
            :request="node.request"
            :linkage="node.linkage"
        >
            <!-- 递归渲染子组件（通过 parentId 关联） -->
            <template v-if="children.length">
                <PreviewNodeRenderer
                    v-for="child in children"
                    :key="child.id"
                    :node="child"
                />
            </template>
        </component>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStore } from '@/store'
import { getStyle, getSVGStyle } from '@/utils/style'
import runAnimation from '@/utils/runAnimation'
import { events } from '@/utils/events'
import eventBus from '@/utils/eventBus'
import type { ComponentData, ComponentStyle } from '@/types'

interface Props {
  node: ComponentData
}

const props = defineProps<Props>()
const store = useStore()

const wrapperRef = ref<HTMLElement | null>(null)
const componentRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)

// 查找当前组件的所有子组件
const children = computed(() => {
    return store.componentData.filter(c => c.parentId === props.node.id)
})

onMounted(() => {
    // 挂载时执行动画
    const target = componentRef.value instanceof HTMLElement ? componentRef.value : componentRef.value?.$el
    if (target) {
        runAnimation(target, props.node.animations)
    }
})

function getComponentStyle(style: ComponentStyle): Record<string, string | number> {
    if (props.node.component.startsWith('SVG')) {
        return getSVGStyle(style)
    }
    return getStyle(style)
}

function onClick(): void {
    const eventMap = props.node.events
    Object.entries(eventMap).forEach(([key, value]) => {
        if (key in events) {
            const eventKey = key as keyof typeof events
            events[eventKey](value)
        }
    })
    eventBus.emit('v-click', props.node.id)
}

function onMouseEnter(): void {
    eventBus.emit('v-hover', props.node.id)
}
</script>

<style scoped>
.preview-node-wrapper {
  /* 无额外样式，仅作为事件容器 */
}

.component {
  position: absolute;
}

.svg-component {
  overflow: visible;
}
</style>

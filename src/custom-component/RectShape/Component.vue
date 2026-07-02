<template>
    <div ref="rectRef" class="rect-shape" :class="{ 'has-children': hasChildren }">
        <!-- 容器内容 -->
        <VText :prop-value="element.propValue" :element="element" />

        <!-- 子组件插槽：由 NodeRenderer 根据 parentId 递归注入 -->
        <slot />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStore } from '@/store'
import { useOnEvent } from '../common/useOnEvent'
import type { ComponentData, LinkageConfig } from '@/types'

interface Props {
  propValue: string
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()

const store = useStore()
const rectRef = ref<HTMLElement | null>(null)

// 检测当前组件是否有子组件（用于 CSS 样式适配）
const hasChildren = computed(() => {
    return store.componentData.some(c => c.parentId === props.element.id)
})

useOnEvent(props, rectRef)
</script>

<style lang="scss" scoped>
.rect-shape {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative; /* 为子组件提供绝对定位上下文 */

  &.has-children {
    min-height: 40px;
  }
}
</style>

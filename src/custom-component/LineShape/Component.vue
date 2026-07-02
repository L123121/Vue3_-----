<template>
    <div ref="lineRef" class="line-shape" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useOnEvent } from '../common/useOnEvent'
import type { ComponentData, LinkageConfig } from '@/types'

interface Props {
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()
const lineRef = ref<HTMLElement | null>(null)

useOnEvent(props, lineRef)
</script>

<style lang="scss" scoped>
.line-shape {
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>

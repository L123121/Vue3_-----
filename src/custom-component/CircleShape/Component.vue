<template>
    <div ref="circleRef" class="circle-shape">
        <VText :prop-value="element.propValue" :element="element" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useOnEvent } from '../common/useOnEvent'
import type { ComponentData, LinkageConfig } from '@/types'

interface Props {
  propValue: string
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()
const circleRef = ref<HTMLElement | null>(null)

useOnEvent(props, circleRef)
</script>

<style lang="scss" scoped>
.circle-shape {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: auto;
}
</style>

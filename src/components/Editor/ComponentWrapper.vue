<template>
    <div @click="onClick" @mouseenter="onMouseEnter">
        <component
            :is="config.component"
            v-if="config.component.startsWith('SVG')"
            ref="componentRef"
            class="component"
            :style="getSVGStyle(config.style)"
            :prop-value="config.propValue"
            :element="config"
            :request="config.request"
            :linkage="config.linkage"
        />

        <component
            :is="config.component"
            v-else
            ref="componentRef"
            class="component"
            :style="getStyle(config.style)"
            :prop-value="config.propValue"
            :element="config"
            :request="config.request"
            :linkage="config.linkage"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getStyle, getSVGStyle } from '@/utils/style'
import runAnimation from '@/utils/runAnimation'
import { events } from '@/utils/events'
import eventBus from '@/utils/eventBus'
import type { ComponentData } from '@/types'

const props = defineProps<{
  config: ComponentData
}>()

const componentRef = ref<{ $el: HTMLElement } | null>(null)

onMounted(() => {
    if (componentRef.value?.$el) {
        runAnimation(componentRef.value.$el, props.config.animations)
    }
})

function onClick(): void {
    const eventMap = props.config.events
    const eventFnMap = events as unknown as Record<string, (param: string) => void>
    Object.keys(eventMap).forEach(key => {
        if (eventFnMap[key]) {
            eventFnMap[key](eventMap[key])
        }
    })

    eventBus.emit('v-click', props.config.id)
}

function onMouseEnter(): void {
    eventBus.emit('v-hover', props.config.id)
}
</script>

<style lang="scss" scoped>
.component {
    position: absolute;
}
</style>

<template>
    <div ref="containerRef" class="svg-star-container">
        <svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
            <polygon
                ref="star"
                :points="points"
                :stroke="element.style.borderColor"
                :fill="element.style.backgroundColor"
                stroke-width="1"
            />
        </svg>
        <VText :prop-value="element.propValue" :element="element" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useOnEvent } from '../../common/useOnEvent'
import type { ComponentData, LinkageConfig } from '@/types'

interface Props {
  propValue: string
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()
const containerRef = ref<HTMLElement | null>(null)

const points = ref('')
useOnEvent(props, containerRef)

onMounted(() => {
    draw()
})

watch(() => props.element.style.width, draw)
watch(() => props.element.style.height, draw)

function draw(): void {
    const { width, height } = props.element.style
    drawPolygon(width, height)
}

function drawPolygon(width: number, height: number): void {
    // 五角星十个坐标点的比例集合
    const pointsArr: [number, number][] = [
        [0.5, 0],
        [0.625, 0.375],
        [1, 0.375],
        [0.75, 0.625],
        [0.875, 1],
        [0.5, 0.75],
        [0.125, 1],
        [0.25, 0.625],
        [0, 0.375],
        [0.375, 0.375],
    ]

    const coordinatePoints = pointsArr.map(point => width * point[0] + ' ' + height * point[1])
    points.value = coordinatePoints.toString()
}
</script>

<style lang="scss" scoped>
.svg-star-container {
  width: 100%;
  height: 100%;

  svg {
    width: 100%;
    height: 100%;
  }

  .v-text {
    position: absolute;
    top: 58%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50%;
    height: 40%;
  }
}
</style>

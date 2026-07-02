<template>
    <div style="overflow: hidden">
        <canvas ref="canvas" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useOnEvent } from '../common/useOnEvent'
import type { ComponentData, PicturePropValue, LinkageConfig } from '@/types'

interface Props {
  propValue: PicturePropValue
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let img: HTMLImageElement | null = null
let isFirst = true

useOnEvent(props, canvas)

onMounted(() => {
    if (canvas.value) {
        ctx = canvas.value.getContext('2d')
        drawImage()
    }
})

watch(() => props.element.style.width, drawImage)
watch(() => props.element.style.height, drawImage)
watch(() => props.propValue.flip.vertical, mirrorFlip)
watch(() => props.propValue.flip.horizontal, mirrorFlip)

function drawImage(): void {
    if (!canvas.value || !ctx) return

    const { width, height } = props.element.style
    canvas.value.width = width
    canvas.value.height = height

    if (isFirst) {
        isFirst = false
        img = document.createElement('img')
        img.src = props.propValue.url
        img.onload = () => {
            ctx?.drawImage(img!, 0, 0, width, height)
            mirrorFlip()
        }
    } else {
        mirrorFlip()
    }
}

function mirrorFlip(): void {
    if (!ctx || !img) return

    const { vertical, horizontal } = props.propValue.flip
    const { width, height } = props.element.style
    const hValue = horizontal ? -1 : 1
    const vValue = vertical ? -1 : 1

    // 清除图片
    ctx.clearRect(0, 0, width, height)
    // 平移图片
    ctx.translate(width / 2 - (width * hValue) / 2, height / 2 - (height * vValue) / 2)
    // 对称镜像
    ctx.scale(hValue, vValue)
    ctx.drawImage(img, 0, 0, width, height)
    // 还原坐标点
    ctx.setTransform(1, 0, 0, 1, 0, 0)
}
</script>

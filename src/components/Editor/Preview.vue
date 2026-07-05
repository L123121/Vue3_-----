<template>
    <!-- 截图模式：使用直接渲染（需要真实 DOM 用于 html-to-image） -->
    <div v-if="isScreenshot" ref="container" class="bg">
        <el-button class="close" type="primary" @click="htmlToImage">
            确定截图
        </el-button>
        <el-button class="close close-cancel" @click="close">
            取消
        </el-button>
        <div class="canvas-container">
            <div
                class="canvas"
                :style="{
                    ...getCanvasStyle(canvasStyleData),
                    width: changeStyleWithScale(canvasStyleData.width) + 'px',
                    height: changeStyleWithScale(canvasStyleData.height) + 'px',
                }"
            >
                <ComponentWrapper
                    v-for="(item, index) in copyData"
                    :key="index"
                    :config="item"
                />
            </div>
        </div>
    </div>

    <!-- 预览模式：使用 iframe 隔离渲染，通过 postMessage 通信 -->
    <div v-else class="preview-overlay">
        <div class="preview-header">
            <span class="header-title">
                <span class="dot" />
                iframe 隔离预览
            </span>
            <div class="header-actions">
                <el-button size="small" @click="refreshPreview">
                    刷新
                </el-button>
                <el-button size="small" type="primary" @click="close">
                    关闭预览
                </el-button>
            </div>
        </div>
        <div class="iframe-wrapper">
            <iframe
                ref="iframeRef"
                :src="previewUrl"
                class="preview-iframe"
                title="页面预览"
                @load="handleIframeLoad"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCanvasStyle } from '@/utils/style'
import ComponentWrapper from './ComponentWrapper.vue'
import { changeStyleWithScale } from '@/utils/translate'
import { toPng } from 'html-to-image'
import { deepCopy } from '@/utils/utils'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import type { ComponentData } from '@/types'

const props = defineProps({
    isScreenshot: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits<{
    (e: 'close'): void
}>()

const store = useStore()
const { componentData, canvasStyleData } = storeToRefs(store)

// ==================== 截图模式 ====================
const copyData = ref<ComponentData[]>([])
const container = ref<HTMLElement | null>(null)

// ==================== iframe 预览模式 ====================
const iframeRef = ref<HTMLIFrameElement | null>(null)
const previewUrl = ref('/preview')

/**
 * 向 iframe 发送数据
 */
function postDataToIframe(): void {
    if (!iframeRef.value?.contentWindow) return

    const targetOrigin = window.location.origin

    // 发送组件数据
    iframeRef.value.contentWindow.postMessage({
        source: 'editor-preview',
        type: 'componentData',
        data: componentData.value,
    }, targetOrigin)

    // 发送画布样式
    iframeRef.value.contentWindow.postMessage({
        source: 'editor-preview',
        type: 'canvasStyle',
        data: canvasStyleData.value,
    }, targetOrigin)
}

/**
 * iframe 加载完成后发送数据
 */
function handleIframeLoad(): void {
    postDataToIframe()
}

/**
 * 刷新预览
 */
function refreshPreview(): void {
    if (iframeRef.value) {
        iframeRef.value.src = previewUrl.value
    }
}

function close(): void {
    emit('close')
}

const handleMessage = (event: MessageEvent): void => {
    if (event.origin !== window.location.origin) return
    if (event.data?.source === 'preview-page' && event.data?.type === 'close') {
        close()
    }
}

onMounted(() => {
    // 截图模式：深拷贝数据
    if (props.isScreenshot) {
        copyData.value = deepCopy(componentData.value)
    }

    // 监听预览页面发回的 close 消息
    window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
})

function htmlToImage(): void {
    if (!container.value) return
    const canvas = container.value.querySelector('.canvas') as HTMLElement
    if (!canvas) return

    toPng(canvas)
        .then(dataUrl => {
            const a = document.createElement('a')
            a.setAttribute('download', 'screenshot')
            a.href = dataUrl
            a.click()
        })
        .catch(error => {
            console.error('oops, something went wrong!', error)
        })
        .finally(close)
}
</script>

<style lang="scss" scoped>
/* ==================== 截图模式样式 ==================== */
.bg {
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 0;

    .canvas-container {
        width: 100%;
        height: 100%;
        overflow: auto;
        padding: 60px;
        display: flex;
        align-items: flex-start;
        justify-content: center;

        .canvas {
            background: #fff;
            position: relative;
            flex-shrink: 0;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
        }
    }

    .close {
        position: fixed;
        right: 40px;
        top: 30px;
        z-index: 10001;
    }

    .close-cancel {
        right: 130px;
    }
}

/* ==================== iframe 预览模式样式 ==================== */
.preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #f0f2f5;
    z-index: 9999;
    display: flex;
    flex-direction: column;
}

.preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    z-index: 1;

    .header-title {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
        display: flex;
        align-items: center;
        gap: 8px;

        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #67c23a;
            display: inline-block;
        }
    }

    .header-actions {
        display: flex;
        gap: 8px;
    }
}

.iframe-wrapper {
    flex: 1;
    padding: 20px;
    overflow: auto;

    .preview-iframe {
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        background: #fff;
    }
}
</style>

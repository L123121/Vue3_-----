<template>
    <div class="preview-page">
        <div class="preview-toolbar">
            <span class="preview-badge">预览模式 (iframe 隔离渲染)</span>
            <button class="close-btn" @click="closePreview">
                关闭预览
            </button>
        </div>
        <div class="preview-container">
            <div
                v-if="componentData.length"
                class="preview-canvas"
                :style="{
                    ...getCanvasStyle(canvasStyle),
                    width: changeStyleWithScale(canvasStyle.width) + 'px',
                    height: changeStyleWithScale(canvasStyle.height) + 'px',
                }"
            >
                <PreviewNodeRenderer
                    v-for="item in rootComponents"
                    :key="item.id"
                    :node="item"
                />
            </div>
            <div v-else class="empty-hint">
                等待接收数据...
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PreviewNodeRenderer from '@/components/Editor/PreviewNodeRenderer.vue'
import { getCanvasStyle } from '@/utils/style'
import { changeStyleWithScale } from '@/utils/translate'
import type { ComponentData, CanvasStyleData } from '@/types'

const componentData = ref<ComponentData[]>([])
const canvasStyle = ref<CanvasStyleData>({
    width: 1200,
    height: 740,
    scale: 100,
    color: '#000',
    opacity: 1,
    backgroundColor: '#fff',
    fontSize: 14,
})

// 只渲染根级组件（子组件由容器组件内部渲染）
const rootComponents = computed(() => {
    return componentData.value.filter(c => !c.parentId)
})

/**
 * 监听来自父窗口的 postMessage 数据
 */
function handleMessage(event: MessageEvent): void {
    // 安全校验：验证 origin 和数据格式
    if (event.origin !== window.location.origin) return
    if (!event.data || event.data.source !== 'editor-preview') return

    const { type, data } = event.data

    if (type === 'componentData' && Array.isArray(data)) {
        componentData.value = data
    } else if (type === 'canvasStyle' && data) {
        canvasStyle.value = { ...canvasStyle.value, ...data }
    }
}

function closePreview(): void {
    window.parent.postMessage({ source: 'preview-page', type: 'close' }, window.location.origin)
}

onMounted(() => {
    window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
})
</script>

<style lang="scss" scoped>
.preview-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  z-index: 10;

  .preview-badge {
    font-size: 13px;
    color: #666;

    &::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #67c23a;
      margin-right: 8px;
      vertical-align: middle;
    }
  }

  .close-btn {
    padding: 6px 20px;
    background: #409eff;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;

    &:hover {
      background: #337ecc;
    }
  }
}

.preview-container {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px;
  overflow: auto;
}

.preview-canvas {
  background: #fff;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  min-height: 200px;
}

.empty-hint {
  color: #999;
  font-size: 16px;
  margin-top: 100px;
}
</style>

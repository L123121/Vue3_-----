<template>
    <div :class="!isDarkMode ? 'home' : 'home dark'">
        <Toolbar />

        <main>
            <!-- 左侧组件列表 -->
            <section :class="leftList ? 'left active' : 'left inactive'">
                <el-tabs v-model="leftActiveName">
                    <el-tab-pane name="components">
                        <template #label>
                            <span class="tab-label">
                                <el-icon><Box /></el-icon>
                                <span>组件</span>
                            </span>
                        </template>
                        <ComponentList />
                    </el-tab-pane>
                    <el-tab-pane name="layers">
                        <template #label>
                            <span class="tab-label">
                                <el-icon><Operation /></el-icon>
                                <span>图层</span>
                            </span>
                        </template>
                        <RealTimeComponentList />
                    </el-tab-pane>
                </el-tabs>
            </section>
            <el-button
                title="show-list-btn"
                class="btn show-list left-btn"
                :class="leftList ? 'panel-open' : 'panel-closed'"
                :icon="leftList ? ArrowLeft : ArrowRight"
                @click="isShowLeft"
            />

            <!-- 中间画布 -->
            <section class="center" :class="{ 'right-open': rightList }">
                <div
                    class="content"
                    @drop="handleDrop"
                    @dragover="handleDragOver"
                    @mousedown="handleMouseDown"
                    @mouseup="deselectCurComponent"
                >
                    <Editor />
                </div>
            </section>

            <!-- 右侧属性列表（Teleport 到 body，避免样式污染和 z-index 问题） -->
            <Teleport to="body">
                <section v-show="rightList" class="right right-panel-teleported">
                    <el-tabs v-if="curComponent" v-model="activeName">
                        <el-tab-pane name="attr">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><CollectionTag /></el-icon>
                                    <span>属性</span>
                                </span>
                            </template>
                            <!-- 元数据驱动属性面板：根据组件注册时的 propConfigs 自动渲染，无配置时回退到 Attr.vue -->
                            <PropPanelRenderer />
                        </el-tab-pane>
                        <el-tab-pane name="animation">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Film /></el-icon>
                                    <span>动画</span>
                                </span>
                            </template>
                            <AnimationList />
                        </el-tab-pane>
                        <el-tab-pane name="events">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Pointer /></el-icon>
                                    <span>事件</span>
                                </span>
                            </template>
                            <EventList />
                        </el-tab-pane>
                        <el-tab-pane v-if="collabEnabled" name="history">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Clock /></el-icon>
                                    <span>历史</span>
                                </span>
                            </template>
                            <CommandTimeline />
                        </el-tab-pane>
                    </el-tabs>
                    <CanvasAttr v-else />
                </section>
            </Teleport>
            <el-button
                title="show-list-btn"
                class="btn show-list right-btn"
                :class="rightList ? 'panel-open' : 'panel-closed'"
                :icon="rightList ? ArrowRight : ArrowLeft"
                @click="isShowRight"
            />
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import Editor from '@/components/Editor/index.vue'
import ComponentList from '@/components/ComponentList.vue'
import AnimationList from '@/components/AnimationList.vue'
import EventList from '@/components/EventList.vue'
import Toolbar from '@/components/Toolbar.vue'
import CommandTimeline from '@/components/CommandTimeline.vue'
import { listenGlobalKeyDown } from '@/utils/shortcutKey'
import RealTimeComponentList from '@/components/RealTimeComponentList.vue'
import CanvasAttr from '@/components/CanvasAttr.vue'
import PropPanelRenderer from '@/custom-component/PropPanelRenderer.vue'
import { ArrowLeft, ArrowRight, Box, Operation, CollectionTag, Film, Pointer, Clock } from '@element-plus/icons-vue'
import { useAutoSave } from '@/composables/useAutoSave'
import { useCommandHistory, restoreCommandHistory } from '@/composables/useCommandHistory'
import { useDragDrop } from '@/composables/useDragDrop'
import { usePanelToggle } from '@/composables/usePanelToggle'
import { validateComponentData, validateCanvasStyle } from '@/utils/validation'
import { getCollab } from '@/collab'

const store = useStore()
const route = useRoute()
const { curComponent, isClickComponent, rightList, isDarkMode } = storeToRefs(store)

// 协同是否启用(决定是否显示"历史"tab 等协同 UI)
const collabEnabled = !!getCollab()

const activeName = ref('attr')
const leftActiveName = ref('components')

// Composables
useAutoSave()
// 命令历史持久化(跨会话恢复),仅协同启用时启用持久化监听
if (collabEnabled) {
    useCommandHistory()
}
const { handleDrop, handleDragOver } = useDragDrop()
const { leftList, isShowLeft, isShowRight } = usePanelToggle()

// ==================== 初始化 ====================
// 从服务器加载页面(editor/:id 模式)
async function loadFromServer(pageId: string): Promise<void> {
    try {
        const { pagesApi } = await import('@/utils/api')
        const res = await pagesApi.get(pageId)
        if (res.page.componentData?.length > 0) {
            store.setComponentData(res.page.componentData)
        }
        if (res.page.canvasStyle) {
            store.setCanvasStyle(res.page.canvasStyle)
        }
    } catch (e) {
        console.error('加载服务器页面失败:', e)
    }
}

function restore(): void {
    const canvasData = localStorage.getItem('canvasData')
    if (canvasData) {
        try {
            const parsed = JSON.parse(canvasData)
            const result = validateComponentData(parsed)
            if (result.success && result.data && result.data.length > 0) {
                store.setComponentData(result.data)
            } else {
                console.warn('画布数据校验失败，已忽略:', result.errors)
            }
        } catch (e) {
            console.error('数据解析失败:', e)
        }
    }

    const canvasStyle = localStorage.getItem('canvasStyle')
    if (canvasStyle) {
        try {
            const parsed = JSON.parse(canvasStyle)
            const result = validateCanvasStyle(parsed)
            if (result.success && result.data) {
                store.setCanvasStyle(result.data)
            } else {
                console.warn('画布样式校验失败，已忽略:', result.errors)
            }
        } catch (e) {
            console.error('画布样式解析失败:', e)
        }
    }
}

onMounted(async () => {
    // 优先从服务器加载(editor/:id 模式)
    const pageId = route.params.id as string
    if (pageId) {
        await loadFromServer(pageId)
    } else {
        restore()
    }
    const cleanup = listenGlobalKeyDown()
    onUnmounted(() => { cleanup() })

    // 协同启用时:从 IndexedDB 恢复命令栈(跨会话撤销)
    if (collabEnabled) {
        void restoreCommandHistory()
    }

    const savedMode = localStorage.getItem('isDarkMode')
    if (savedMode !== null) {
        try {
            store.toggleDarkMode(JSON.parse(savedMode))
        } catch {
            store.toggleDarkMode(false)
        }
    } else {
        store.isDarkMode = false
    }
})

// ==================== 画布交互 ====================
function handleMouseDown(e: MouseEvent): void {
    e.stopPropagation()
    store.setClickComponentStatus(false)
    store.setInEditorStatus(true)
}

function deselectCurComponent(e: MouseEvent): void {
    if (!isClickComponent.value) {
        store.setCurComponent({ component: null, index: null })
    }

    if (e.button !== 2) {
        store.hideContextMenu()
    }
}
</script>

<style lang="scss">
.home {
  height: 100vh;
  background: var(--main-bg-color);

  main {
    height: calc(100% - var(--toolbar-height));
    position: relative;
    background: var(--secondary-bg-color);

    // ==================== 折叠按钮 ====================
    .show-list {
      position: absolute;
      z-index: 10;
      top: 50%;
      transform: translateY(-50%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--border-color);
      background: var(--panel-bg);
      height: 48px;
      width: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;

      &:hover {
        color: var(--primary-color);
        background: var(--button-active-bg-color);
      }
    }

    .left-btn {
      left: var(--sidebar-width);
      border-radius: 0 4px 4px 0;
      margin-left: -1px;
      z-index: 6;

      &.panel-closed {
        left: 0;
      }
    }

    .right-btn {
      right: 288px;
      border-radius: 4px 0 0 4px;
      margin-right: -1px;
      z-index: 6;

      &.panel-closed {
        right: 0;
      }
    }

    // ==================== 左侧面板 ====================
    .left {
      position: absolute;
      left: 0;
      top: 0;
      width: var(--sidebar-width);
      height: 100%;
      background: var(--panel-bg);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 5;
      overflow: hidden;

      :deep(.el-tabs) {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;

        .el-tabs__header { padding: 0; margin: 0; }

        .el-tabs__nav-wrap {
          width: 100% !important;
          overflow: hidden;
          &::after { display: none !important; }
        }

        .el-tabs__nav-scroll {
          width: 100% !important;
          overflow: hidden;
        }

        .el-tabs__nav {
          width: 100% !important;
          display: flex !important;
          transform: none !important;
          position: relative !important;
        }

        .el-tabs__item {
          flex: 1 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 44px;
          line-height: 44px;

          .tab-label {
            justify-content: center;
          }
        }

        .el-tabs__content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;

          .el-tab-pane {
            height: 100%;
            overflow: auto;
          }
        }
      }
    }

    .left.inactive {
      width: 0;
      border-right: none;
    }

    // ==================== 中间画布 ====================
    .center {
      margin-left: var(--sidebar-width);
      margin-right: 10px;
      height: 100%;
      background: var(--secondary-bg-color);
      overflow: auto;
      padding: 32px;
      transition: margin 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: flex-start;
      justify-content: center;

      &.right-open {
        margin-right: 288px;
      }

      .content {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        background: #fff;
        flex-shrink: 0;
        border-radius: 8px;
        overflow: hidden;
      }
    }

    .left.inactive ~ .center {
      margin-left: 0;
    }

    // ==================== 右侧面板（Teleport 到 body，使用 fixed 定位） ====================
    .right-panel-teleported {
      position: fixed;
      right: 0;
      top: var(--toolbar-height, 48px);
      width: 288px;
      height: calc(100vh - var(--toolbar-height, 48px));
      background: var(--panel-bg);
      border-left: 1px solid var(--border-color);
      z-index: 2000;
      overflow-y: auto;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.06);

      .el-select { width: 100%; }

      .el-form-item__label { color: var(--text-color); }

      .el-tabs__item.is-top {
        color: var(--text-color);
        &.is-active { color: var(--actived-text-color); }
      }

      .el-input__inner {
        background-color: var(--placeholder-bg-color);
        color: var(--text-color);
        border-color: var(--border-color);
      }

      textarea.el-textarea__inner {
        background-color: var(--placeholder-bg-color);
        color: var(--text-color);
      }

      .el-select-dropdown__item { color: var(--text-color); }

      .linkage-container .linkage-component {
        border-color: var(--border-color);
        .div-guanbi {
          color: var(--border-color);
          border-color: var(--border-color);
        }
      }
    }
  }

  .placeholder {
    text-align: center;
    color: var(--placeholder-text-color);
  }

  .global-attr { padding: 10px; }

  .el-collapse { border-color: var(--border-color); }

  .el-collapse-item__header,
  .el-collapse-item__wrap {
    border-color: var(--border-color);
    background-color: var(--main-bg-color);
    color: var(--text-color);
  }

  .el-collapse-item__header.is-active {
    border-bottom-color: transparent !important;
  }

  .el-tabs__item { color: var(--text-color); }

  .animation-list {
    .el-tabs.el-tabs--top { background-color: var(--main-bg-color); }
    .el-scrollbar__view { margin-top: 30px; }
  }

  .ace {
    background: var(--ace-bg-color);
    border-color: var(--main-bg-color);

    .ace_editor,
    .ace_gutter {
      background-color: var(--main-bg-color);
      color: var(--text-color);
    }
  }
}
</style>

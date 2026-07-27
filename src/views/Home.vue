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
                        <el-tab-pane name="history">
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
import { useCommandHistory } from '@/composables/useCommandHistory'
import { useDragDrop } from '@/composables/useDragDrop'
import { usePanelToggle } from '@/composables/usePanelToggle'
import { validateComponentData, validateCanvasStyle } from '@/utils/validation'
import type { ComponentData } from '@/types'
import { loadProjectDocument } from '@/storage/projectStorage'

// 修复 LLM 生成的类型错误（borderRadius 应为字符串，fontWeight 应为数字）
function fixComponentStyles(c: any): any {
    if (!c || !c.style) return c
    const s = { ...c.style }
    // borderRadius: number → string
    if (typeof s.borderRadius === 'number') s.borderRadius = String(s.borderRadius)
    // fontWeight: string → number
    if (typeof s.fontWeight === 'string') {
        if (s.fontWeight === 'bold') s.fontWeight = 700
        else if (s.fontWeight === 'normal') s.fontWeight = 400
        else {
            const n = Number(s.fontWeight)
            s.fontWeight = isNaN(n) ? 400 : n
        }
    }
    return { ...c, style: s }
}

function fixComponentTypes(c: any): ComponentData | null {
    if (!c || typeof c !== 'object') return null
    const fixed = fixComponentStyles(c)
    // 确保必要字段存在
    return {
        id: fixed.id || `fixed_${Math.random().toString(36).slice(2, 10)}`,
        component: fixed.component || 'VText',
        label: fixed.label || '组件',
        icon: fixed.icon || '',
        propValue: fixed.propValue ?? '',
        style: fixed.style || {},
        parentId: null,
        slot: 'default',
        zIndex: fixed.zIndex ?? 1,
        animations: [],
        events: {},
        groupStyle: {},
        isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    } as ComponentData
}

const store = useStore()
const { curComponent, isClickComponent, rightList, isDarkMode } = storeToRefs(store)

const activeName = ref('attr')
const leftActiveName = ref('components')

// Composables
useAutoSave()
useCommandHistory()
const { handleDrop, handleDragOver } = useDragDrop()
const { leftList, isShowLeft, isShowRight } = usePanelToggle()

// ==================== 初始化 ====================
async function restore(): Promise<void> {
    const project = await loadProjectDocument()
    if (!project) return

    const componentResult = validateComponentData(project.componentData)
    if (componentResult.success && componentResult.data) {
        store.setComponentData(componentResult.data)
    } else if (Array.isArray(project.componentData)) {
        const fixed = project.componentData
            .map(fixComponentTypes)
            .filter((component): component is ComponentData => component !== null)
        if (fixed.length > 0) {
            console.warn('画布数据已自动修复', fixed.length, '个组件')
            store.setComponentData(fixed)
        }
    }

    const canvasResult = validateCanvasStyle(project.canvasStyle)
    if (canvasResult.success && canvasResult.data) {
        store.setCanvasStyle(canvasResult.data)
    } else {
        console.warn('画布样式校验失败，已忽略:', canvasResult.errors)
    }
}

onMounted(async () => {
    await restore()
    const cleanup = listenGlobalKeyDown()
    onUnmounted(() => { cleanup() })

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

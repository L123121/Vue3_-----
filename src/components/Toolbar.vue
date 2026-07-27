<template>
    <div>
        <div :class="isDarkMode ? 'dark toolbar' : 'toolbar'">
            <!-- 左侧按钮组 -->
            <div class="toolbar-left">
                <!-- 数据 -->
                <div class="btn-group">
                    <span class="group-label">数据</span>
                    <el-button :icon="Edit" size="small" @click="onAceEditorChange">
                        JSON
                    </el-button>
                    <el-button :icon="Upload" size="small" @click="onImportJSON">
                        导入
                    </el-button>
                    <el-button :icon="Download" size="small" @click="onExportJSON">
                        导出
                    </el-button>
                    <el-button :icon="Document" size="small" @click="onExportHTML">
                        导出 HTML
                    </el-button>
                </div>

                <!-- 编辑 -->
                <div class="btn-group">
                    <span class="group-label">编辑</span>
                    <el-button :icon="RefreshLeft" size="small" @click="undo">
                        撤销
                    </el-button>
                    <el-button :icon="RefreshRight" size="small" @click="redo">
                        重做
                    </el-button>
                </div>

                <!-- 插入 -->
                <div class="btn-group">
                    <span class="group-label">插入</span>
                    <label for="input" class="upload-label">
                        <el-button :icon="Picture" size="small">图片</el-button>
                        <input
                            id="input"
                            type="file"
                            hidden
                            accept="image/*"
                            @change="handleFileChange"
                        >
                    </label>
                </div>

                <!-- 画布 -->
                <div class="btn-group">
                    <span class="group-label">画布</span>
                    <el-button :icon="View" size="small" @click="preview(false)">
                        预览
                    </el-button>
                    <el-button :icon="FolderChecked" size="small" @click="save">
                        保存
                    </el-button>
                    <el-button :icon="Delete" size="small" @click="clearCanvas">
                        清空
                    </el-button>
                    <el-button :icon="Camera" size="small" @click="preview(true)">
                        截图
                    </el-button>
                </div>

                <!-- 组件 -->
                <div class="btn-group">
                    <span class="group-label">组件</span>
                    <el-button
                        :disabled="!areaData.components.length"
                        :icon="Connection"
                        size="small"
                        @click="compose"
                    >
                        组合
                    </el-button>
                    <el-button
                        :disabled="!curComponent || curComponent.isLock || curComponent.component != 'Group'"
                        :icon="Remove"
                        size="small"
                        @click="decompose"
                    >
                        拆分
                    </el-button>
                    <el-button
                        :disabled="!curComponent || curComponent.isLock"
                        :icon="Lock"
                        size="small"
                        @click="lock"
                    >
                        锁定
                    </el-button>
                    <el-button
                        :disabled="!curComponent || !curComponent.isLock"
                        :icon="Unlock"
                        size="small"
                        @click="unlock"
                    >
                        解锁
                    </el-button>
                </div>

                <!-- 更多 -->
                <div class="btn-group">
                    <span class="group-label">更多</span>
                    <el-button :icon="Clock" size="small" @click="showVersionHistory">
                        版本
                    </el-button>
                </div>
            </div>

            <!-- 右侧：AI + 画布配置 + 主题 -->
            <div class="toolbar-right">
                <!-- AI 生成 -->
                <el-button
                    type="primary"
                    :icon="MagicStick"
                    size="small"
                    @click="toggleAIPanel"
                >
                    AI 生成
                </el-button>
                <el-divider direction="vertical" />
                <div class="canvas-config">
                    <label>画布</label>
                    <input
                        v-model.number="canvasStyleData.width"
                        type="number"
                        class="canvas-input"
                        @change="handleCanvasSizeChange"
                    >
                    <span class="separator">×</span>
                    <input
                        v-model.number="canvasStyleData.height"
                        type="number"
                        class="canvas-input"
                        @change="handleCanvasSizeChange"
                    >
                </div>
                <div class="canvas-config">
                    <label>比例</label>
                    <input v-model="scale" class="canvas-input scale-input" @input="handleScaleChange">
                    <span>%</span>
                </div>
                <el-divider direction="vertical" />
                <el-switch
                    v-model="switchValue"
                    :active-icon="Sunny"
                    :inactive-icon="Moon"
                    inline-prompt
                    @change="handleToggleDarkMode"
                />
            </div>
        </div>

        <Preview v-if="isShowPreview" :is-screenshot="isScreenshot" @close="handlePreviewChange" />
        <AceEditor v-if="isShowAceEditor" @close-editor="closeEditor" />

        <el-drawer
            v-model="isShowVersionHistory"
            title="版本历史"
            direction="rtl"
            size="400px"
            :with-header="false"
        >
            <VersionHistory />
        </el-drawer>

        <el-dialog
            v-model="isShowDialog"
            :title="isExport ? '导出数据' : '导入数据'"
            :close-on-press-escape="false"
            :close-on-click-modal="false"
            width="600px"
        >
            <el-input
                v-model="jsonData"
                type="textarea"
                :rows="20"
                placeholder="请输入 JSON 数据"
            />
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="isShowDialog = false">
                        取 消
                    </el-button>
                    <el-upload
                        v-show="!isExport"
                        action="/"
                        :before-upload="beforeUpload"
                        :show-file-list="false"
                        accept="application/json"
                    >
                        <el-button type="primary">
                            选择 JSON 文件
                        </el-button>
                    </el-upload>
                    <el-button type="primary" @click="processJSON">
                        确 定
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- AI 生成面板 -->
        <AIPanel v-if="hasOpenedAIPanel" v-model="showAIPanel" />
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onUnmounted } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import generateID from '@/utils/generateID'
import { commonStyle, commonAttr } from '@/custom-component/component-list'
import eventBus from '@/utils/eventBus'
import { $ } from '@/utils/utils'
import changeComponentsSizeWithScale, { changeComponentSizeWithScale } from '@/utils/changeComponentsSizeWithScale'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Sunny, Moon, Edit, Upload, Download, RefreshLeft, RefreshRight,
    Picture, View, FolderChecked, Delete, Camera, Connection,
    Remove, Lock, Unlock, Clock, Document, MagicStick,
} from '@element-plus/icons-vue'
import type { ComponentData, CanvasStyleData, ComponentStyle } from '@/types'
import { validateAuto } from '@/utils/validation'
import { exportToHtml, downloadHtmlFile } from '@/utils/exportHtml'
import { PROJECT_DOCUMENT_VERSION, saveProjectDocument } from '@/storage/projectStorage'
import {
    undo as undoAction,
    redo as redoAction,
    composeWithCommand,
    decomposeWithCommand,
    addComponentWithCommand,
    clearCanvasWithCommand,
    importDataWithCommand,
} from '@/composables/useCommandActions'

interface ExportData {
    version: string
    timestamp: number
    canvasStyle: CanvasStyleData
    componentData: ComponentData[]
}

const store = useStore()
const { componentData, canvasStyleData, areaData, curComponent, isDarkMode } = storeToRefs(store)

// AI 面板
const showAIPanel = ref(false)
const hasOpenedAIPanel = ref(false)

const Preview = defineAsyncComponent(() => import('@/components/Editor/Preview.vue'))
const AceEditor = defineAsyncComponent(() => import('@/components/Editor/AceEditor.vue'))
const VersionHistory = defineAsyncComponent(() => import('@/components/VersionHistory.vue'))
const AIPanel = defineAsyncComponent(() => import('@/components/AIPanel.vue'))

function toggleAIPanel(): void {
    hasOpenedAIPanel.value = true
    showAIPanel.value = !showAIPanel.value
}

const isShowPreview = ref(false)
const isShowAceEditor = ref(false)
const timer = ref<ReturnType<typeof setTimeout> | null>(null)
const isScreenshot = ref(false)
const scale = ref(100)
const switchValue = ref(false)
const isShowDialog = ref(false)
const jsonData = ref('')
const isExport = ref(false)
const isShowVersionHistory = ref(false)

const DATA_VERSION = PROJECT_DOCUMENT_VERSION

onMounted(() => {
    eventBus.on('preview', preview)
    eventBus.on('save', save)
    eventBus.on('clearCanvas', clearCanvas)

    scale.value = canvasStyleData.value.scale
    const savedMode = localStorage.getItem('isDarkMode')
    if (savedMode) {
        try {
            handleToggleDarkMode(JSON.parse(savedMode))
        } catch {
            handleToggleDarkMode(false)
        }
    }
})

onUnmounted(() => {
    eventBus.off('preview', preview)
    eventBus.off('save', save)
    eventBus.off('clearCanvas', clearCanvas)
})

function handleToggleDarkMode(value: string | number | boolean): void {
    const enabled = Boolean(value)
    store.toggleDarkMode(enabled)
    switchValue.value = enabled
}

// 画布尺寸变化 → 组件等比缩放
const lastCanvasSize = ref({ width: canvasStyleData.value.width, height: canvasStyleData.value.height })

function handleCanvasSizeChange(): void {
    const newW = canvasStyleData.value.width
    const newH = canvasStyleData.value.height
    const oldW = lastCanvasSize.value.width
    const oldH = lastCanvasSize.value.height

    if (!newW || !newH || newW <= 0 || newH <= 0) return
    if (newW === oldW && newH === oldH) return

    const ratioX = newW / oldW
    const ratioY = newH / oldH

    const scaleAttrs = ['top', 'left', 'width', 'height', 'fontSize', 'padding'] as const
    store.componentData.forEach(comp => {
        scaleAttrs.forEach(key => {
            const val = comp.style[key]
            if (typeof val !== 'number' || val === 0) return
            if (key === 'top' || key === 'height' || key === 'padding') {
                comp.style[key] = Math.round(val * ratioY)
            } else {
                comp.style[key] = Math.round(val * ratioX)
            }
        })
    })

    store.markDataDirty()
    lastCanvasSize.value = { width: newW, height: newH }
}

function handleScaleChange(): void {
    if (timer.value) clearTimeout(timer.value)
    timer.value = setTimeout(() => {
        scale.value = ~~scale.value || 1
        changeComponentsSizeWithScale(scale.value)
    }, 1000)
}

function onAceEditorChange() { isShowAceEditor.value = !isShowAceEditor.value }
function closeEditor() { onAceEditorChange() }
function lock() { store.lock() }
function unlock() { store.unlock() }
function compose() { composeWithCommand() }
function decompose() { decomposeWithCommand() }
function undo() { undoAction() }
function redo() { redoAction() }

function handleFileChange(e: Event): void {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!file.type.includes('image')) {
        ElMessage.error('只能插入图片')
        return
    }

    const reader = new FileReader()
    reader.onload = (res) => {
        const fileResult = res.target?.result as string
        const img = new Image()
        img.onload = () => {
            const component: ComponentData = {
                ...commonAttr,
                id: generateID(),
                component: 'Picture',
                label: '图片',
                icon: '',
                propValue: {
                    url: fileResult,
                    flip: { horizontal: false, vertical: false },
                },
                style: {
                    ...commonStyle,
                    top: 0,
                    left: 0,
                    width: img.width,
                    height: img.height,
                } as ComponentStyle,
            }
            changeComponentSizeWithScale(component)
            addComponentWithCommand(component)

            const input = $('#input') as HTMLInputElement
            if (input) { input.type = 'text'; input.type = 'file' }
        }
        img.src = fileResult
    }
    reader.readAsDataURL(file)
}

function preview(screenshot: boolean): void {
    isScreenshot.value = screenshot
    isShowPreview.value = true
    store.setEditMode('preview')
}

async function save(): Promise<void> {
    try {
        await saveProjectDocument({
            componentData: componentData.value,
            canvasStyle: canvasStyleData.value,
        })
        ElMessage.success('保存成功')
    } catch (e) {
        ElMessage.error('保存失败，请检查浏览器存储空间')
        console.error('保存失败:', e)
    }
}

function clearCanvas(): void {
    ElMessageBox.confirm('确定要清空画布吗？', '提示', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    }).then(() => {
        clearCanvasWithCommand()
        ElMessage.success('画布已清空')
    }).catch(() => {})
}

function handlePreviewChange(): void {
    isShowPreview.value = false
    store.setEditMode('edit')
}

function onImportJSON(): void {
    jsonData.value = ''
    isExport.value = false
    isShowDialog.value = true
}

function regenerateComponentIds(components: ComponentData[]): ComponentData[] {
    return components.map(comp => ({
        ...comp,
        id: generateID(),
        ...(comp.component === 'Group' && Array.isArray(comp.propValue)
            ? { propValue: regenerateComponentIds(comp.propValue as ComponentData[]) }
            : {}),
    }))
}

function processJSON(): void {
    try {
        const data = JSON.parse(jsonData.value)
        if (isExport.value) {
            downloadFileUtil(jsonData.value, 'application/json', `lowcode-project-${Date.now()}.json`)
            ElMessage.success('导出成功')
        } else {
            const result = validateAuto(data)
            if (!result.success) {
                ElMessage.error(`数据校验失败: ${result.errors?.join(', ')}`)
                return
            }
            const { componentData: components, canvasStyle } = result.data!
            const newComponents = regenerateComponentIds(components)

            if (componentData.value.length > 0) {
                ElMessageBox.confirm('当前画布有内容，导入将覆盖现有内容，是否继续？', '导入确认',
                    { confirmButtonText: '覆盖', cancelButtonText: '取消', type: 'warning' },
                ).then(() => applyImport(newComponents, canvasStyle ?? null))
                    .catch(() => {})
            } else {
                applyImport(newComponents, canvasStyle ?? null)
            }
        }
        isShowDialog.value = false
    } catch (error) {
        ElMessage.error('数据格式错误，请传入合法的 JSON 格式数据')
    }
}

function applyImport(components: ComponentData[], canvasStyle: CanvasStyleData | null): void {
    importDataWithCommand(components, canvasStyle ?? undefined)
    if (canvasStyle) { scale.value = canvasStyle.scale }
    ElMessage.success(`导入成功，共 ${components.length} 个组件`)
}

function onExportJSON(): void {
    isShowDialog.value = true
    isExport.value = true
    const exportData: ExportData = {
        version: DATA_VERSION,
        timestamp: Date.now(),
        canvasStyle: canvasStyleData.value,
        componentData: componentData.value,
    }
    jsonData.value = JSON.stringify(exportData, null, 2)
}

function onExportHTML(): void {
    if (componentData.value.length === 0) {
        ElMessage.warning('画布为空，请先添加组件')
        return
    }

    const html = exportToHtml({
        title: '低代码页面',
        componentData: componentData.value,
        canvasStyle: canvasStyleData.value,
    })

    // 生成文件名（包含时间戳）
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    downloadHtmlFile(html, `page-${timestamp}.html`)

    ElMessage.success('HTML 导出成功，双击文件即可预览')
}

function downloadFileUtil(data: string, type: string, fileName: string): void {
    const url = window.URL.createObjectURL(new Blob([data], { type }))
    const link = document.createElement('a')
    link.style.display = 'none'
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

function beforeUpload(file: File): boolean {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        ElMessage.error('只支持 JSON 格式文件')
        return false
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
        ElMessage.error('文件大小不能超过 10MB')
        return false
    }
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = function () { jsonData.value = this.result as string }
    return false
}

function showVersionHistory(): void { isShowVersionHistory.value = true }
</script>

<style lang="scss" scoped>
.toolbar {
    height: 48px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 110;

    .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 4px 0;

        // 隐藏滚动条
        scrollbar-width: none;
        &::-webkit-scrollbar { display: none; }
    }

    .toolbar-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        margin-left: 12px;
    }

    .btn-group {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;

        .group-label {
            font-size: 11px;
            color: var(--secondary-text-color);
            margin-right: 4px;
            user-select: none;
            font-weight: 500;
            letter-spacing: 0.5px;
            white-space: nowrap;
            line-height: 28px;
        }

        .el-button {
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
            border-color: transparent;
            height: 28px;
            line-height: 1;
            font-weight: 450;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;

            &:hover {
                background-color: var(--button-active-bg-color);
                color: var(--primary-color);
            }

            &.is-disabled { opacity: 0.35; }
        }
    }

    .upload-label {
        display: inline-flex;
        cursor: pointer;
    }

    .canvas-config {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 12px;
        color: var(--text-color);
        white-space: nowrap;

        label {
            color: var(--secondary-text-color);
            font-size: 12px;
        }

        .separator { color: var(--secondary-text-color); }

        .canvas-input {
            width: 46px;
            height: 26px;
            padding: 0 4px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
            outline: none;
            background: var(--main-bg-color);
            color: var(--text-color);

            &:focus {
                border-color: var(--primary-color);
            }
        }

        .scale-input { width: 42px; }
    }

    :deep(.el-switch) {
        --el-switch-on-color: var(--primary-color);
    }

    :deep(.el-divider--vertical) {
        height: 20px;
        border-color: var(--border-color);
    }
}

.dark.toolbar {
    background: rgba(26, 26, 46, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom-color: #2a2a4a;

    .btn-group {
        .group-label {
            color: #a0a0b0;
        }

        .el-button {
            background-color: #252545;
            border-color: #3a3a5a;
            color: #e0e0e0;

            &:hover {
                background-color: #2e2e55;
                border-color: #409eff;
                color: #409eff;
            }

            &.is-disabled {
                background-color: #1a1a35;
                border-color: #2a2a4a;
                color: #505070;
            }
        }
    }

    .canvas-config {
        label {
            color: #a0a0b0;
        }

        .canvas-input {
            background: #1e1e3a;
            border-color: #2a2a4a;
            color: #e0e0e0;

            &:focus {
                border-color: #409eff;
            }
        }
    }
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>


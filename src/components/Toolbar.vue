<template>
    <div>
        <div :class="isDarkMode ? 'dark toolbar' : 'toolbar'">
            <!-- 左侧按钮组 -->
            <div class="toolbar-left">
                <!-- 数据 -->
                <div class="btn-group">
                    <span class="group-label">数据</span>
                    <el-button @click="onAceEditorChange" :icon="Edit" size="small">JSON</el-button>
                    <el-button @click="onImportJSON" :icon="Upload" size="small">导入</el-button>
                    <el-button @click="onExportJSON" :icon="Download" size="small">导出</el-button>
                    <el-button @click="onExportHTML" :icon="Document" size="small">导出 HTML</el-button>
                </div>

                <!-- 编辑 -->
                <div class="btn-group">
                    <span class="group-label">编辑</span>
                    <el-button @click="undo" :icon="RefreshLeft" size="small">撤销</el-button>
                    <el-button @click="redo" :icon="RefreshRight" size="small">重做</el-button>
                </div>

                <!-- 插入 -->
                <div class="btn-group">
                    <span class="group-label">插入</span>
                    <label for="input" class="upload-label">
                        <el-button :icon="Picture" size="small">图片</el-button>
                        <input id="input" type="file" hidden accept="image/*" @change="handleFileChange" />
                    </label>
                </div>

                <!-- 画布 -->
                <div class="btn-group">
                    <span class="group-label">画布</span>
                    <el-button @click="preview(false)" :icon="View" size="small">预览</el-button>
                    <el-button @click="save" :icon="FolderChecked" size="small">保存</el-button>
                    <el-button @click="clearCanvas" :icon="Delete" size="small">清空</el-button>
                    <el-button @click="preview(true)" :icon="Camera" size="small">截图</el-button>
                </div>

                <!-- 组件 -->
                <div class="btn-group">
                    <span class="group-label">组件</span>
                    <el-button :disabled="!areaData.components.length" @click="compose" :icon="Connection" size="small">组合</el-button>
                    <el-button :disabled="!curComponent || curComponent.isLock || curComponent.component != 'Group'" @click="decompose" :icon="Remove" size="small">拆分</el-button>
                    <el-button :disabled="!curComponent || curComponent.isLock" @click="lock" :icon="Lock" size="small">锁定</el-button>
                    <el-button :disabled="!curComponent || !curComponent.isLock" @click="unlock" :icon="Unlock" size="small">解锁</el-button>
                </div>

                <!-- 更多 -->
                <div class="btn-group">
                    <span class="group-label">更多</span>
                    <el-button @click="showVersionHistory" :icon="Clock" size="small">版本</el-button>
                </div>
            </div>

            <!-- 右侧：画布配置 + 主题 -->
            <div class="toolbar-right">
                <div class="canvas-config">
                    <label>画布</label>
                    <input v-model="canvasStyleData.width" class="canvas-input" />
                    <span class="separator">×</span>
                    <input v-model="canvasStyleData.height" class="canvas-input" />
                </div>
                <div class="canvas-config">
                    <label>比例</label>
                    <input v-model="scale" class="canvas-input scale-input" @input="handleScaleChange" />
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
        <AceEditor v-if="isShowAceEditor" @closeEditor="closeEditor" />

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
            <el-input v-model="jsonData" type="textarea" :rows="20" placeholder="请输入 JSON 数据" />
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="isShowDialog = false">取 消</el-button>
                    <el-upload
                        v-show="!isExport"
                        action="/"
                        :before-upload="beforeUpload"
                        :show-file-list="false"
                        accept="application/json"
                    >
                        <el-button type="primary">选择 JSON 文件</el-button>
                    </el-upload>
                    <el-button type="primary" @click="processJSON">确 定</el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import generateID from '@/utils/generateID'
import Preview from '@/components/Editor/Preview.vue'
import AceEditor from '@/components/Editor/AceEditor.vue'
import VersionHistory from '@/components/VersionHistory.vue'
import { commonStyle, commonAttr } from '@/custom-component/component-list'
import eventBus from '@/utils/eventBus'
import { $ } from '@/utils/utils'
import changeComponentsSizeWithScale, { changeComponentSizeWithScale } from '@/utils/changeComponentsSizeWithScale'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Sunny, Moon, Edit, Upload, Download, RefreshLeft, RefreshRight,
    Picture, View, FolderChecked, Delete, Camera, Connection,
    Remove, Lock, Unlock, Clock, Document
} from '@element-plus/icons-vue'
import type { ComponentData, CanvasStyleData, ComponentStyle } from '@/types'
import { validateAuto } from '@/utils/validation'
import { exportToHtml, downloadHtmlFile } from '@/utils/exportHtml'

interface ExportData {
    version: string
    timestamp: number
    canvasStyle: CanvasStyleData
    componentData: ComponentData[]
}

const store = useStore()
const { componentData, canvasStyleData, areaData, curComponent, isDarkMode } = storeToRefs(store)

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

const DATA_VERSION = '1.0.0'

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

function handleToggleDarkMode(value: boolean): void {
    store.toggleDarkMode(value)
    switchValue.value = value
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
function compose() { store.composeWithCommand() }
function decompose() { store.decomposeWithCommand() }
function undo() { store.undo() }
function redo() { store.redo() }

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
            store.addComponentWithCommand(component)

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

function save(): void {
    try {
        localStorage.setItem('canvasData', JSON.stringify(componentData.value))
        localStorage.setItem('canvasStyle', JSON.stringify(canvasStyleData.value))
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
        store.clearCanvasWithCommand()
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
            : {})
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
                    { confirmButtonText: '覆盖', cancelButtonText: '取消', type: 'warning' }
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
    store.importDataWithCommand(components, canvasStyle ?? undefined)
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
    background: rgba(24, 24, 27, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>

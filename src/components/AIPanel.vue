<template>
    <div class="agent-panel" :class="{ visible: modelValue }">
        <!-- 头部 -->
        <div class="agent-header">
            <div class="header-left">
                <span class="agent-logo">🤖</span>
                <span class="agent-title">AI Agent</span>
                <span v-if="editorComponents.length" class="context-badge">
                    {{ editorComponents.length }} 个现有组件
                </span>
                <span v-if="currentDimension" class="dim-badge">{{ currentDimension }}</span>
                <span v-if="tokenUsage" class="token-badge" :title="tokenUsageTitle">
                    ⚡ {{ tokenUsage.totalTokens.toLocaleString() }} tokens
                </span>
                <span class="agent-status" :class="`status-${statusTone}`">{{ statusLabel }}</span>
            </div>
            <div class="header-right">
                <el-button
                    v-if="steps.length"
                    text
                    size="small"
                    @click="clearAll"
                >
                    清空
                </el-button>
                <el-button text :icon="Close" @click="close" />
            </div>
        </div>

        <div v-if="progress" class="agent-progress" aria-live="polite">
            <div class="progress-meta">
                <span>{{ progressLabel }}</span>
                <span>{{ progressPercent }}%</span>
            </div>
            <div class="progress-track">
                <span class="progress-value" :style="{ width: `${progressPercent}%` }" />
            </div>
        </div>

        <div
            v-if="validation && (validation.errors.length || validation.warnings.length)"
            class="validation-summary"
            :class="{ invalid: validation.errors.length }"
        >
            <span class="validation-mark">{{ validation.errors.length ? '!' : '✓' }}</span>
            <span>
                {{ validation.errors.length
                    ? `${validation.errors.length} 个问题待修复`
                    : `${validation.warnings.length} 个布局提醒` }}
            </span>
        </div>

        <!-- 步骤列表 -->
        <div ref="stepsBodyRef" class="agent-steps">
            <!-- 空状态 -->
            <div v-if="!steps.length && !loading" class="agent-empty">
                <div class="empty-icon">
                    🎨
                </div>
                <p class="empty-title">
                    描述你想要的页面
                </p>
                <p class="empty-sub">
                    {{ contextSummary }}。AI 会先读取真实画布，再逐步执行和验证
                </p>
                <div class="empty-examples">
                    <el-tag
                        v-for="ex in examples"
                        :key="ex"
                        class="example-tag"
                        effect="plain"
                        @click="sendMessage(ex)"
                    >
                        {{ ex }}
                    </el-tag>
                </div>
            </div>

            <!-- 消息归组渲染 -->
            <template v-for="group in messageGroups" :key="group.id">
                <!-- 用户消息组 -->
                <div v-if="group.type === 'user'" class="msg-group-user">
                    <div class="user-bubble">
                        <span class="user-bubble-text">{{ group.steps[0]?.title }}</span>
                    </div>
                </div>

                <!-- Agent 消息组（thinking + tool_call + tool_result） -->
                <div v-else-if="group.type === 'agent'" class="msg-group-agent">
                    <div class="msg-group-header" @click="toggleGroup(group.id)">
                        <span class="msg-group-icon">🤖</span>
                        <span class="msg-group-title">{{ groupTitle(group) }}</span>
                        <span class="msg-group-toggle">{{ collapsedGroups.has(group.id) ? '▶' : '▼' }}</span>
                    </div>
                    <div v-show="!collapsedGroups.has(group.id)" class="msg-group-body">
                        <!-- thinking -->
                        <div v-if="group.thinking && !isRedundantThinking(group)" class="group-thinking">
                            <div class="thinking-header" @click.stop="toggleThinking(group.thinking.id)">
                                <span class="thinking-icon">🤔</span>
                                <span class="thinking-title">{{ group.thinking.title || '思考中...' }}</span>
                                <span class="thinking-toggle">{{ isThinkingExpanded(group.thinking.id) ? '▼' : '▶' }}</span>
                            </div>
                            <div v-if="isThinkingExpanded(group.thinking.id)" class="thinking-body typewriter" :class="{ active: group.thinking.status === 'running' }">
                                {{ group.thinking.description }}
                            </div>
                        </div>

                        <!-- tool_call / tool_result / ask_user 链 -->
                        <div v-for="step in group.steps" :key="step.id" class="group-action">
                            <div v-if="step.type === 'tool_call'" class="group-tool-call">
                                <span class="tool-status-icon">
                                    <span v-if="step.status === 'running'" class="icon-running">⏳</span>
                                    <span v-else-if="step.status === 'success'" class="icon-success">✓</span>
                                    <span v-else-if="step.status === 'error'" class="icon-error">✗</span>
                                    <span v-else class="icon-pending">○</span>
                                </span>
                                <span class="tool-name">{{ toolStepTitle(step) }}</span>
                                <!-- P0: 参数可视化 -->
                                <span v-if="step.toolArgs && formatToolArgs(step.toolName || '', step.toolArgs)" class="tool-args">
                                    {{ formatToolArgs(step.toolName || '', step.toolArgs) }}
                                </span>
                            </div>
                            <div v-else-if="step.type === 'tool_result'" class="group-tool-result">
                                <span class="result-icon">→</span>
                                <span class="result-text">{{ resultStepTitle(step, steps) }}</span>
                                <span v-if="step.description" class="result-desc">{{ step.description }}</span>
                                <!-- 步骤审批：勾选应用 / 取消跳过 -->
                                <label
                                    v-if="step.preview && step.preview.length"
                                    class="step-approve"
                                    :class="{ disabled: loading }"
                                    @click.stop
                                >
                                    <input
                                        type="checkbox"
                                        :checked="isStepApproved(step.id)"
                                        :disabled="loading"
                                        @change="toggleStepApproval(step.id)"
                                    />
                                    <span>{{ isStepApproved(step.id) ? '应用此步' : '跳过此步' }}</span>
                                </label>
                                <span v-if="step.diff?.summary" class="step-diff">{{ step.diff.summary }}</span>
                            </div>
                            <!-- 连续多步卡片选择：ask_user 嵌在 agent 组内 -->
                            <div v-else-if="step.type === 'user_input' && step.cards?.length" class="group-ask-cards">
                                <div class="ask-cards-header">
                                    <span class="ask-cards-icon">🎯</span>
                                    <span class="ask-cards-title">{{ step.title }}</span>
                                </div>
                                <p v-if="step.description" class="ask-cards-desc">{{ step.description }}</p>
                                <div class="user-input-cards">
                                    <div
                                        v-for="card in step.cards"
                                        :key="card.id"
                                        class="user-card"
                                        :class="{ selected: selectedCardId === card.id, disabled: loading || !waitingForInput }"
                                        :aria-disabled="loading || !waitingForInput"
                                        @click="handleCardSelect(card)"
                                    >
                                        <span v-if="card.tag" class="card-tag">{{ card.tag }}</span>
                                        <span class="card-title">{{ card.title }}</span>
                                        <span class="card-desc">{{ card.description }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- user_input（AI 提问 + 卡片） -->
                <div v-else-if="group.type === 'ask_user'" class="msg-group-ask">
                    <div class="step-user-input">
                        <div class="user-input-header">
                            <span class="user-input-icon">🎯</span>
                            <span class="user-input-title">{{ group.steps[0]?.title }}</span>
                        </div>
                        <p v-if="group.steps[0]?.description" class="user-input-desc">
                            {{ group.steps[0]?.description }}
                        </p>
                        <div v-if="group.steps[0]?.cards?.length" class="user-input-cards">
                            <div
                                v-for="card in group.steps[0]?.cards"
                                :key="card.id"
                                class="user-card"
                                :class="{ selected: selectedCardId === card.id, disabled: loading || !waitingForInput }"
                                :aria-disabled="loading || !waitingForInput"
                                @click="handleCardSelect(card)"
                            >
                                <span v-if="card.tag" class="card-tag">{{ card.tag }}</span>
                                <span class="card-title">{{ card.title }}</span>
                                <span class="card-desc">{{ card.description }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- done -->
                <div v-else-if="group.type === 'done'" class="msg-group-done">
                    <div class="step-done">
                        <span class="done-icon">{{ group.steps[0]?.status === 'error' ? '!' : '✓' }}</span>
                        <span class="done-text">{{ group.steps[0]?.title || '已完成' }}</span>
                    </div>
                </div>
            </template>

            <!-- 加载中 - 骨架屏 -->
            <div v-if="loading && steps.length === 0" class="skeleton-loading">
                <div class="skeleton-group">
                    <div class="skeleton-header">
                        <span class="skeleton-badge" />
                        <span class="skeleton-line w60" />
                    </div>
                    <div class="skeleton-body">
                        <div class="skeleton-row">
                            <span class="skeleton-icon" />
                            <span class="skeleton-text w80" />
                            <span class="skeleton-text w40" />
                        </div>
                        <div class="skeleton-row">
                            <span class="skeleton-icon" />
                            <span class="skeleton-text w60" />
                        </div>
                        <div class="skeleton-row">
                            <span class="skeleton-icon" />
                            <span class="skeleton-text w80" />
                        </div>
                    </div>
                </div>
                <div class="skeleton-group">
                    <div class="skeleton-header">
                        <span class="skeleton-badge" />
                        <span class="skeleton-line w40" />
                    </div>
                    <div class="skeleton-body">
                        <div class="skeleton-row">
                            <span class="skeleton-icon" />
                            <span class="skeleton-text w60" />
                        </div>
                        <div class="skeleton-row">
                            <span class="skeleton-icon" />
                            <span class="skeleton-text w80" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- 加载中 - 三点（已有步骤时用） -->
            <div v-else-if="loading" class="step-loading">
                <span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" />
                <span class="loading-text">{{ loadingLabel }}</span>
                <button class="stop-btn" title="停止生成" @click="stopGeneration">
                    ■
                </button>
            </div>

            <div v-if="streamError" class="stream-error" role="alert">
                <div class="error-copy">
                    <strong>生成没有完成</strong>
                    <span>{{ streamError }}</span>
                </div>
                <button
                    class="retry-btn"
                    type="button"
                    :disabled="loading || !lastRequest"
                    @click="retryLastRequest"
                >
                    重试
                </button>
            </div>
        </div>

        <!-- 实时预览 -->
        <div v-if="previewComponents.length" class="agent-preview">
            <div class="preview-header">
                <div class="preview-heading">
                    <span class="preview-title">实时预览</span>
                    <span class="preview-count">{{ previewComponents.length }} 个组件</span>
                </div>
                <button class="preview-toggle" type="button" @click="previewCollapsed = !previewCollapsed">
                    {{ previewCollapsed ? '展开' : '收起' }}
                </button>
            </div>
            <div v-show="!previewCollapsed" ref="previewWrapRef" class="preview-canvas-wrap">
                <div class="preview-stage" :style="previewStageStyle">
                    <div class="preview-canvas" :style="previewCanvasStyle">
                        <PreviewNode
                            v-for="comp in previewComponents"
                            :key="comp.id"
                            :node="comp"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- 输入框 -->
        <div class="agent-input-area">
            <el-input
                v-model="inputText"
                type="textarea"
                :rows="1"
                :placeholder="waitingForInput ? '或输入你的自定义想法...' : '描述你想要的页面...'"
                :disabled="loading"
                @keydown.enter.exact.prevent="handleSend"
            />
            <button
                class="send-btn"
                :class="{ disabled: !inputText.trim() || loading }"
                :disabled="!inputText.trim() || loading"
                @click="handleSend"
            >
                <svg
                    v-if="!loading"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M7 11l5-5 5 5M12 6v12" />
                </svg>
                <span v-else class="send-loading" />
            </button>
        </div>

        <!-- 有可交付预览后即可应用，不再被 Agent 的完成态锁死 -->
        <div v-if="canApplyToCanvas" class="agent-actions">
            <el-button
                type="primary"
                size="small"
                :disabled="loading"
                @click="applyToCanvas"
            >
                {{ done || stepLimitReached ? '应用到画布' : '应用当前预览' }}
            </el-button>
            <el-button size="small" @click="clearAll">
                重新开始
            </el-button>
            <!-- P3: 步骤级 undo -->
            <el-button
                v-if="canvasSnapshots.length > 1"
                size="small"
                :disabled="canvasSnapshots.length <= 1"
                @click="undoLastStep"
            >
                ↩ 撤销上一步
            </el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useStore } from '@/store'
import { agentStreamRound } from '@/api/agent'
import { importDataWithCommand } from '@/composables/useCommandActions'
import PreviewNode from './agent/PreviewNode.vue'
import {
    formatToolArgs,
    groupTitle,
    isRedundantThinking,
    resultStepTitle,
    toolStepTitle,
    type MessageGroup,
} from './agent/presentation'
import type { AgentStep, AgentCard, AgentContext, AgentValidationReport, RoundResponse, TokenUsage } from '@/types/agent'
import type { ComponentData, CanvasStyleData } from '@/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useStore()
const {
    componentData: editorComponents,
    canvasStyleData: editorCanvasStyle,
    curComponent,
    areaData,
    dataVersion,
} = storeToRefs(store)
const stepsBodyRef = ref<HTMLElement>()
const previewWrapRef = ref<HTMLElement>()
const previewWrapWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

const abortController = ref<AbortController | null>(null)

// ==================== 状态 ====================
const sessionId = ref<string | null>(null)
const steps = ref<AgentStep[]>([])
const previewComponents = ref<ComponentData[]>([])
const canvasStyle = ref<CanvasStyleData>({
    width: 375, height: 667, scale: 100, color: '#000', opacity: 1, backgroundColor: '#fff', fontSize: 14,
})
const currentDimension = ref('')
const done = ref(false)
const waitingForInput = ref(false)
const loading = ref(false)
const inputText = ref('')
const expandedThinking = ref<Set<string>>(new Set())
const expandedGroups = ref<Set<string>>(new Set())    // P1: 折叠组（默认展开，记录被折叠的组）
const collapsedGroups = expandedGroups
const thinkingText = ref('')           // 当前轮次的实时思考文本
const thinkingStepId = ref<string | null>(null)  // 动态 thinking 步骤 id

// P2: 打字机逐字渲染队列
const typewriterQueue = ref<string[]>([])
let typewriterTimer: ReturnType<typeof setInterval> | null = null
function pushTypewriter(chars: string) {
    if (!chars) return
    typewriterQueue.value.push(...chars.split(''))
    if (!typewriterTimer) {
        typewriterTimer = setInterval(() => {
            if (typewriterQueue.value.length === 0) {
                if (typewriterTimer) clearInterval(typewriterTimer)
                typewriterTimer = null
                return
            }
            const char = typewriterQueue.value.shift()!
            const idx = steps.value.findIndex(s => s.id === thinkingStepId.value)
            if (idx !== -1) {
                steps.value[idx] = {
                    ...steps.value[idx],
                    description: (steps.value[idx].description || '') + char,
                    title: extractThinkingTitle(steps.value[idx].description || ''),
                }
            }
        }, 10)
    }
}

// P3: 画布快照链（用于步骤级 undo）
const canvasSnapshots = ref<{ preview: ComponentData[], canvasStyle: CanvasStyleData, label: string }[]>([])

// P4: 步骤审批 —— 记录被勾选（应用）的 tool_result 步骤 id，默认全部应用
const approvedStepIds = ref<Set<string>>(new Set())

function isStepApproved(stepId: string): boolean {
    return approvedStepIds.value.has(stepId)
}

function toggleStepApproval(stepId: string) {
    if (loading.value) return
    const next = new Set(approvedStepIds.value)
    if (next.has(stepId)) {
        next.delete(stepId)
    } else {
        next.add(stepId)
    }
    approvedStepIds.value = next
}

/**
 * 最后一个被勾选的 tool_result 步骤画布快照。
 * 用户取消勾选后续步骤时，应用结果回退到该快照（逐步确认语义）。
 */
const approvedPreview = computed<ComponentData[]>(() => {
    let snapshot: ComponentData[] = []
    for (const step of steps.value) {
        if (step.type === 'tool_result'
            && Array.isArray(step.preview)
            && step.preview.length
            && approvedStepIds.value.has(step.id)) {
            snapshot = step.preview
        }
    }
    return snapshot
})

/**
 * 按执行顺序收集所有已勾选步骤的画布快照链。
 * 应用时逐条压入 ImportDataCommand，使撤销可单步回退。
 */
const approvedSnapshots = computed<ComponentData[][]>(() => {
    const snapshots: ComponentData[][] = []
    for (const step of steps.value) {
        if (step.type === 'tool_result'
            && Array.isArray(step.preview)
            && step.preview.length
            && approvedStepIds.value.has(step.id)) {
            snapshots.push(step.preview)
        }
    }
    return snapshots
})

/** 未应用的步骤数（用于提示） */
const skippedStepCount = computed(() => {
    const resultSteps = steps.value.filter(step => step.type === 'tool_result' && step.preview?.length)
    return resultSteps.filter(step => !approvedStepIds.value.has(step.id)).length
})

const streamError = ref<string | null>(null)
const stopped = ref(false)
const selectedCardId = ref<string | null>(null)
const previewCollapsed = ref(false)
const progress = ref<RoundResponse['progress'] | null>(null)
const stepLimitReached = ref(false)
const validation = ref<AgentValidationReport | null>(null)
// token 用量（服务端 buildResponse 透出，session 累计值）
const tokenUsage = ref<TokenUsage | null>(null)
const lastRequest = ref<{ input: { type: 'card_select' | 'free_text'; value: string; cardId?: string }; resume: boolean } | null>(null)

async function syncPreviewObserver() {
    resizeObserver?.disconnect()
    resizeObserver = null

    if (!props.modelValue || previewCollapsed.value || !previewComponents.value.length) {
        previewWrapWidth.value = 0
        return
    }

    await nextTick()
    const element = previewWrapRef.value
    if (!element) return

    previewWrapWidth.value = element.clientWidth
    if (typeof ResizeObserver === 'undefined') return

    resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            previewWrapWidth.value = entry.contentRect.width
        }
    })
    resizeObserver.observe(element)
}

onMounted(syncPreviewObserver)

watch(
    [() => props.modelValue, () => previewComponents.value.length, previewCollapsed],
    syncPreviewObserver,
    { flush: 'post' },
)

onUnmounted(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
})

const examples = [
    '街舞社招新海报，酷炫风格',
    '读书分享会宣传海报，文艺清新',
    '志愿者报名表，含姓名学号学院',
    '社团纳新报名表，5个部门选择',
]

// ==================== 计算属性 ====================
const selectedEditorIds = computed(() => {
    const areaIds = areaData.value.components.map(component => component.id)
    if (areaIds.length) return [...new Set(areaIds)]
    return curComponent.value ? [curComponent.value.id] : []
})

const contextSummary = computed(() => {
    if (!editorComponents.value.length) return '当前是空画布'
    if (selectedEditorIds.value.length) {
        return `已读取 ${editorComponents.value.length} 个组件，当前选中 ${selectedEditorIds.value.length} 个`
    }
    return `已读取当前画布的 ${editorComponents.value.length} 个组件`
})

const previewScale = computed(() => {
    const wrapWidth = previewWrapWidth.value || 300
    const canvasW = canvasStyle.value.width || 375
    const padding = 24 // 12px * 2
    const available = wrapWidth - padding
    if (available <= 0) return 1
    return Math.min(1, available / canvasW)
})

const messageGroups = computed<MessageGroup[]>(() => {
    const groups: MessageGroup[] = []
    let current: MessageGroup | null = null

    for (const step of steps.value) {
        if (step.id?.startsWith('user_') && step.type === 'user_input') {
            // 用户消息 → 新组
            current = { id: `user_${step.id}`, type: 'user', steps: [step] }
            groups.push(current)
        } else if (step.type === 'thinking') {
            // 开始新的 Agent 组
            current = { id: step.id, type: 'agent', steps: [], thinking: step }
            groups.push(current)
        } else if (step.type === 'user_input' && step.cards?.length) {
            // ask_user 卡片：附到当前 agent 组末尾，不另起组
            if (current?.type === 'agent') {
                current.steps.push(step)
            } else {
                current = { id: step.id, type: 'ask_user', steps: [step] }
                groups.push(current)
            }
        } else if (step.type === 'done') {
            // 完成/错误组
            groups.push({ id: step.id, type: 'done', steps: [step] })
            current = null
        } else if (current) {
            current.steps.push(step)
        } else {
            // 游离步骤兜底
            current = { id: `orphan_${step.id}`, type: 'agent', steps: [step] }
            groups.push(current)
        }
    }

    return groups
})

// P1: 切换组折叠
function toggleGroup(id: string) {
    if (collapsedGroups.value.has(id)) {
        collapsedGroups.value.delete(id)
    } else {
        collapsedGroups.value.add(id)
    }
}

const previewCanvasStyle = computed(() => ({
    width: `${canvasStyle.value.width}px`,
    height: `${canvasStyle.value.height}px`,
    backgroundColor: canvasStyle.value.backgroundColor,
    transform: `scale(${previewScale.value})`,
    transformOrigin: 'top left',
}))

const previewStageStyle = computed(() => ({
    width: `${Math.max(1, canvasStyle.value.width * previewScale.value)}px`,
    height: `${Math.max(1, canvasStyle.value.height * previewScale.value)}px`,
}))

const progressPercent = computed(() => {
    if (!progress.value?.totalSteps) return 0
    return Math.min(100, Math.round((progress.value.currentStep / progress.value.totalSteps) * 100))
})

const progressLabel = computed(() => {
    if (!progress.value) return ''
    return `本轮执行 ${progress.value.currentStep}/${progress.value.totalSteps}`
})

const hasValidationErrors = computed(() => Boolean(validation.value?.errors.length))

const canApplyToCanvas = computed(() => (
    !loading.value
    && (approvedPreview.value.length > 0 || previewComponents.value.length > 0)
))

const statusLabel = computed(() => {
    if (loading.value) return '执行中'
    if (streamError.value) return '需要重试'
    if (stopped.value) return '已停止'
    if (hasValidationErrors.value) return '校验未通过'
    if (done.value) return '已完成'
    if (waitingForInput.value) return '等待选择'
    return steps.value.length ? '准备就绪' : '待命'
})

const statusTone = computed(() => {
    if (loading.value) return 'running'
    if (streamError.value) return 'error'
    if (stopped.value) return 'paused'
    if (hasValidationErrors.value) return 'error'
    if (done.value) return 'success'
    if (waitingForInput.value) return 'waiting'
    return 'idle'
})

/** token badge 的悬浮提示：输入/输出明细 */
const tokenUsageTitle = computed(() => {
    if (!tokenUsage.value) return ''
    const { promptTokens, completionTokens } = tokenUsage.value
    return `本轮累计 token：输入 ${promptTokens.toLocaleString()} / 输出 ${completionTokens.toLocaleString()}`
})

const loadingLabel = computed(() => {
    if (waitingForInput.value) return '等待你的选择...'
    return 'AI 正在执行...'
})

// ==================== 核心方法 ====================
async function sendMessage(text: string) {
    if (!text.trim() || loading.value) return

    // 添加用户消息步骤
    steps.value.push({
        id: `user_${Date.now()}`,
        type: 'user_input',
        title: text,
        status: 'success',
    })

    streamSendMessage({ type: 'free_text', value: text }, /* resume */ false)
}

/**
 * 流式发送请求（支持普通轮次和恢复断点）
 * resume=true 时后端从断点继续执行，不再调 LLM
 */
function buildAgentContext(): AgentContext {
    return {
        components: JSON.parse(JSON.stringify(editorComponents.value)),
        canvasStyle: { ...editorCanvasStyle.value },
        selectedComponentIds: selectedEditorIds.value,
        viewport: {
            width: store.editor?.clientWidth || editorCanvasStyle.value.width,
            height: store.editor?.clientHeight || editorCanvasStyle.value.height,
            scale: editorCanvasStyle.value.scale,
        },
        dataVersion: dataVersion.value,
    }
}

async function streamSendMessage(input: { type: 'card_select' | 'free_text'; value: string; cardId?: string }, resume: boolean) {
    loading.value = true
    done.value = false
    waitingForInput.value = false
    stopped.value = false
    streamError.value = null
    progress.value = null
    lastRequest.value = { input, resume }
    thinkingText.value = ''
    thinkingStepId.value = null
    scrollToBottom()

    const ctrl = new AbortController()
    abortController.value = ctrl

    try {
        await agentStreamRound(
            {
                sessionId: sessionId.value,
                userInput: input,
                context: buildAgentContext(),
                mode: 'loop',
            },
            {
                onThinkingStart: () => {
                    thinkingStepId.value = `thinking_${Date.now()}`
                    steps.value.push({
                        id: thinkingStepId.value,
                        type: 'thinking',
                        title: '思考中...',
                        description: '',
                        status: 'running',
                    })
                    expandedThinking.value.add(thinkingStepId.value)
                    scrollToBottom()
                },
                onThinkingDelta: (delta: string) => {
                    thinkingText.value += delta
                    // P2: 打字机逐字渲染
                    pushTypewriter(delta)
                    if (thinkingStepId.value && !typewriterTimer) {
                        // 没有打字机队列时的兜底：直接更新
                        const idx = steps.value.findIndex(s => s.id === thinkingStepId.value)
                        if (idx !== -1) {
                            steps.value[idx] = {
                                ...steps.value[idx],
                                description: thinkingText.value,
                                title: extractThinkingTitle(thinkingText.value),
                            }
                        }
                    }
                    scrollToBottom()
                },
                onThinking: (fullText: string) => {
                    // 立即刷新完整思考文本（兜底）
                    thinkingText.value = fullText
                    if (thinkingStepId.value) {
                        const idx = steps.value.findIndex(s => s.id === thinkingStepId.value)
                        if (idx !== -1) {
                            steps.value[idx] = {
                                ...steps.value[idx],
                                status: 'success',
                                description: fullText,
                                title: extractThinkingTitle(fullText) || '思考完成',
                            }
                        }
                    }
                },
                onToolCall: (step) => {
                    steps.value.push({ ...step })
                    scrollToBottom()
                },
                onToolResult: (step) => {
                    const toolCallId = step.id.startsWith('result_') ? step.id.slice('result_'.length) : ''
                    const callIdx = steps.value.findIndex(s => s.type === 'tool_call' && s.id === toolCallId)
                    if (callIdx !== -1) {
                        steps.value[callIdx] = { ...steps.value[callIdx], status: step.status }
                    }
                    if (!steps.value.some(s => s.id === step.id)) {
                        steps.value.push({ ...step })
                    }
                    // P4: 新步骤默认勾选应用
                    if (step.preview && Array.isArray(step.preview) && step.preview.length) {
                        const next = new Set(approvedStepIds.value)
                        next.add(step.id)
                        approvedStepIds.value = next
                    }
                    // 增量合并：只在 step 确实携带了画布快照时更新，避免中间态清空预览
                    if (step.preview && Array.isArray(step.preview) && step.preview.length > 0) {
                        if (!previewComponents.value.length) previewCollapsed.value = false
                        previewComponents.value = step.preview
                    }
                    if (step.canvasStyle) canvasStyle.value = step.canvasStyle
                    if (step.validation) validation.value = step.validation
                    // P3: 保存画布快照用于 undo
                    if (step.preview && step.canvasStyle) {
                        canvasSnapshots.value.push({
                            preview: JSON.parse(JSON.stringify(step.preview)),
                            canvasStyle: { ...step.canvasStyle },
                            label: step.title || `步骤 ${canvasSnapshots.value.length + 1}`,
                        })
                    }
                    scrollToBottom()
                },
                onUserInput: (step) => {
                    selectedCardId.value = null
                    steps.value.push({ ...step, type: 'user_input', status: 'pending' })
                    waitingForInput.value = true
                    scrollToBottom()
                },
                onDone: (res: RoundResponse) => {
                    sessionId.value = res.sessionId
                    currentDimension.value = res.currentDimension
                    if (!previewComponents.value.length && res.preview?.length) previewCollapsed.value = false
                    previewComponents.value = res.preview || []
                    canvasStyle.value = res.canvasStyle || canvasStyle.value
                    progress.value = res.progress || null
                    stepLimitReached.value = res.stepLimitReached || false
                    validation.value = res.validation || null
                    done.value = res.done
                    waitingForInput.value = res.waitingForInput
                    // token 用量：每轮完成后更新（session 累计值）
                    if (res.tokenUsage) tokenUsage.value = res.tokenUsage
                    // P4: 合并服务端附加的步骤 diff 摘要（SSE 流式推送的步骤不带 diff）
                    if (Array.isArray(res.steps) && res.steps.length) {
                        const diffMap = new Map(
                            res.steps
                                .filter(step => step.diff)
                                .map(step => [step.id, step.diff]),
                        )
                        if (diffMap.size) {
                            steps.value = steps.value.map(step => {
                                const diff = diffMap.get(step.id)
                                return diff ? { ...step, diff } : step
                            })
                        }
                    }
                    if ((res.done || res.stepLimitReached) && !steps.value.some(step => step.type === 'done' && step.status === 'success')) {
                        // 已有 stepLimitReached 步骤时不再重复添加
                        steps.value.push({
                            id: `done_${Date.now()}`,
                            type: 'done',
                            title: '页面方案已生成，可以应用到画布',
                            status: 'success',
                        })
                        scrollToBottom()
                    }
                },
                onError: (message, _code, debug) => {
                    streamError.value = message
                    steps.value.push({
                        id: `error_${Date.now()}`,
                        type: 'done',
                        title: `出错了: ${message}`,
                        description: debug,
                        status: 'error',
                    })
                    ElMessage.error(message)
                },
            },
            { resume, signal: ctrl.signal },
        )
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('未知错误')
        if (error.name === 'AbortError') {
            stopped.value = true
            steps.value.push({
                id: `stopped_${Date.now()}`,
                type: 'done',
                title: '已停止本次生成，可以继续输入新的想法',
                status: 'pending',
            })
        } else {
            streamError.value = error.message
            steps.value.push({
                id: `error_${Date.now()}`,
                type: 'done',
                title: '出错了: ' + error.message,
                status: 'error',
            })
            ElMessage.error(error.message || '请求失败')
        }
    } finally {
        loading.value = false
        abortController.value = null
    }
}

function extractThinkingTitle(text: string): string {
    if (!text) return '思考中...'
    const firstLine = text.split('\n')[0].trim()
    return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine
}

function stopGeneration() {
    if (!abortController.value) return
    abortController.value.abort()
}

function handleCardSelect(card: AgentCard) {
    if (loading.value || !waitingForInput.value) return

    selectedCardId.value = card.id
    const pendingStep = [...steps.value].reverse().find(step => step.type === 'user_input' && step.status === 'pending')
    if (pendingStep) pendingStep.status = 'success'
    steps.value.push({
        id: `user_${Date.now()}`,
        type: 'user_input',
        title: card.title,
        status: 'success',
    })
    streamSendMessage({
        type: 'card_select',
        value: card.title,
        cardId: card.id,
    }, /* resume */ true)
}

function retryLastRequest() {
    if (!lastRequest.value || loading.value) return
    streamSendMessage(lastRequest.value.input, lastRequest.value.resume)
}

async function applyToCanvas() {
    if (!canApplyToCanvas.value) return

    // P4: 应用已勾选步骤的最终快照；用户跳过部分步骤时回退到最后一个勾选步骤
    const targetPreview = approvedPreview.value.length ? approvedPreview.value : previewComponents.value
    const notices: string[] = []
    if (!done.value && !stepLimitReached.value) {
        notices.push('Agent 尚未完成全部步骤，将应用当前预览。')
    }
    if (skippedStepCount.value > 0) {
        notices.push(`已跳过 ${skippedStepCount.value} 个步骤，将应用最后一个勾选步骤之后的画布状态。`)
    }
    if (validation.value?.errors.length) {
        notices.push(`当前仍有 ${validation.value.errors.length} 个校验问题，应用后可在画布中继续调整。`)
    } else if (validation.value?.warnings.length) {
        notices.push(`当前有 ${validation.value.warnings.length} 个布局提醒。`)
    }

    if (notices.length) {
        try {
            await ElMessageBox.confirm(
                notices.join('\n'),
                '确认应用当前方案',
                {
                    confirmButtonText: '仍要应用',
                    cancelButtonText: '继续调整',
                    type: validation.value?.errors.length ? 'warning' : 'info',
                },
            )
        } catch {
            return
        }
    }

    try {
        // P4: 按顺序应用每个已勾选步骤的快照，逐条压入命令栈 → 撤销可单步回退
        const snapshots = approvedSnapshots.value.length ? approvedSnapshots.value : [previewComponents.value]
        for (const snapshot of snapshots) {
            importDataWithCommand(snapshot, canvasStyle.value)
        }
        const targetPreview = snapshots[snapshots.length - 1] || []
        const expectedIds = new Set(targetPreview.map(component => component.id))
        const appliedIds = new Set(store.componentData.map(component => component.id))
        const missingIds = [...expectedIds].filter(id => !appliedIds.has(id))
        if (store.componentData.length !== targetPreview.length || missingIds.length) {
            throw new Error('画布数据校验失败，请重试')
        }
        const stepHint = snapshots.length > 1
            ? `已应用 ${snapshots.length} 个步骤，可逐条撤销`
            : skippedStepCount.value > 0 ? `已应用（跳过 ${skippedStepCount.value} 步）` : '已应用到画布'
        ElMessage.success(stepHint)
        close()
    } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        ElMessage.error(`应用到画布失败：${message}`)
    }
}

function clearAll() {
    abortController.value?.abort()
    steps.value = []
    previewComponents.value = []
    canvasSnapshots.value = []
    approvedStepIds.value = new Set()
    sessionId.value = null
    done.value = false
    waitingForInput.value = false
    currentDimension.value = ''
    streamError.value = null
    stopped.value = false
    selectedCardId.value = null
    previewCollapsed.value = false
    progress.value = null
    stepLimitReached.value = false
    validation.value = null
    tokenUsage.value = null
    lastRequest.value = null
}

function close() {
    emit('update:modelValue', false)
}

function toggleThinking(id: string) {
    if (expandedThinking.value.has(id)) {
        expandedThinking.value.delete(id)
    } else {
        expandedThinking.value.add(id)
    }
}

function isThinkingExpanded(id: string): boolean {
    return expandedThinking.value.has(id)
}

function handleSend() {
    if (inputText.value.trim()) {
        sendMessage(inputText.value)
        inputText.value = ''
    }
}

// P3: 撤销到上一步画布状态
function undoLastStep() {
    if (canvasSnapshots.value.length < 2) return
    canvasSnapshots.value.pop() // 移除当前快照
    const prev = canvasSnapshots.value[canvasSnapshots.value.length - 1]
    previewComponents.value = JSON.parse(JSON.stringify(prev.preview))
    canvasStyle.value = { ...prev.canvasStyle }
    ElMessage.info(`已回退到: ${prev.label}`)
}

function scrollToBottom() {
    nextTick(() => {
        if (stepsBodyRef.value) {
            stepsBodyRef.value.scrollTop = stepsBodyRef.value.scrollHeight
        }
    })
}

watch(() => props.modelValue, (val) => {
    if (val) scrollToBottom()
})
</script>

<style lang="scss" scoped>
.agent-panel {
  --agent-log-font-size: 12px;
  --agent-log-meta-size: 11px;

  position: fixed;
  top: 0;
  right: -500px;
  width: 480px;
  height: 100vh;
  background: var(--bg-primary, #fff);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 2100;
  transition: right 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  &.visible { right: 0; }
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.agent-logo { font-size: 20px; }

.agent-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.agent-status {
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1;
  padding: 4px 7px;
  white-space: nowrap;
}

.agent-status.status-running { color: #c47a18; background: #fff7e6; }
.agent-status.status-error { color: #c45656; background: #fff1f0; }
.agent-status.status-paused { color: #8b6f47; background: #f8f1e6; }
.agent-status.status-success { color: #3f8f62; background: #edf8f1; }
.agent-status.status-waiting { color: #4d78a8; background: #eef5fc; }
.agent-status.status-idle { color: var(--text-tertiary, #999); background: var(--bg-secondary, #f7f7f8); }

.context-badge {
  border-radius: 999px;
  padding: 3px 7px;
  color: #8a5a20;
  background: #fbf1df;
  font-size: 10px;
  white-space: nowrap;
}

.validation-summary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  color: #8a5a20;
  border-bottom: 1px solid rgba(196, 122, 24, 0.18);
  background: #fffaf1;
  font-size: 11px;
}

.validation-summary.invalid {
  color: #b64b4b;
  border-bottom-color: rgba(182, 75, 75, 0.18);
  background: #fff5f4;
}

.validation-mark {
  display: grid;
  width: 17px;
  height: 17px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-weight: 700;
}

.dim-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(64, 158, 255, 0.12);
  color: var(--primary-color);
  border-radius: 10px;
}

// token 用量 badge
.token-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
  border-radius: 10px;
  white-space: nowrap;
  cursor: help;
}

.header-right {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.agent-progress {
  padding: 8px 16px 10px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(90deg, rgba(196, 122, 24, 0.06), transparent);
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  color: var(--text-tertiary, #999);
  font-size: 10px;
}

.progress-track {
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--bg-tertiary, #ececef);
}

.progress-value {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #c47a18, #e5a83b);
  transition: width 0.35s ease;
}

// ==================== 步骤列表 ====================
.agent-steps {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  min-height: 0;
}

.step-item {
  padding: 6px 16px;
  animation: stepIn 0.3s ease;
}

@keyframes stepIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

// ==================== P1: 消息归组 ====================

.msg-group-user {
  display: flex;
  justify-content: flex-end;
  padding: 4px 16px;

  .user-bubble {
    max-width: 80%;
    background: var(--primary-color, #409eff);
    color: #fff;
    padding: 8px 14px;
    border-radius: 14px 14px 4px 14px;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
  }
}

.msg-group-agent {
  margin: 6px 12px;
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  .msg-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    cursor: pointer;
    user-select: none;
    background: var(--bg-secondary, #f7f7f8);
    transition: background 0.15s;

    &:hover { background: var(--bg-tertiary, #ececef); }
  }

  .msg-group-icon { font-size: 15px; }

  .msg-group-title {
    flex: 1;
    font-size: var(--agent-log-font-size);
    color: var(--text-secondary, #666);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .msg-group-toggle {
    font-size: 10px;
    color: var(--text-tertiary, #999);
  }

  .msg-group-body {
    padding: 8px 12px 12px;
    animation: groupBodyIn 0.25s ease;
  }
}

@keyframes groupBodyIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.msg-group-ask {
  margin: 6px 12px;
}

.msg-group-done {
  margin-top: 8px;
}

// thinking（消息归组内）
.group-thinking {
  margin-bottom: 6px;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

.thinking-icon { font-size: 14px; }
.thinking-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--agent-log-font-size);
  color: var(--text-secondary, #666);
  flex: 1;
}
.thinking-toggle {
  font-size: 10px;
  color: var(--text-tertiary, #999);
}

.thinking-body {
  margin-top: 6px;
  padding: 8px 10px;
  background: var(--bg-tertiary, #f4f4f5);
  border-radius: 8px;
  font-size: var(--agent-log-font-size);
  color: var(--text-secondary, #666);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

// P2: 打字机闪烁光标
.thinking-body.typewriter.active::after {
  content: '▊';
  display: inline;
  animation: cursorBlink 0.7s infinite;
  color: var(--text-tertiary, #999);
  font-size: 11px;
  margin-left: 1px;
}

@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

// tool_call / tool_result（消息归组内）
.group-action {
  padding: 3px 0;
}

.group-tool-call {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.group-tool-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-left: 24px;
  flex-wrap: wrap;
}

// P0: 工具参数可视化
.tool-args {
  font-size: var(--agent-log-meta-size);
  color: var(--text-tertiary, #888);
  background: var(--bg-tertiary, #f4f4f5);
  padding: 1px 8px;
  border-radius: 6px;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

// P4: 步骤审批（勾选应用 / 跳过）
.step-approve {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: var(--agent-log-meta-size);
  color: var(--text-secondary, #666);
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    accent-color: var(--primary-color, #409eff);
    cursor: pointer;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;

    input { cursor: not-allowed; }
  }
}

.step-diff {
  flex-basis: 100%;
  margin-left: 24px;
  font-size: var(--agent-log-meta-size);
  color: var(--text-tertiary, #888);
  background: var(--bg-tertiary, #f4f4f5);
  padding: 1px 8px;
  border-radius: 6px;
}

// ask_user 卡片（Agent 组内联）
.group-ask-cards {
  margin-top: 8px;
  padding: 10px;
  background: var(--bg-secondary, #f7f7f8);
  border-radius: 10px;
  border: 1px solid var(--border-color, #e8e8e8);
}

.ask-cards-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.ask-cards-icon { font-size: 16px; }

.ask-cards-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.ask-cards-desc {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin: 0 0 10px;
  line-height: 1.4;
}

.group-ask-cards .user-input-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.group-ask-cards .user-card {
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(.disabled) {
    border-color: #c47a18;
    box-shadow: 0 2px 8px rgba(196, 122, 24, 0.15);
    transform: translateY(-1px);
  }

  &.selected {
    border-color: #c47a18;
    background: #fff9ef;
  }

  &.disabled {
    cursor: default;
    opacity: 0.58;
  }
}

.group-ask-cards .card-tag {
  display: inline-block;
  font-size: 10px;
  padding: 1px 5px;
  background: rgba(64, 158, 255, 0.12);
  color: var(--primary-color);
  border-radius: 6px;
  margin-bottom: 3px;
}

.group-ask-cards .card-title {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 2px;
}

.group-ask-cards .card-desc {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, #666);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

// ==================== P4: 骨架屏 ====================
.skeleton-loading {
  padding: 12px 16px;

  .skeleton-group {
    margin: 8px 12px;
    border: 1px solid var(--border-color, #e8e8e8);
    border-radius: 12px;
    overflow: hidden;
  }

  .skeleton-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-secondary, #f7f7f8);
  }

  .skeleton-badge {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(90deg, #ececef 25%, #f5f5f6 50%, #ececef 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-line {
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(90deg, #ececef 25%, #f5f5f6 50%, #ececef 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    flex: 1;
  }

  .skeleton-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .skeleton-icon {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    background: linear-gradient(90deg, #ececef 25%, #f5f5f6 50%, #ececef 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-text {
    height: 10px;
    border-radius: 5px;
    background: linear-gradient(90deg, #ececef 25%, #f5f5f6 50%, #ececef 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-text.w40 { width: 40%; }
  .skeleton-text.w60 { width: 60%; }
  .skeleton-text.w80 { width: 80%; }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.tool-status-icon {
  font-size: var(--agent-log-font-size);
  width: 18px;
  text-align: center;
}

.icon-running { animation: spin 1s linear infinite; }
.icon-success { color: #67c23a; }
.icon-error { color: #f56c6c; }
.icon-pending { color: var(--text-tertiary, #999); }

.tool-name {
  font-size: var(--agent-log-font-size);
  color: var(--text-primary, #1a1a1a);
  font-weight: 500;
  line-height: 1.5;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// tool_result
.step-result {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0 4px 26px;
  font-size: 12px;
}

.result-icon {
  color: #67c23a;
  font-size: 12px;
}

.result-text {
  color: var(--text-secondary, #666);
  font-size: var(--agent-log-font-size);
  line-height: 1.5;
}

.result-desc {
  color: var(--text-tertiary, #999);
  font-size: var(--agent-log-meta-size);
  line-height: 1.5;
}

// user_input（AI 询问卡片 - 默认样式）
.step-user-input {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  margin: 8px 0;
}

// user_input（用户发送的消息 - 蓝色气泡）
.step-user-input.user-bubble {
  background: var(--primary-color);
  color: #fff;
  padding: 8px 12px;
  border-radius: 12px 12px 2px 12px;
  margin-left: auto;
  margin-right: 0;
  margin-top: 0;
  margin-bottom: 8px;
  max-width: 85%;
  border: none;

  .user-input-title {
    font-size: 13px;
    font-weight: 500;
  }
}

.user-input-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.user-input-icon { font-size: 18px; }

.user-input-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.user-input-desc {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin: 0 0 10px;
}

.user-input-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.user-card {
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(.disabled) {
    border-color: #c47a18;
    box-shadow: 0 4px 14px rgba(196, 122, 24, 0.16);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: #c47a18;
    background: #fff9ef;
    box-shadow: inset 0 0 0 1px #c47a18;
  }

  &.disabled {
    cursor: default;
    opacity: 0.58;
  }
}

.card-tag {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  background: rgba(64, 158, 255, 0.12);
  color: var(--primary-color);
  border-radius: 8px;
  margin-bottom: 4px;
}

.card-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 2px;
}

.card-desc {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, #666);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// done
.step-done {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
  margin-top: 8px;
}

.done-icon { font-size: 16px; }

.done-text {
  font-size: 13px;
  color: #67c23a;
  font-weight: 500;
}

// loading
.step-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
}

.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color);
  animation: bounce 1.4s infinite ease-in-out;

  &:nth-child(2) { animation-delay: 0.16s; }
  &:nth-child(3) { animation-delay: 0.32s; }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-text {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-left: 8px;
  flex: 1;
}

.stop-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: var(--text-tertiary, #999);
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: #f56c6c;
  }
}

// ==================== 空状态 ====================
.agent-empty {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px; }
.empty-sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 20px; }

.empty-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.example-tag {
  cursor: pointer;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 14px;

  &:hover {
    color: var(--primary-color);
    border-color: var(--primary-color);
  }
}

// ==================== 预览 ====================
.agent-preview {
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  height: clamp(180px, 32vh, 280px);
  max-height: 280px;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-secondary, #f7f7f8);
}

.preview-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.preview-toggle,
.retry-btn {
  border: 0;
  color: #a96516;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  padding: 3px 6px;
}

.preview-toggle:hover,
.retry-btn:hover:not(:disabled) {
  color: #7f4b0d;
}

.retry-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-count {
  font-size: 11px;
  color: var(--text-tertiary, #999);
}

.preview-canvas-wrap {
  flex: 1;
  overflow: auto;
  padding: 12px;
  display: flex;
  justify-content: center;
  background: linear-gradient(135deg, rgba(196, 122, 24, 0.03), transparent 55%);
}

.preview-stage {
  position: relative;
  flex: 0 0 auto;
}

.preview-canvas {
  position: absolute;
  top: 0;
  left: 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

// ==================== 输入区 ====================
.stream-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 16px 8px;
  padding: 10px 12px;
  border: 1px solid #f1c4c4;
  border-radius: 10px;
  background: #fff7f7;
}

.error-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
  color: #a94442;
  font-size: 11px;
}

.error-copy strong {
  font-size: 12px;
}

.error-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary, #fff);
  flex-shrink: 0;

  :deep(.el-textarea__inner) {
    background: var(--bg-secondary, #f4f4f5);
    border-radius: 20px;
    border: none;
    padding: 8px 14px;
    font-size: 13px;
    resize: none;

    &:focus { box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15); }
  }
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover:not(.disabled) {
    transform: scale(1.08);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
  }

  &.disabled {
    background: var(--bg-tertiary, #ececef);
    color: var(--text-tertiary, #999);
    cursor: not-allowed;
  }
}

.send-loading {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

// ==================== 操作按钮 ====================
.agent-actions {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
</style>

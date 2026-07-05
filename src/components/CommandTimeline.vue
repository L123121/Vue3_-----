<template>
    <div class="command-timeline">
        <div class="header">
            <h3>操作历史</h3>
            <span class="count">{{ timeline.length }} 步</span>
        </div>

        <div v-if="timeline.length === 0" class="empty">
            <p>暂无操作记录</p>
            <p class="tip">
                拖拽、缩放、删除等操作会在此记录
            </p>
        </div>

        <div v-else class="timeline-list">
            <div
                v-for="(item, index) in timeline"
                :key="item.id"
                class="timeline-item"
                :class="{ active: index === timeline.length - 1 }"
                @click="handleJumpTo(item.id)"
            >
                <span class="dot" />
                <span class="desc">{{ item.description }}</span>
                <span class="time">{{ formatTime(item.timestamp) }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { getCommandTimeline, undoUntil } from '@/composables/useCommandActions'

/**
 * 操作历史时间线
 *
 * 渲染撤销栈为可点击列表。点击某步 → 回退到该步(连续 undo)。
 * 栈数据来自 CommandManager,跨会话从 IndexedDB 恢复后仍可用。
 */

// 时间线需要响应式更新:监听 dataVersion(每次命令操作都递增)重新读取
const timeline = computed(() => getCommandTimeline())

function handleJumpTo(targetId: string): void {
    undoUntil(targetId)
}

function formatTime(ts: number): string {
    const d = new Date(ts)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
}

// 组件卸载时无需特殊清理(computed 自动回收)
onUnmounted(() => {})
</script>

<style lang="scss" scoped>
.command-timeline {
    padding: 12px;
    height: 100%;
    overflow-y: auto;

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        h3 {
            margin: 0;
            font-size: 14px;
        }

        .count {
            font-size: 12px;
            color: var(--el-text-color-secondary, #909399);
        }
    }

    .empty {
        text-align: center;
        color: var(--el-text-color-secondary, #909399);
        padding: 32px 0;

        p {
            margin: 4px 0;
        }

        .tip {
            font-size: 12px;
        }
    }

    .timeline-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .timeline-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.15s;

        &:hover {
            background: var(--el-fill-color-light, #f5f7fa);
        }

        &.active {
            background: var(--el-color-primary-light-9, #ecf5ff);
            color: var(--el-color-primary, #409eff);
        }

        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--el-color-primary, #409eff);
            flex-shrink: 0;
        }

        .desc {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .time {
            font-size: 11px;
            color: var(--el-text-color-secondary, #909399);
            flex-shrink: 0;
        }
    }
}
</style>

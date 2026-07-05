<template>
    <div class="real-time-component-list">
        <div
            v-for="item in sortedLayers"
            :key="item.id"
            class="list"
            :class="{ actived: item.id === curComponent?.id }"
            @click="onClick(item)"
        >
            <el-icon v-if="item.icon === 'DataAnalysis'" class="mr-4">
                <DataAnalysis />
            </el-icon>
            <span v-else class="iconfont" :class="'icon-' + item.icon" />

            <span class="label">{{ item.label }}</span>
            <span class="zindex-badge">{{ item.zIndex }}</span>

            <div class="icon-container">
                <el-button
                    link
                    :icon="ArrowUp"
                    size="small"
                    @click.stop="onUp(item)"
                />
                <el-button
                    link
                    :icon="ArrowDown"
                    size="small"
                    @click.stop="onDown(item)"
                />
                <el-button
                    link
                    :icon="Delete"
                    size="small"
                    type="danger"
                    @click.stop="onDelete(item)"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { DataAnalysis, ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import type { ComponentData } from '@/types'
import { layerOperation, deleteComponentWithCommand } from '@/composables/useCommandActions'

const store = useStore()
const { componentData, curComponent, rightList } = storeToRefs(store)

// 按 zIndex 降序排列（zIndex 越大 = 越靠上层 = 在图层列表顶部）
const sortedLayers = computed(() => {
    return [...componentData.value].sort((a, b) => b.zIndex - a.zIndex)
})

function onClick(item: ComponentData): void {
    if (!rightList.value) {
        store.toggleRightList()
    }
    const idx = componentData.value.findIndex(c => c.id === item.id)
    store.setCurComponent({ component: item, index: idx })
}

function onUp(item: ComponentData): void {
    onClick(item)
    layerOperation(item.id, 'up')
}

function onDown(item: ComponentData): void {
    onClick(item)
    layerOperation(item.id, 'down')
}

function onDelete(item: ComponentData): void {
    const idx = componentData.value.findIndex(c => c.id === item.id)
    if (idx !== -1) {
        deleteComponentWithCommand(item.id, idx)
    }
}
</script>

<style lang="scss" scoped>
.real-time-component-list {
    height: 35%;
    overflow: auto;

    .list {
        height: 40px;
        cursor: grab;
        text-align: center;
        color: var(--text-color);
        display: flex;
        align-items: center;
        font-size: 13px;
        padding: 0 10px;
        position: relative;
        user-select: none;
        opacity: 1;
        transition: background-color 0.2s;
        border-bottom: 1px solid var(--border-color);

        &:active {
            cursor: grabbing;
        }

        &:hover {
            background-color: var(--button-active-bg-color);

            .icon-container {
                display: flex;
            }
        }

        &.actived {
            background-color: var(--actived-bg-color);
            color: var(--actived-text-color);
        }

        .iconfont {
            margin-right: 8px;
            font-size: 16px;
        }

        .mr-4 {
            margin-right: 8px;
            font-size: 16px;
        }

        .label {
            flex: 1;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .zindex-badge {
            font-size: 10px;
            color: var(--secondary-text-color, #999);
            background: var(--placeholder-bg-color, #f0f0f0);
            padding: 0 6px;
            border-radius: 4px;
            margin-right: 8px;
            min-width: 20px;
            text-align: center;
        }

        .icon-container {
            position: absolute;
            right: 10px;
            display: none;
            align-items: center;

            .el-button {
                padding: 4px;
                margin-left: 2px;
            }
        }
    }
}
</style>

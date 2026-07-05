<template>
    <div class="component-list" @dragstart="handleDragStart">
        <div
            v-for="(item, index) in componentList"
            :key="index"
            class="list"
            :draggable="true"
            :data-index="index"
        >
            <el-icon v-if="iconMap[item.icon]" :size="24" class="icon-component">
                <component :is="iconMap[item.icon]" />
            </el-icon>
            <span v-else class="iconfont" :class="'icon-' + item.icon" />

            <span v-if="item.acceptChildren" class="container-badge">容器</span>
            <span class="text">{{ item.label }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getPublicComponents } from '@/custom-component/registry'
import type { ComponentMetaData } from '@/custom-component/registry'
import type { Component } from 'vue'
import {
    DataAnalysis,
    Edit,
    Mouse,
    Picture as PictureIcon,
    FullScreen,
    Minus,
    CircleCheck,
    Star,
    CaretTop,
    Grid,
} from '@element-plus/icons-vue'

// ==================== 从注册表获取公开组件列表 ====================
// 新增组件只需调用 registerComponent() 并设置 internal: false (或不设置)，
// 组件就会自动出现在左侧组件面板中
const componentList: ComponentMetaData[] = getPublicComponents()

const iconMap: Record<string, Component> = {
    'wenben': Edit,
    'button': Mouse,
    'tupian': PictureIcon,
    'juxing': FullScreen,
    'zhixian': Minus,
    '24gl-circle': CircleCheck,
    'kongxinputao': Star,
    'xingzhuang-sanjiaoxing': CaretTop,
    'biaoge': Grid,
    'DataAnalysis': DataAnalysis,
}

function handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement
    const listEl = target.closest('.list') as HTMLElement
    if (listEl && e.dataTransfer) {
        e.dataTransfer.setData('index', listEl.dataset.index || '')
        // 自定义拖拽预览：显示小标签而非整个卡片
        const ghost = document.createElement('div')
        ghost.textContent = listEl.querySelector('.text')?.textContent || ''
        Object.assign(ghost.style, {
            padding: '4px 12px',
            background: '#409eff',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '12px',
            position: 'absolute',
            top: '-999px',
            whiteSpace: 'nowrap',
        })
        document.body.appendChild(ghost)
        e.dataTransfer.setDragImage(ghost, 30, 14)
        // 使用 setTimeout 兜底，确保 ghost 元素一定被移除
        setTimeout(() => {
            if (ghost.parentNode) {
                document.body.removeChild(ghost)
            }
        }, 0)
    }
}
</script>

<style lang="scss" scoped>
.component-list {
    height: 100%;
    padding: 16px;
    display: grid;
    grid-gap: 12px;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 90px;
    align-content: flex-start;

    .list {
        width: 100%;
        height: 100%;
        border: 1px solid var(--border-color);
        cursor: grab;
        text-align: center;
        padding: 8px;
        user-select: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background-color: var(--main-bg-color);
        color: var(--text-color);
        position: relative;

        &:active {
            cursor: grabbing;
        }

        &:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border-color: var(--primary-color);
            color: var(--primary-color);
            transform: translateY(-2px);
        }

        .icon-component {
            margin-bottom: 8px;
            color: var(--secondary-text-color);
            transition: color 0.2s;
        }

        &:hover .icon-component {
            color: var(--primary-color);
        }

        .iconfont {
            font-size: 24px;
            margin-bottom: 8px;
            color: var(--secondary-text-color);
            transition: color 0.2s;
        }

        &:hover .iconfont {
            color: var(--primary-color);
        }

        .text {
            font-size: 12px;
        }

        .container-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 10px;
            background: #409eff;
            color: #fff;
            padding: 0 4px;
            border-radius: 2px;
            line-height: 16px;
        }
    }
}
</style>

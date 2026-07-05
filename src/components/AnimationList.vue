<template>
    <div class="animation-list">
        <div class="div-animation">
            <el-button-group class="w-full mb-10">
                <el-button type="primary" @click="isShowAnimation = true">
                    添加动画
                </el-button>
                <el-button @click="previewAnimate">
                    预览动画
                </el-button>
            </el-button-group>
            
            <div class="animation-tags">
                <el-tag
                    v-for="(tag, index) in animations"
                    :key="index"
                    closable
                    size="large"
                    @close="removeAnimation(index)"
                >
                    {{ tag.label }}
                    <el-icon class="cursor ml-2" @click="handleAnimationSetting(index)">
                        <Setting />
                    </el-icon>
                </el-tag>

                <div v-if="animations.length === 0" class="no-animation">
                    暂无动画
                </div>
            </div>
        </div>

        <!-- 选择动画 -->
        <Modal v-model="isShowAnimation">
            <div class="animation-modal-content">
                <h3 class="modal-title">
                    动画列表
                </h3>
                <el-tabs v-model="animationActiveName" type="border-card">
                    <el-tab-pane
                        v-for="item in animationClassData"
                        :key="item.label"
                        :label="item.label"
                        :name="item.label"
                    >
                        <el-scrollbar class="animate-container">
                            <div
                                v-for="animate in item.children"
                                :key="animate.value"
                                class="animate"
                                @mouseenter="runAnimationFn(animate)"
                                @click="addAnimation(animate)"
                            >
                                <div :class="[hoverPreviewAnimate === animate.value && animate.value + ' animated']">
                                    {{ animate.label }}
                                </div>
                            </div>
                        </el-scrollbar>
                    </el-tab-pane>
                </el-tabs>
            </div>
        </Modal>
        <!-- 编辑动画配置 -->
        <AnimationSettingModal
            v-if="isShowAnimationSetting"
            :cur-index="curIndex"
            @close="isShowAnimationSetting = false"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Modal from '@/components/Modal.vue'
import eventBus from '@/utils/eventBus'
import animationClassData from '@/utils/animationClassData'
import type { AnimationItem } from '@/utils/animationClassData'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import AnimationSettingModal from './AnimationSettingModal.vue'
import { Setting } from '@element-plus/icons-vue'

const store = useStore()
const { curComponent } = storeToRefs(store)
const animations = computed(() => curComponent.value?.animations ?? [])

const isShowAnimation = ref(false)
const hoverPreviewAnimate = ref('')
const animationActiveName = ref('进入')
const isShowAnimationSetting = ref(false)
const curIndex = ref(0)

function addAnimation(animate: AnimationItem): void {
    store.addAnimation(animate)
    isShowAnimation.value = false
}

function previewAnimate(): void {
    eventBus.emit('runAnimation')
}

function removeAnimation(index: number): void {
    store.removeAnimation(index)
    if (curComponent.value && !curComponent.value.animations.length) {
        eventBus.emit('stopAnimation')
    }
}

function handleAnimationSetting(index: number): void {
    isShowAnimationSetting.value = true
    curIndex.value = index
}

function runAnimationFn(animate: AnimationItem): void {
    hoverPreviewAnimate.value = animate.value
}
</script>

<style lang="scss" scoped>
.animation-list {
    padding-top: 10px;
    
    .div-animation {
        text-align: center;
        padding: 0 20px;

        .w-full {
            width: 100%;
        }
        
        .mb-10 {
            margin-bottom: 20px;
        }

        .animation-tags {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .el-tag {
            width: 100%;
            justify-content: space-between;
        }
        
        .no-animation {
            color: #909399;
            font-size: 12px;
        }
        
        .cursor {
            cursor: pointer;
        }
        
        .ml-2 {
            margin-left: 8px;
        }
    }

    .animation-modal-content {
        padding: 20px;
        height: 100%;
        display: flex;
        flex-direction: column;
        
        .modal-title {
            margin-bottom: 20px;
            font-size: 18px;
            font-weight: bold;
            color: var(--text-color);
        }
        
        .el-tabs {
            flex: 1;
            display: flex;
            flex-direction: column;
            
            :deep(.el-tabs__content) {
                flex: 1;
                padding: 10px;
            }
        }
    }

    .animate-container {
        height: 100%;
        
        :deep(.el-scrollbar__view) {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            padding-left: 10px;
        }

        .animate {
            cursor: pointer;
            width: 100px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 12px 10px 0;
            background: #f5f8fb;
            color: #333;
            border-radius: 3px;
            font-size: 12px;
            transition: all 0.2s;

            &:hover {
                color: #fff;
                background: #409eff;
            }
        }
    }
}
</style>

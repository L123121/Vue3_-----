<template>
    <div class="event-list">
        <div class="div-events">
            <el-button class="add-btn" type="primary" @click="isShowEvent = true">
                添加事件
            </el-button>
            <div class="event-tags">
                <el-tag
                    v-for="event in Object.keys(curEvents)"
                    :key="event"
                    closable
                    size="large"
                    @close="removeEvent(event)"
                >
                    {{ event }}
                </el-tag>
                <div v-if="Object.keys(curEvents).length === 0" class="no-event">
                    暂无事件
                </div>
            </div>
        </div>

        <!-- 选择事件 -->
        <Modal v-model="isShowEvent">
            <div class="event-modal-content">
                <h3 class="modal-title">
                    添加事件
                </h3>
                <el-tabs v-model="eventActiveName" type="border-card">
                    <el-tab-pane
                        v-for="item in eventList"
                        :key="item.key"
                        :label="item.label"
                        :name="item.key"
                    >
                        <div class="tab-content">
                            <el-input
                                v-if="item.key == 'redirect'"
                                v-model="item.param"
                                type="textarea"
                                :rows="4"
                                placeholder="请输入完整的 URL"
                                @keydown.stop
                            />
                            <el-input
                                v-if="item.key == 'alert'"
                                v-model="item.param"
                                type="textarea"
                                :rows="4"
                                placeholder="请输入要 alert 的内容"
                                @keydown.stop
                            />
                            <div class="btn-container">
                                <el-button type="primary" @click="addEvent(item.key, item.param)">
                                    确定
                                </el-button>
                            </div>
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </div>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import Modal from '@/components/Modal.vue'
import { eventList } from '@/utils/events'

const store = useStore()
const { curComponent } = storeToRefs(store)
const curEvents = computed(() => curComponent.value?.events ?? {})

const isShowEvent = ref(false)
const eventActiveName = ref('redirect')

function addEvent(event: string, param: string): void {
    isShowEvent.value = false
    store.addEvent({ event, param })
}

function removeEvent(event: string): void {
    store.removeEvent(event)
}
</script>

<style lang="scss" scoped>
.event-list {
    padding-top: 10px;

    .div-events {
        text-align: center;
        padding: 0 20px;

        .add-btn {
            width: 100%;
            margin-bottom: 20px;
        }

        .event-tags {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .el-tag {
            width: 100%;
            justify-content: space-between;
        }
        
        .no-event {
            color: #909399;
            font-size: 12px;
        }
    }
}

.event-modal-content {
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
            padding: 20px;
        }
    }

    .tab-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        
        .btn-container {
            margin-top: 20px;
            text-align: right;
        }
    }
}
</style>

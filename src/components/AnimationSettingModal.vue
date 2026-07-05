<template>
    <el-dialog
        v-model="centerDialogVisible"
        :title="`${config.label} 动画配置`"
        width="30%"
        center
        @close="handleCloseModal"
    >
        <div class="time">
            动画时长：<el-input-number
                v-model="config.animationTime"
                controls-position="right"
                :min="0.1"
                :precision="2"
                :step="0.01"
            />
        </div>
        <div class="loop">
            是否循环：<el-switch
                v-model="config.isLoop"
                active-text="是"
                inactive-text="否"
                :disabled="isDisabled"
            />
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="handleCloseModal">取 消</el-button>
                <el-button type="primary" @click="handleSaveSetting">确 定</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import eventBus from '@/utils/eventBus'
import type { Animation } from '@/types'

interface AnimationConfig {
  label: string
  animationTime: number
  isLoop: boolean
  value: string
}

const props = defineProps({
    curIndex: {
        type: Number,
        default: 0,
    },
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useStore()
const { curComponent } = storeToRefs(store)

const centerDialogVisible = ref(true)
const config = reactive<AnimationConfig>({
    label: '',
    animationTime: 1,
    isLoop: false,
    value: '',
})

const isDisabled = computed((): boolean => {
    return (curComponent.value?.animations.length ?? 0) > 1
})

// Initialize config
const animation: Animation | undefined = curComponent.value?.animations?.[props.curIndex]
if (animation) {
    config.label = animation.label ?? ''
    config.animationTime = animation.duration / 1000
    config.isLoop = animation.infinite
    config.value = animation.type
}

function handleCloseModal(): void {
    emit('close')
}

function handleSaveSetting(): void {
    store.alterAnimation({
        index: props.curIndex,
        data: {
            duration: config.animationTime * 1000,
            infinite: config.isLoop,
        },
    })
    eventBus.emit('stopAnimation')
    handleCloseModal()
}
</script>

<style scoped lang="scss">
.loop {
    margin-top: 10px;
}
</style>

<template>
    <el-switch
        :model-value="modelValue"
        size="small"
        active-text="开启"
        inactive-text="关闭"
        @update:model-value="handleUpdate"
    />
</template>

<script setup lang="ts">
import type { PropConfig } from '../registry'

defineProps<{
  modelValue: boolean
  config?: PropConfig
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function handleUpdate(value: string | number | boolean): void {
    emit('update:modelValue', Boolean(value))
}
</script>

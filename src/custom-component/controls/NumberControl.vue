<template>
    <el-input-number
        :model-value="modelValue"
        :min="config?.min ?? 0"
        :max="config?.max ?? Infinity"
        :step="config?.step ?? 1"
        size="small"
        controls-position="right"
        style="width: 100%"
        @update:model-value="handleUpdate"
    />
</template>

<script setup lang="ts">
import type { PropConfig } from '../registry'

defineProps<{
  modelValue: number
  config?: PropConfig
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function handleUpdate(value: number | undefined): void {
    emit('update:modelValue', value ?? 0)
}
</script>

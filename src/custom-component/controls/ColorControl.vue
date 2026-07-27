<template>
    <el-color-picker
        :model-value="modelValue"
        show-alpha
        size="small"
        style="width: 100%"
        @update:model-value="handleUpdate"
    />
</template>

<script setup lang="ts">
import type { PropConfig } from '../registry'

defineProps<{
  modelValue: string
  config?: PropConfig
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleUpdate(value: string | null): void {
    emit('update:modelValue', value || '')
}
</script>

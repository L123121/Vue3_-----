<template>
    <el-input-number
        :model-value="modelValue"
        :min="config?.min ?? 0"
        :max="config?.max ?? Infinity"
        :step="config?.step ?? 1"
        size="small"
        controls-position="right"
        style="width: 100%"
        @update:model-value="$emit('update:modelValue', $event)"
    />
</template>

<script setup lang="ts">
import type { PropConfig } from '../registry'

defineProps<{
  modelValue: number
  config?: PropConfig
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
    <el-color-picker
        :model-value="modelValue"
        show-alpha
        size="small"
        style="width: 100%"
        @update:model-value="$emit('update:modelValue', $event)"
    />
</template>

<script setup lang="ts">
import type { PropConfig } from '../registry'

defineProps<{
  modelValue: string
  config?: PropConfig
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

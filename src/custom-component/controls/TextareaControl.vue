<template>
    <el-input
        :model-value="modelValue"
        type="textarea"
        :rows="config?.rows ?? 3"
        size="small"
        :placeholder="config?.placeholder ?? ''"
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

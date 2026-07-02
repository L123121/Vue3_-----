<template>
    <el-switch
        :model-value="modelValue"
        size="small"
        active-text="开启"
        inactive-text="关闭"
        @update:model-value="$emit('update:modelValue', $event)"
    />
</template>

<script setup lang="ts">
import type { PropConfig } from '../registry'

defineProps<{
  modelValue: boolean
  config?: PropConfig
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
    <el-select
        :model-value="modelValue"
        size="small"
        style="width: 100%"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <el-option
            v-for="opt in config?.options ?? []"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
        />
    </el-select>
</template>

<script setup lang="ts">
import type { PropConfig } from '../registry'

defineProps<{
  modelValue: string | number
  config?: PropConfig
}>()

defineEmits<{
  'update:modelValue': [value: string | number]
}>()
</script>

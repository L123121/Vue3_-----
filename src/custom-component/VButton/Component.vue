<template>
    <button ref="vButton" class="v-button">
        {{ propValue }}
    </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useOnEvent } from '../common/useOnEvent'
import type { ComponentData, LinkageConfig } from '@/types'

interface Props {
  propValue: string
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()

const vButton = ref<HTMLElement | null>(null)
useOnEvent(props, vButton)
</script>

<style lang="scss" scoped>
.v-button {
  display: inline-block;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  background: var(--main-bg-color);
  border: 1px solid #dcdfe6;
  color: var(--text-color);
  appearance: none;
  text-align: center;
  box-sizing: border-box;
  outline: 0;
  margin: 0;
  transition: 0.1s;
  font-weight: 500;
  width: 100%;
  height: 100%;
  font-size: 14px;

  &:active {
    color: #3a8ee6;
    border-color: #3a8ee6;
    outline: 0;
  }

  &:hover {
    background-color: #ecf5ff;
    color: #3a8ee6;
  }
}
</style>

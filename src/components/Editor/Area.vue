<template>
    <div
        :style="{
            left: start.x + 'px',
            top: start.y + 'px',
            width: width + 'px',
            height: height + 'px',
        }"
        class="area"
    />
</template>

<script setup lang="ts">
interface Props {
  start: { x: number; y: number }
  width: number
  height: number
}

defineProps<Props>()
</script>

<style lang="scss" scoped>
.area {
  border: 1px solid #70c0ff;
  position: absolute;
}
</style>

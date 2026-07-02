<template>
    <svg
        class="grid"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <pattern
                id="smallGrid"
                width="7.2"
                height="7.2"
                patternUnits="userSpaceOnUse"
            >
                <path
                    d="M 7.2 0 L 0 0 0 7.2"
                    fill="none"
                    :stroke="isDarkMode ? 'rgba(207, 207, 207, 0.5)' : 'rgba(207, 207, 207, 0.3)'"
                    stroke-width="1"
                />
            </pattern>
            <pattern
                id="grid"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
            >
                <rect width="36" height="36" fill="url(#smallGrid)" />
                <path
                    d="M 36 0 L 0 0 0 36"
                    fill="none"
                    :stroke="isDarkMode ? 'rgba(186, 186, 186)' : 'rgba(186, 186, 186, 0.5)'"
                    stroke-width="1"
                />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
</template>

<script setup lang="ts">
interface Props {
  isDarkMode: boolean
}

defineProps<Props>()
</script>

<style lang="scss" scoped>
.grid {
  position: absolute;
  top: 0;
  left: 0;
}
</style>

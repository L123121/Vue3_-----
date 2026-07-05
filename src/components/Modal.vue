<template>
    <div v-if="modelValue" class="modal-bg" @click="hide">
        <div class="fadeInLeft animated modal" @click="stopPropagation">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function hide(): void {
    emit('update:modelValue', false)
}

function stopPropagation(e: Event): void {
    e.stopPropagation()
}
</script>

<style lang="scss" scoped>
.modal-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, .5);
    z-index: 1001;

    .modal {
        width: 400px;
        background: var(--main-bg-color);
        height: 100%;
    }
}
</style>

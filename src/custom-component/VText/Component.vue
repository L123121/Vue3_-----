<!-- eslint-disable vue/no-v-html -->
<template>
    <div
        v-if="editMode === 'edit'"
        class="v-text"
        @keydown="handleKeydown"
        @keyup="handleKeyup"
    >
        <!-- tabindex >= 0 使得双击时聚焦该元素 -->
        <div
            ref="textRef"
            :contenteditable="canEdit"
            :class="{ 'can-edit': canEdit }"
            tabindex="0"
            :style="{ verticalAlign: element.style.verticalAlign, padding: element.style.padding + 'px' }"
            @dblclick="setEdit"
            @paste="clearStyle"
            @mousedown="handleMousedown"
            @blur="handleBlur"
            @input="handleInput"
            v-html="sanitizeHtml(String(element.propValue))"
        />
    </div>
    <div v-else class="v-text preview">
        <div
            :style="{ verticalAlign: element.style.verticalAlign, padding: element.style.padding + 'px' }"
            v-html="sanitizeHtml(String(element.propValue))"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import request from '@/utils/request'
import eventBus from '@/utils/eventBus'
import { useOnEvent } from '../common/useOnEvent'
import { sanitizeHtml } from '@/utils/sanitize'
import type { ComponentData, RequestConfig, LinkageConfig } from '@/types'

interface Props {
  propValue: string
  request?: RequestConfig
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'input', element: ComponentData, value: string): void
}>()

const store = useStore()
const { editMode, curComponent } = storeToRefs(store)

const textRef = ref<HTMLElement | null>(null)
const canEdit = ref(false)
const isCtrlDown = ref(false)
let cancelRequest: (() => void) | null = null

// 需要阻止冒泡的快捷键（与 shortcutKey.ts 中的映射一致）
const shortcutKeys = new Set(['b', 'c', 'd', 'e', 'g', 'l', 'p', 's', 'u', 'v', 'x', 'y', 'z'])

useOnEvent(props, textRef)

onMounted(() => {
    // 注意，修改时接口属性时不会发数据，在预览时才会发
    // 如果要在修改接口属性的同时发请求，需要 watch 一下 request 的属性
    if (props.request) {
    // 第二个参数是要修改数据的父对象，第三个参数是修改数据的 key，第四个数据修改数据的类型
        cancelRequest = request(props.request, props.element as unknown as Record<string, unknown>, 'propValue', 'string')
    }

    eventBus.on('componentClick', onComponentClick)
})

onBeforeUnmount(() => {
    // 组件销毁时取消请求
    if (props.request && cancelRequest) {
        cancelRequest()
    }
    eventBus.off('componentClick', onComponentClick)
})

function onComponentClick(): void {
    // 如果当前点击的组件 id 和 VText 不是同一个，需要设为不允许编辑
    if (curComponent.value && curComponent.value.id !== props.element.id) {
        canEdit.value = false
    }
}

function handleInput(e: Event): void {
    const target = e.target as HTMLElement
    emit('input', props.element, sanitizeHtml(target.innerHTML))
}

function handleKeydown(e: KeyboardEvent): void {
    // 阻止冒泡，防止触发复制、粘贴组件操作
    if (canEdit.value) {
        e.stopPropagation()
    }
    const key = e.key.toLowerCase()
    if (key === 'control' || key === 'meta') {
        isCtrlDown.value = true
    } else if (isCtrlDown.value && canEdit.value && shortcutKeys.has(key)) {
        e.stopPropagation()
    } else if (key === 'delete' || key === 'backspace') {
        e.stopPropagation()
    }
}

function handleKeyup(e: KeyboardEvent): void {
    // 阻止冒泡，防止触发复制、粘贴组件操作
    if (canEdit.value) {
        e.stopPropagation()
    }
    const key = e.key.toLowerCase()
    if (key === 'control' || key === 'meta') {
        isCtrlDown.value = false
    }
}

function handleMousedown(e: MouseEvent): void {
    if (canEdit.value) {
        e.stopPropagation()
    }
}

function clearStyle(e: ClipboardEvent): void {
    e.preventDefault()
    const clp = e.clipboardData
    const textData = clp?.getData('text/plain') || ''
    if (textData !== '') {
        document.execCommand('insertText', false, textData)
    }

    const target = e.target as HTMLElement
    emit('input', props.element, sanitizeHtml(target.innerHTML))
}

function handleBlur(e: Event): void {
    const target = e.target as HTMLElement
    const html = sanitizeHtml(target.innerHTML)
    if (html !== '') {
        // eslint-disable-next-line vue/no-mutating-props -- 画布元素是 store 引用，文本组件负责就地编辑
        props.element.propValue = html
    } else {
        // eslint-disable-next-line vue/no-mutating-props -- 画布元素是 store 引用，文本组件负责就地编辑
        props.element.propValue = ''
        nextTick(() => {
            // eslint-disable-next-line vue/no-mutating-props -- 保留空文本占位，避免 contenteditable 塌陷
            props.element.propValue = '&nbsp;'
        })
    }
    canEdit.value = false
}

function setEdit(): void {
    if (props.element.isLock) return

    canEdit.value = true
    // 全选
    if (textRef.value) {
        selectText(textRef.value)
    }
}

function selectText(element: HTMLElement): void {
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(element)
    selection?.removeAllRanges()
    selection?.addRange(range)
}
</script>

<style lang="scss" scoped>
.v-text {
  width: 100%;
  height: 100%;
  display: table;

  div {
    display: table-cell;
    width: 100%;
    height: 100%;
    outline: none;
    word-break: break-all;
    padding: 4px;
  }

  .can-edit {
    cursor: text;
    height: 100%;
  }
}

.preview {
  user-select: none;
}
</style>

<template>
    <div class="ace">
        <div class="header">
            <el-button
                class="btn"
                icon="Search"
                @click="openSearchBox"
            >
                查找
            </el-button>
            <el-button
                class="btn"
                icon="Close"
                @click="closeEditor"
            >
                关闭
            </el-button>
        </div>
        <div class="ace-editor">
            <div ref="aceRef" class="editor" />
        </div>
        <div class="footer">
            <el-button
                type="primary"
                @click="setCode"
            >
                重置代码
            </el-button>
            <el-button
                type="success"
                @click="getCode"
            >
                保存提交
            </el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import ace from 'ace-builds'
import 'ace-builds/src-min-noconflict/theme-one_dark'
import 'ace-builds/src-min-noconflict/ext-searchbox'
import 'ace-builds/src-min-noconflict/mode-json5'
import 'ace-builds/src-min-noconflict/ext-language_tools'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'

const emit = defineEmits<{
  (e: 'closeEditor'): void
}>()

const store = useStore()
const { canvasStyleData, curComponent } = storeToRefs(store)

const aceRef = ref<HTMLElement | null>(null)
let editor: ace.Ace.Editor | null = null

onMounted(() => {
    ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.14/')
    if (aceRef.value) {
        editor = ace.edit(aceRef.value, {
            maxLines: 40,
            minLines: 40,
            fontSize: 14,
            theme: 'ace/theme/one_dark',
            mode: 'ace/mode/json5',
            tabSize: 4,
            readOnly: false,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
        })
        setCode()
    }
})

watch([curComponent, canvasStyleData], () => {
    setCode()
})

function setCode(): void {
    if (!editor) return
    const obj = curComponent.value || canvasStyleData.value
    editor.setValue(JSON.stringify(obj, null, 4))
}

function getCode(): void {
    if (!editor) return
    const str = editor.getValue()
    try {
        const data = JSON.parse(str)
        if (!curComponent.value) {
            store.setCanvasStyle(data)
        } else {
            store.updateComponentProps(data)
        }
        ElMessage.success('保存成功')
    } catch (e) {
        ElMessage.error('JSON 格式错误')
        console.error(e)
    }
}

function openSearchBox(): void {
    editor?.execCommand('find')
}

function closeEditor(): void {
    emit('closeEditor')
}
</script>

<style lang="scss" scoped>
.ace {
    position: absolute;
    height: calc(100% - 80px);
    width: 550px;
    top: 63px;
    background-color: #fff;
    border: 1px solid #ddd;
    z-index: 100;
    padding: 10px;

    .header,
    .footer {
        display: flex;
        justify-content: flex-end;
    }

    .ace-editor {
        height: calc(100% - 80px);
        overflow: auto;
    }
}

.editor {
    margin: 10px 0;
}
</style>

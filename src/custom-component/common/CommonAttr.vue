<template>
    <div class="v-common-attr" @mousedown="setInitial(curComponent.style)">
        <el-collapse v-model="activeName" accordion @change="onChange">
            <el-collapse-item title="通用样式" name="style">
                <el-form>
                    <el-form-item v-for="({ key, label }, index) in styleKeys" :key="index" :label="label">
                        <el-color-picker v-if="isIncludesColor(key)" v-model="curComponent.style[key]" show-alpha />
                        <el-select v-else-if="selectKey.includes(key)" v-model="curComponent.style[key]">
                            <el-option
                                v-for="item in optionMap[key]"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value"
                            />
                        </el-select>
                        <el-input 
                            v-else-if="key=='fontSize' && curComponent.component=='VText'"
                            v-model.number="curComponent.style[key]"
                            type="number"
                            @input="setFontSize(curComponent)"
                        />
                        <el-input 
                            v-else
                            v-model.number="curComponent.style[key]"
                            type="number"
                        />
                    </el-form-item>
                </el-form>
            </el-collapse-item>
            <Request v-if="curComponent.request" />
            <Linkage v-if="curComponent.linkage" />
        </el-collapse>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { styleData, selectKey, optionMap } from '@/utils/attr'
import Request from './Request.vue'
import Linkage from './Linkage.vue'
import { resizeComponent } from '@/composables/useCommandActions'

const store = useStore()
const { curComponent } = storeToRefs(store)

const activeName = ref('')
let initialStyle = {}

const styleKeys = computed(() => {
    if (curComponent.value) {
        const curComponentStyleKeys = Object.keys(curComponent.value.style)
        return styleData.filter(item => curComponentStyleKeys.includes(item.key))
    }
    return []
})

if (curComponent.value) {
    activeName.value = curComponent.value.collapseName
}

watch(curComponent, () => {
    activeName.value = curComponent.value.collapseName
})

function onChange() {
    curComponent.value.collapseName = activeName.value
}

function isIncludesColor(str) {
    return str.toLowerCase().includes('color')
}

function setInitial(style) {
    initialStyle = JSON.parse(JSON.stringify(style))
}

function setFontSize() {
    const proportion = curComponent.value.style.fontSize / initialStyle.fontSize
    const updatedStyle = {
        width: (proportion * initialStyle.width).toFixed(4),
        height: (proportion * initialStyle.height).toFixed(4),
        padding: (proportion * initialStyle.padding).toFixed(4),
    }
    const newStyle = { ...curComponent.value.style, ...updatedStyle }
    curComponent.value.style = newStyle
    store.setShapeStyle(newStyle)
    // 使用样式变更命令
    resizeComponent(curComponent.value.id, initialStyle, newStyle)
}
</script>

<style lang="scss">
.v-common-attr {
    .el-input-group__prepend {
        padding: 0 10px;
    }
    
    .el-collapse {
        border: none;
        
        .el-collapse-item__header {
            height: 40px;
            line-height: 40px;
            background-color: var(--secondary-bg-color);
            padding-left: 10px;
            border-bottom: 1px solid var(--border-color);
            font-weight: 500;
        }
        
        .el-collapse-item__content {
            padding: 10px;
            background-color: var(--main-bg-color);
        }
    }
}
</style>

<template>
    <el-collapse-item title="组件联动（预览生效）" name="linkage" class="linkage-container">
        <el-form>
            <div v-for="(item, index) in linkage.data" :key="index" class="linkage-component">
                <div class="div-guanbi" @click="deleteLinkageData(index)">
                    <el-icon><Close /></el-icon>
                </div>
                <el-select v-model="item.id" placeholder="请选择联动组件" class="testtest">
                    <el-option
                        v-for="(component, i) in componentData"
                        :key="component.id"
                        :value="component.id"
                        :label="component.label"
                    >
                        <div @mouseenter="onEnter(i)" @mouseout="onOut(i)">
                            {{ component.label }}
                        </div>
                    </el-option>
                </el-select>
                <el-select v-model="item.event" placeholder="请选择监听事件">
                    <el-option
                        v-for="e in eventOptions"
                        :key="e.value"
                        :value="e.value"
                        :label="e.label"
                    />
                </el-select>
                <p>事件触发时，当前组件要修改的属性</p>
                <div v-for="(e, i) in item.style" :key="i" class="attr-container">
                    <el-select v-model="e.key" @change="e.value = ''">
                        <el-option
                            v-for="attr in Object.keys(curComponent.style)"
                            :key="attr"
                            :value="attr"
                            :label="styleMap[attr]"
                        />
                    </el-select>
                    <el-color-picker v-if="isIncludesColor(e.key)" v-model="e.value" show-alpha />
                    <el-select v-else-if="selectKey.includes(e.key)" v-model="e.value">
                        <el-option
                            v-for="option in optionMap[e.key]"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        />
                    </el-select>
                    <el-input
                        v-else
                        v-model.number="e.value"
                        type="number"
                        placeholder="请输入"
                    />
                    <el-icon class="icon-shanchu" @click="deleteData(item.style, i)">
                        <Delete />
                    </el-icon>
                </div>
                <el-button @click="addAttr(item.style)">
                    添加属性
                </el-button>
            </div>
            <el-button style="margin-bottom: 10px;" @click="addComponent">
                添加组件
            </el-button>
            <p>过渡时间（秒）</p>
            <el-input v-model="linkage.duration" class="input-duration" placeholder="请输入" />
        </el-form>
    </el-collapse-item>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { styleMap, optionMap, selectKey } from '@/utils/attr'
import { Close, Delete } from '@element-plus/icons-vue'

const store = useStore()
const { curComponent, componentData } = storeToRefs(store)

const linkage = computed(() => curComponent.value.linkage)

const eventOptions = [
    { label: '点击', value: 'v-click' },
    { label: '悬浮', value: 'v-hover' },
]

const oldOpacity = ref('')
const oldBackgroundColor = ref('')

function onEnter(index) {
    oldOpacity.value = componentData.value[index].style.opacity
    oldBackgroundColor.value = componentData.value[index].style.backgroundColor
    componentData.value[index].style.opacity = '.3'
    componentData.value[index].style.backgroundColor = '#409EFF'
}

function onOut(index) {
    componentData.value[index].style.opacity = oldOpacity.value
    componentData.value[index].style.backgroundColor = oldBackgroundColor.value
}

function isIncludesColor(str) {
    return str.toLowerCase().includes('color')
}

function addAttr(style) {
    style.push({ key: '', value: '' })
}

function addComponent() {
    linkage.value.data.push({
        id: '',
        event: '',
        style: [{ key: '', value: '' }],
    })
}

function deleteData(style, index) {
    style.splice(index, 1)
}

function deleteLinkageData(index) {
    linkage.value.data.splice(index, 1)
}
</script>

<style lang="scss" scoped>
.linkage-container {
    .linkage-component {
        margin: 10px 0;
        border: 1px solid #ddd;
        padding: 10px;
        position: relative;
        padding-top: 24px;

        .div-guanbi {
            cursor: pointer;
            position: absolute;
            right: 10px;
            top: 3px;
            color: #888;
            border: 1px solid #ddd;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;

            .iconfont {
                font-size: 12px;
            }
        }
    }

    .el-select {
        margin-bottom: 10px;
    }

    .attr-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 10px 0;

        .el-select {
            margin-bottom: 0;
        }

        & > div {
            width: 97px;
        }

        .icon-shanchu {
            cursor: pointer;
        }
    }
}
</style>

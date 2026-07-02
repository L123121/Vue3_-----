<template>
    <div class="attr">
        <CommonAttr />
        <el-form>
            <el-form-item label="标题">
                <el-switch
                    v-model="option.title.show"
                    active-text="显示标题"
                />
                <el-input
                    v-model="option.title.text"
                    placeholder="请输入内容"
                />
            </el-form-item>
            <el-form-item label="工具提示">
                <el-switch
                    v-model="option.tooltip.show"
                    active-text="显示提示"
                />
            </el-form-item>
            <el-form-item label="图例">
                <el-switch
                    v-model="option.legend.show"
                    active-text="显示图例"
                />
            </el-form-item>
            <el-form-item label="横坐标">
                <el-switch
                    v-model="option.xAxis.show"
                    active-text="显示横坐标"
                />
            </el-form-item>
            <el-form-item>
                <el-dropdown>
                    <span class="el-dropdown-link">
                        更换图表类型
                        <el-icon class="el-icon--right">
                            <ArrowDown />
                        </el-icon>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <span v-for="(chart, index) in charts" :key="index" @click="selectchart(chart.title)">
                                <el-dropdown-item>{{ chart.name }}</el-dropdown-item>
                            </span>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </el-form-item>
            <el-form-item label="静态数据源">
                <el-button @click="openStaticWinbox">
                    修改数据
                </el-button>
            </el-form-item>
        </el-form>

        <el-dialog
            v-model="dialogVisible"
            title="数据修改"
            width="75%"
        >
            <div ref="aceRef" class="ace" />
            <template #footer>
                <span class="dialog-footer">
                    <el-button type="primary" @click="updatedata">更新数据</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import ace from 'ace-builds'
import 'ace-builds/src-min-noconflict/theme-chrome'
import 'ace-builds/src-min-noconflict/mode-json5'
import CommonAttr from '@/custom-component/common/CommonAttr.vue'

const store = useStore()
const { curComponent } = storeToRefs(store)

const option = computed(() => curComponent.value.propValue.option)
const dialogVisible = ref(false)
const aceRef = ref(null)
let editor = null

const charts = [
    {
        title: 'bar',
        name: '柱状图',
    },
    {
        title: 'scatter',
        name: '散点图',
    },
    {
        title: 'line',
        name: '折线图',
    },
]

function openStaticWinbox() {
    dialogVisible.value = true
    nextTick(() => {
        ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.14/')
        editor = ace.edit(aceRef.value, {
            maxLines: 28,
            minLines: 28,
            fontSize: 14,
            theme: 'ace/theme/chrome',
            mode: 'ace/mode/json5',
            tabSize: 4,
            readOnly: false,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
        })
        // 初始化图表数据在editor中
        const data = JSON.stringify(curComponent.value.propValue.option.series.data)
        const xAxis = JSON.stringify(curComponent.value.propValue.option.xAxis.data)
        editor.setValue(data + '\n' + xAxis)
    })
}

function findstring(str, ch1, ch2) {
    return str.substr(str.indexOf(ch1), str.indexOf(ch2) + 1)
}

function updatedata() {
    const str = editor.getValue()
    const Arrdata = findstring(str, '[', ']')
    const ArrXAxis = findstring(str.substr(str.indexOf(']') + 1), '[', ']')
    curComponent.value.propValue.option.series.data = JSON.parse(Arrdata)
    curComponent.value.propValue.option.xAxis.data = JSON.parse(ArrXAxis)
    ElMessage.success('更新成功')
    dialogVisible.value = false
}

function selectchart(chart) {
    curComponent.value.propValue.option.series.type = chart
}
</script>

<style>
.ace {
    margin: 5px;
    margin-top: -20px;
    height: 600px;
    width: 100%;
}

.attr {
    margin: 13px;
}
</style>

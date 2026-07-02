<template>
    <el-collapse-item title="数据来源（预览生效）" name="request" class="request-container">
        <el-form>
            <el-form-item label="请求地址">
                <el-input v-model.trim="request.url" @blur="validateURL">
                    <template #prepend>
                        HTTPS://
                    </template>
                </el-input>
            </el-form-item>
            <el-form-item label="请求方法">
                <el-select v-model="request.method">
                    <el-option
                        v-for="item in methodOptions"
                        :key="item"
                        :label="item"
                        :value="item"
                    />
                </el-select>
            </el-form-item>
            <el-form-item label="请求参数">
                <el-select v-model="request.paramType" placeholder="参数类型" @change="onChnage">
                    <el-option
                        v-for="item in dataOptions"
                        :key="item"
                        :label="item"
                        :value="item"
                    />
                </el-select>
                <div v-if="request.paramType === 'array'" class="param-container">
                    <p>数据项</p>
                    <div v-for="(item, index) in request.data" :key="index" class="div-delete">
                        <el-input
                            v-model="request.data[index]"
                            placeholder="请输入参数值"
                        />
                        <el-icon class="icon-shanchu" @click="deleteData(index)">
                            <Delete />
                        </el-icon>
                    </div>

                    <el-button @click="addArrayData">
                        添加
                    </el-button>
                </div>
                <div v-else-if="request.paramType === 'string' || request.paramType === 'object'" class="param-container">
                    <p>数据项</p>
                    <div v-for="(item, index) in request.data" :key="index" class="param-object-container">
                        <el-input v-model="item[0]" placeholder="参数名" />
                        <el-input v-model="item[1]" placeholder="参数值" />
                        <el-icon class="icon-shanchu" @click="deleteData(index)">
                            <Delete />
                        </el-icon>
                    </div>
                    <el-button @click="addData">
                        添加
                    </el-button>
                </div>
            </el-form-item>
            <el-form-item label="定时触发">
                <el-switch v-model="request.series" />
                <template v-if="request.series">
                    <p>触发间隔（毫秒）</p>
                    <el-input v-model="request.time" type="number" />
                    <p>触发次数（0 为无限）</p>
                    <el-input v-model="request.requestCount" type="number" />
                </template>
            </el-form-item>
        </el-form>
    </el-collapse-item>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { urlRE, getURL } from '@/utils/request'

const store = useStore()
const { curComponent } = storeToRefs(store)

const request = computed(() => curComponent.value.request)

const methodOptions = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
]

const dataOptions = [
    'object',
    'array',
    'string',
]

function addArrayData() {
    request.value.data.push('')
}

function addData() {
    request.value.data.push(['', ''])
}

function deleteData(index) {
    request.value.data.splice(index, 1)
}

function onChnage() {
    if (request.value.paramType === 'array') {
        request.value.data = ['']
    } else {
        request.value.data = [['', '']]
    }
}

function validateURL() {
    const url = request.value.url
    if (url && /^\d+$/.test(url) || !urlRE.test(getURL(url))) {
        ElMessage.error('请输入正确的 URL')
    }
}
</script>

<style lang="scss" scoped>
.request-container {
    .param-container {
        margin-top: 10px;

        .el-button {
            margin-top: 10px;
        }

        .param-object-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;

            .el-input {
                width: 98px;
            }

            .el-button {
                margin: 0;
                margin-left: 8px;
            }
        }

        .div-delete {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;

            .el-button {
                margin: 0;
                margin-left: 8px;
            }
        }
    }

    .icon-shanchu {
        cursor: pointer;
        margin-left: 10px;
    }
}
</style>

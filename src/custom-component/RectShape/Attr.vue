<template>
    <div class="attr-list">
        <CommonAttr />
        <el-form>
            <el-form-item label="内容">
                <el-input v-model="curComponent.propValue" type="textarea" :rows="3" />
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup>
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import CommonAttr from '@/custom-component/common/CommonAttr.vue'

const store = useStore()
const { curComponent } = storeToRefs(store)
</script>

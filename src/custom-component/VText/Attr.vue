<template>
    <div class="attr-list">
        <CommonAttr />
        <el-form>
            <el-form-item v-if="curComponent" label="内容">
                <el-input v-model="curComponent.propValue" type="textarea" :rows="3" />
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import CommonAttr from '@/custom-component/common/CommonAttr.vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
const store = useStore()
const { curComponent } = storeToRefs(store)
</script>

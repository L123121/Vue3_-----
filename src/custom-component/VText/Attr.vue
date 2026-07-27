<template>
    <div class="attr-list">
        <CommonAttr />
        <el-form>
            <el-form-item v-if="curComponent" label="内容">
                <el-input
                    :model-value="typeof curComponent.propValue === 'string' ? curComponent.propValue : ''"
                    type="textarea"
                    :rows="3"
                    @update:model-value="updateContent"
                />
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

function updateContent(value: string): void {
    if (!curComponent.value) return
    curComponent.value.propValue = value
    store.markDataDirty()
}
</script>

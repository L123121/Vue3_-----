<template>
    <div class="prop-panel-renderer">
        <!-- 1. 通用样式面板（所有组件共享） -->
        <CommonAttr />

        <!-- 2. 属性配置区（由 propConfigs 元数据驱动） -->
        <div v-if="propConfigs.length" class="prop-config-section">
            <el-divider content-position="left">
                属性配置
            </el-divider>
            <el-form label-position="top" size="small">
                <el-form-item
                    v-for="cfg in propConfigs"
                    :key="cfg.key"
                    :label="cfg.label"
                >
                    <component
                        :is="getControl(cfg.type)"
                        :model-value="getValue(cfg.key)"
                        :config="cfg"
                        style="width: 100%"
                        @update:model-value="setValue(cfg.key, $event)"
                    />
                </el-form-item>
            </el-form>
        </div>

        <!-- 3. 如果组件没有 propConfigs 但有 Attr 组件，回退到传统的 Attr.vue -->
        <div v-if="!propConfigs.length && hasAttrComponent">
            <component :is="attrComponent" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import CommonAttr from './common/CommonAttr.vue'
import { getComponentMeta, getAttrComponent } from './registry'
import { getControl } from './controls'
import type { PropConfig } from './registry'

const store = useStore()
const { curComponent } = storeToRefs(store)

/**
 * 获取当前组件的 propConfigs 元数据
 */
const propConfigs = computed<PropConfig[]>(() => {
    if (!curComponent.value) return []
    const meta = getComponentMeta(curComponent.value.component)
    return meta?.propConfigs ?? []
})

/**
 * 是否有传统的 Attr 组件
 */
const hasAttrComponent = computed(() => {
    if (!curComponent.value) return false
    return !!getAttrComponent(curComponent.value.component)
})

/**
 * 获取传统 Attr 组件
 */
const attrComponent = computed(() => {
    if (!curComponent.value) return null
    return getAttrComponent(curComponent.value.component) ?? null
})

// ==================== 嵌套属性路径读写 ====================

/**
 * 根据路径读取嵌套属性值
 * @example getValue('style.color') → curComponent.style.color
 * @example getValue('propValue.flip.horizontal') → curComponent.propValue.flip.horizontal
 */
function getValue(path: string): unknown {
    if (!curComponent.value) return undefined
    return path.split('.').reduce((obj: unknown, key: string) => {
        if (obj && typeof obj === 'object') {
            return (obj as Record<string, unknown>)[key]
        }
        return undefined
    }, curComponent.value as unknown as Record<string, unknown>)
}

/**
 * 根据路径设置嵌套属性值
 */
function setValue(path: string, value: unknown): void {
    if (!curComponent.value) return
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((obj: unknown, key: string) => {
        if (obj && typeof obj === 'object') {
            return (obj as Record<string, unknown>)[key]
        }
        return undefined
    }, curComponent.value as unknown as Record<string, unknown>)

    if (target && typeof target === 'object') {
        (target as Record<string, unknown>)[lastKey] = value
        // 触发数据变更标记
        store.markDataDirty()
    }
}
</script>

<style lang="scss" scoped>
.prop-panel-renderer {
  .prop-config-section {
    padding: 0 10px;

    .el-divider {
      margin-top: 8px;
      margin-bottom: 12px;
    }

    .el-form-item {
      margin-bottom: 12px;
    }
  }
}
</style>

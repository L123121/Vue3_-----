<template>
    <table ref="tableRef" class="v-table">
        <tbody>
            <tr
                v-for="(item, index) in propValue.data"
                :key="index"
                :class="{
                    stripe: propValue.stripe && index % 2,
                    bold: propValue.thBold && index === 0,
                }"
            >
                <td v-for="(e, i) in item" :key="i">
                    {{ e }}
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import request from '@/utils/request'
import { useOnEvent } from '../common/useOnEvent'
import type { ComponentData, TablePropValue, RequestConfig, LinkageConfig } from '@/types'

interface Props {
  propValue: TablePropValue
  request?: RequestConfig
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()
const tableRef = ref<HTMLElement | null>(null)

let cancelRequest: (() => void) | null = null

useOnEvent(props, tableRef)

onMounted(() => {
    if (props.request) {
        cancelRequest = request(
            props.request,
      props.propValue as unknown as Record<string, unknown>,
      'data',
        )
    }
})

onBeforeUnmount(() => {
    if (props.request && cancelRequest) {
        cancelRequest()
    }
})
</script>

<style lang="scss" scoped>
.v-table {
  border-collapse: collapse;
  table-layout: fixed;
  word-break: break-all;
  word-wrap: break-word;

  td {
    border: 1px solid #ebeef5;
    height: 40px;
    width: 60px;
    padding: 10px;
  }

  .bold {
    font-weight: bold;
  }

  .stripe {
    background-color: #fafafa;
  }
}
</style>

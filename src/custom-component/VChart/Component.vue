<template>
    <v-chart
        ref="chartRef"
        class="chart"
        :option="propValue.option"
        autoresize
    />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart, BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useOnEvent } from '../common/useOnEvent'
import type { ComponentData, ChartPropValue, LinkageConfig } from '@/types'

use([
    CanvasRenderer,
    ScatterChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    BarChart,
    LineChart,
])

interface Props {
  propValue: ChartPropValue
  element: ComponentData
  linkage: LinkageConfig
}

const props = defineProps<Props>()
const chartRef = ref<HTMLElement | null>(null)

useOnEvent(props, chartRef)
</script>

<style scoped>
.chart {
  height: 100%;
}
</style>

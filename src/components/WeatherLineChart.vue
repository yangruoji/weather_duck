<template>
  <div class="weather-line-chart" :style="{ height: containerHeight }" ref="chartContainer"></div>
  
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { ECharts as TECharts, EChartsOption, LineSeriesOption } from 'echarts'
import type { WeatherData } from '../types/weather'

interface Props {
  data: WeatherData[]
  height?: number | string
  showCurrent?: boolean
}

const props = defineProps<Props>()

const chartContainer = ref<HTMLDivElement | null>(null)
let chart: TECharts | null = null

const containerHeight = computed(() => {
  const h = props.height ?? 340
  return typeof h === 'number' ? `${h}px` : h
})

function getOption(list: WeatherData[]): EChartsOption {
  const dates = list.map((d) => d.date)
  const maxArr = list.map((d) => d.temperature.max)
  const minArr = list.map((d) => d.temperature.min)
  const curArr = list.map((d) => d.temperature.current)
  const precipArr = list.map((d) => d.precipitation)

  const series: LineSeriesOption[] = [
    {
      name: '最高',
      type: 'line',
      data: maxArr,
      smooth: true,
      symbol: 'circle',
      showSymbol: false,
      lineStyle: { width: 2, color: '#d54941' },
      areaStyle: { color: 'rgba(213,73,65,0.08)' },
      yAxisIndex: 0
    },
    {
      name: '最低',
      type: 'line',
      data: minArr,
      smooth: true,
      symbol: 'circle',
      showSymbol: false,
      lineStyle: { width: 2, color: '#0052d9' },
      areaStyle: { color: 'rgba(0,82,217,0.08)' },
      yAxisIndex: 0
    },
    {
      name: '降雨量',
      type: 'line',
      data: precipArr,
      smooth: true,
      symbol: 'circle',
      showSymbol: false,
      lineStyle: { width: 2, color: '#00b42a' },
      areaStyle: { color: 'rgba(0,180,42,0.1)' },
      yAxisIndex: 1
    }
  ]

  if (props.showCurrent !== false) {
    series.push({
      name: '当前',
      type: 'line',
      data: curArr,
      smooth: true,
      symbol: 'circle',
      showSymbol: false,
      lineStyle: { width: 2, color: '#2ba471', type: 'dashed' },
      yAxisIndex: 0
    })
  }

  return {
    grid: { left: 48, right: 48, top: 24, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        if (!Array.isArray(params)) return ''
        let result = params[0].axisValue + '<br/>'
        params.forEach((param: any) => {
          if (param.seriesName === '降雨量') {
            result += param.marker + param.seriesName + ': ' + param.value + ' mm<br/>'
          } else {
            result += param.marker + param.seriesName + ': ' + param.value + ' °C<br/>'
          }
        })
        return result
      }
    },
    legend: {
      data: props.showCurrent === false ? ['最高', '最低', '降雨量'] : ['最高', '最低', '当前', '降雨量']
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLabel: { color: '#666' },
      axisLine: { lineStyle: { color: '#ddd' } }
    },
    yAxis: [
      {
        type: 'value',
        name: '温度 (°C)',
        position: 'left',
        axisLabel: {
          formatter: '{value} °C',
          color: '#666'
        },
        splitLine: { lineStyle: { color: '#eee' } },
        axisLine: { lineStyle: { color: '#ddd' } }
      },
      {
        type: 'value',
        name: '降雨量 (mm)',
        position: 'right',
        axisLabel: {
          formatter: '{value} mm',
          color: '#666'
        },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#ddd' } }
      }
    ],
    series
  }
}

function renderChart() {
  if (!chartContainer.value) return
  if (!chart) {
    chart = echarts.init(chartContainer.value)
    window.addEventListener('resize', handleResize)
  }
  const option = getOption(props.data || [])
  chart.setOption(option)
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  renderChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})

watch(
  () => [props.data, props.showCurrent, props.height],
  () => {
    renderChart()
  },
  { deep: true }
)
</script>

<style scoped>
.weather-line-chart {
  width: 100%;
}
</style>



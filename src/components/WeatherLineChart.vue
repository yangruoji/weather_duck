<template>
  <div class="weather-line-chart" :style="{ height: containerHeight }" ref="chartContainer"></div>
  
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { ECharts as TECharts, EChartsOption, LineSeriesOption, BarSeriesOption } from 'echarts'
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
  const icons = list.map((d) => d.icon)

  const series: (LineSeriesOption | BarSeriesOption)[] = [
    {
      name: '最高',
      type: 'line',
      data: maxArr,
      smooth: true,
      symbol: 'circle',
      showSymbol: true,
      symbolSize: 8,
      lineStyle: { width: 2, color: '#d54941' },
      areaStyle: { color: 'rgba(213,73,65,0.08)' },
      yAxisIndex: 0,
      markPoint: {
        symbol: 'none',
        label: {
          show: true,
          formatter: function(params: any) {
            const index = params.dataIndex
            return icons[index] || ''
          },
          fontSize: 16,
          color: '#333'
        },
        data: maxArr.map((value, index) => ({
          value: value,
          xAxis: index,
          yAxis: value,
          name: icons[index] || '',
          itemStyle: { color: 'transparent' }
        }))
      }
    },
    {
      name: '最低',
      type: 'line',
      data: minArr,
      smooth: true,
      symbol: 'circle',
      showSymbol: true,
      symbolSize: 8,
      lineStyle: { width: 2, color: '#0052d9' },
      areaStyle: { color: 'rgba(0,82,217,0.08)' },
      yAxisIndex: 0,
      markPoint: {
        symbol: 'none',
        label: {
          show: true,
          formatter: function(params: any) {
            const index = params.dataIndex
            return icons[index] || ''
          },
          fontSize: 16,
          color: '#333'
        },
        data: minArr.map((value, index) => ({
          value: value,
          xAxis: index,
          yAxis: value,
          name: icons[index] || '',
          itemStyle: { color: 'transparent' }
        }))
      }
    },
    {
      name: '降雨量',
      type: 'bar',
      data: precipArr,
      barWidth: '60%',
      itemStyle: { color: '#00b42a' },
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
      showSymbol: true,
      symbolSize: 6,
      lineStyle: { width: 2, color: '#2ba471', type: 'dashed' },
      yAxisIndex: 0
    })
  }

  return {
    grid: [
      { left: 48, right: 48, top: 50, bottom: 120, height: '60%' },
      { left: 48, right: 48, top: '70%', bottom: 40, height: '20%' }
    ],
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
      data: props.showCurrent === false ? ['最高', '最低', '降雨量'] : ['最高', '最低', '当前', '降雨量'],
      top: 10,
      left: 'center',
      textStyle: {
        fontSize: 12
      }
    },
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLabel: { color: '#666' },
        axisLine: { lineStyle: { color: '#ddd' } },
        gridIndex: 0
      },
      {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLabel: { color: '#666' },
        axisLine: { lineStyle: { color: '#ddd' } },
        gridIndex: 1
      }
    ],
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
        axisLine: { lineStyle: { color: '#ddd' } },
        gridIndex: 0
      },
      {
        type: 'value',
        name: '降雨量 (mm)',
        position: 'left',
        axisLabel: {
          formatter: '{value} mm',
          color: '#666'
        },
        splitLine: { lineStyle: { color: '#eee' } },
        axisLine: { lineStyle: { color: '#ddd' } },
        gridIndex: 1
      }
    ],
    series: [
      {
        name: '最高',
        type: 'line',
        data: maxArr,
        smooth: true,
        symbol: 'circle',
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { width: 2, color: '#d54941' },
        areaStyle: { color: 'rgba(213,73,65,0.08)' },
        xAxisIndex: 0,
        yAxisIndex: 0
      },
      {
        name: '最低',
        type: 'line',
        data: minArr,
        smooth: true,
        symbol: 'circle',
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { width: 2, color: '#0052d9' },
        areaStyle: { color: 'rgba(0,82,217,0.08)' },
        xAxisIndex: 0,
        yAxisIndex: 0
      },
      {
        name: '当前',
        type: 'line',
        data: curArr,
        smooth: true,
        symbol: 'circle',
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 2, color: '#2ba471', type: 'dashed' },
        xAxisIndex: 0,
        yAxisIndex: 0
      },
      {
        name: '降雨量',
        type: 'bar',
        data: precipArr,
        barWidth: '60%',
        itemStyle: { color: '#00b42a' },
        xAxisIndex: 1,
        yAxisIndex: 1
      }
    ] as (LineSeriesOption | BarSeriesOption)[],
    graphic: icons.map((icon, index) => ({
      type: 'text',
      left: `${(index / (dates.length - 1)) * 100}%`,
      top: '10%',
      style: {
        text: icon,
        fontSize: 16,
        fill: '#333'
      }
    }))
  }
}

function renderChart() {
  if (!chartContainer.value) return
  
  // 确保容器有尺寸
  const rect = chartContainer.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    // 如果尺寸为0，延迟重试
    setTimeout(renderChart, 200)
    return
  }
  
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
  // 确保DOM已经渲染完成
  setTimeout(() => {
    renderChart()
  }, 100)
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
  min-height: 200px;
}
</style>



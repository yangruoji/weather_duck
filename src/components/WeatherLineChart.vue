<template>
  <div class="weather-line-chart" :style="{ height: containerHeight }" ref="chartContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { ECharts as TECharts, EChartsOption, LineSeriesOption, BarSeriesOption } from 'echarts'
import type { WeatherData } from '../types/weather'
import { diaryDb } from '../services/diaryDb'

interface Props {
  data: WeatherData[]
  height?: number | string
  showCurrent?: boolean
}

const props = defineProps<Props>()

const chartContainer = ref<HTMLDivElement | null>(null)
let chart: TECharts | null = null

// 日记心情数据
const diaryMoods = ref<Record<string, string>>({})

// 获取日记心情数据
async function loadDiaryMoods() {
  try {
    const diaries = await diaryDb.getAllDiaries()
    const moodMap: Record<string, string> = {}
    diaries.forEach(diary => {
      if (diary.mood) {
        moodMap[diary.date] = diary.mood
      }
    })
    diaryMoods.value = moodMap
  } catch (error) {
    console.error('加载日记心情失败:', error)
  }
}

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

  return {
    grid: {
      left: 60,
      right: 60, 
      top: 80,
      bottom: 60
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        if (!Array.isArray(params)) return ''
        const dataIndex = params[0].dataIndex
        const weather = list[dataIndex]
        const date = dates[dataIndex]
        const mood = diaryMoods.value[date]
        
        let result = `<div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${params[0].axisValue}</div>`
        
        // 天气信息
        result += `<div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">`
        result += `<span style="font-size: 18px;">${icons[dataIndex]}</span>`
        result += `<span style="font-weight: 500;">${weather.description}</span>`
        if (mood) {
          result += `<span style="font-size: 16px; margin-left: 8px;">${mood}</span>`
        }
        result += `</div>`
        
        // 温度数据
        params.forEach((param: any) => {
          if (param.seriesName === '降雨量') {
            result += `${param.marker} ${param.seriesName}: ${param.value} mm<br/>`
          } else {
            result += `${param.marker} ${param.seriesName}: ${param.value} °C<br/>`
          }
        })
        
        // 详细天气信息
        result += `<div style="margin-top: 8px; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 6px;">`
        result += `风力: ${weather.windSpeed}km/h ${weather.windDirection}<br/>`
        result += `云量: ${weather.cloudCover}% · 湿度: ${weather.humidity || 0}%`
        result += `</div>`
        
        return result
      }
    },
    legend: {
      data: props.showCurrent === false ? ['最高温度', '最低温度', '降雨量'] : ['最高温度', '最低温度', '当前温度', '降雨量'],
      top: 10,
      left: 'center',
      textStyle: {
        fontSize: 12
      }
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLabel: { 
        color: '#666',
        formatter: function(value: string) {
          return value.slice(5) // 显示MM-DD格式
        }
      },
      axisLine: { lineStyle: { color: '#ddd' } }
    },
    yAxis: [
      {
        type: 'value',
        name: '温度 (°C)',
        position: 'left',
        axisLabel: {
          formatter: '{value}°',
          color: '#666'
        },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { lineStyle: { color: '#ddd' } }
      },
      {
        type: 'value',
        name: '降雨量 (mm)',
        position: 'right',
        axisLabel: {
          formatter: '{value}mm',
          color: '#666'
        },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#ddd' } }
      }
    ],
    series: [
      {
        name: '最高温度',
        type: 'line',
        data: maxArr,
        smooth: true,
        symbol: 'circle',
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 3, color: '#d54941' },
        yAxisIndex: 0
      },
      {
        name: '最低温度',
        type: 'line',
        data: minArr,
        smooth: true,
        symbol: 'circle',
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 3, color: '#0052d9' },
        yAxisIndex: 0
      },
      ...(props.showCurrent !== false ? [{
        name: '当前温度',
        type: 'line',
        data: curArr,
        smooth: true,
        symbol: 'circle',
        showSymbol: true,
        symbolSize: 4,
        lineStyle: { width: 2, color: '#2ba471', type: 'dashed' },
        yAxisIndex: 0
      }] : []),
      {
        name: '降雨量',
        type: 'bar',
        data: precipArr,
        barWidth: '30%',
        itemStyle: { 
          color: 'rgba(0, 180, 42, 0.6)',
          borderColor: '#00b42a',
          borderWidth: 1
        },
        yAxisIndex: 1
      }
    ] as (LineSeriesOption | BarSeriesOption)[],
    // 天气图标和心情图标 - 放在一起显示
    graphic: dates.map((date, index) => {
      const totalDates = dates.length
      const leftPercent = totalDates === 1 ? 50 : (index / (totalDates - 1)) * 100
      const adjustedLeft = Math.max(8, Math.min(92, leftPercent))
      const mood = diaryMoods.value[date]
      const weatherIcon = icons[index]
      
      // 组合显示：天气图标在上，心情图标在下
      const combinedText = mood ? `${weatherIcon}
${mood}` : weatherIcon
      
      return {
        type: 'text',
        left: `${adjustedLeft}%`,
        bottom: 25, // 统一底部定位
        style: {
          text: combinedText,
          fontSize: mood ? 14 : 16, // 有心情时字体稍小
          fill: '#333',
          textAlign: 'center',
          textVerticalAlign: 'middle',
          lineHeight: mood ? 20 : 16 // 行高调整
        }
      }
    })
  }
}

async function renderChart() {
  if (!chartContainer.value) return
  
  // 确保容器有尺寸
  const rect = chartContainer.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    // 如果尺寸为0，延迟重试
    setTimeout(renderChart, 200)
    return
  }
  
  // 加载日记心情数据
  await loadDiaryMoods()
  
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
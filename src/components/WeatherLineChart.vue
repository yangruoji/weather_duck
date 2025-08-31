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

interface Emits {
  (e: 'cardClick', weather: WeatherData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const chartContainer = ref<HTMLDivElement | null>(null)
let chart: TECharts | null = null

// 日记数据
const diaryMoods = ref<Record<string, string>>({})
const diaryData = ref<Record<string, any>>({})

// 获取日记数据
async function loadDiaryMoods() {
  try {
    const diaries = await diaryDb.getAllDiaries()
    const moodMap: Record<string, string> = {}
    const dataMap: Record<string, any> = {}
    diaries.forEach(diary => {
      if (diary.mood) {
        moodMap[diary.date] = diary.mood
      }
      dataMap[diary.date] = diary
    })
    diaryMoods.value = moodMap
    diaryData.value = dataMap
  } catch (error) {
    console.error('加载日记数据失败:', error)
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
      top: 100,
      bottom: 80
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
          result += `<span style="font-size: 16px; margin-left: 8px;">${getMoodEmoji(mood)}</span>`
        }
        result += `</div>`
        
        result += `<div style="margin-top: 8px; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 6px;">`

        // 温度数据
        params.forEach((param: any) => {
          if (param.seriesName === '降雨量') {
            result += `${param.marker} ${param.seriesName}: ${param.value} mm<br/>`
          } else {
            result += `${param.marker} ${param.seriesName}: ${param.value} °C<br/>`
          }
        })
        result += `</div>`

        // 详细天气信息
        result += `<div style="margin-top: 8px; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 6px;">`
        result += `风力: ${weather.windSpeed}km/h ${weather.windDirection}<br/>`
        result += `云量: ${weather.cloudCover}% · 湿度: ${weather.humidity || 0}%`


        // 日记详细信息
        const diary = diaryData.value[date]
        if (diary) {
          result += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee;">`
          // result += `<div style="font-weight: bold; color: #333; margin-bottom: 4px;">📝 日记信息</div>`
          
          if (diary.city) {
            result += `<div style="margin: 2px 0; font-size: 12px;">📍 ${diary.city}</div>`
          }
          
          if (diary.mood) {
            result += `<div style="margin: 2px 0; font-size: 12px;">${getMoodEmoji(diary.mood)} ${diary.mood}</div>`
          }
          
          if (diary.content) {
            const preview = diary.content.length > 50 ? diary.content.substring(0, 50) + '...' : diary.content
            result += `<div style="margin: 2px 0; font-size: 14px; color: #006;">${preview}</div>`
          }
          
          if (diary.images && diary.images.length > 0) {
            const firstImage = diary.images[0]
            result += `<div style="margin: 6px 0;">
              <img src="${firstImage}" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; display: block; border: 1px solid #eee;" />
            </div>`
          }
          
          if (diary.videos && diary.videos.length > 0) {
            result += `<div style="margin: 2px 0; font-size: 12px; color: #999;">🎥 视频</div>`
          }
          
          result += `</div>`
        }
        
         result += `</div>`
        
        return result
      }
    },
    legend: {
      data: props.showCurrent === false ? ['最高温度', '最低温度', '降雨量'] : ['最高温度', '最低温度', '当前温度', '降雨量'],
      bottom: 10,
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
    // 天气图标和心情图标 - 显示在曲线上方，对应x轴日期
    graphic: [
      // 天气图标 - 曲线上方
      ...dates.map((date, index) => {
        const totalDates = dates.length
        const leftPercent = totalDates === 1 ? 50 : (index / (totalDates - 1)) * 100
        const adjustedLeft = Math.max(8, Math.min(92, leftPercent))
        const weatherIcon = icons[index]
        
        return {
          type: 'text',
          left: `${adjustedLeft}%`,
          top: '8%', // 移到更上方，避免与曲线重叠
          style: {
            text: weatherIcon,
            fontSize: 20,
            fill: '#333',
            textAlign: 'center',
            textVerticalAlign: 'middle',
            textShadowColor: 'rgba(255,255,255,0.8)',
            textShadowBlur: 2
          },
          onclick: () => {
            const weather = list[index]
            emit('cardClick', weather)
          },
          cursor: 'pointer'
        }
      }),
      // 心情图标 - 天气图标上方（只显示图标，不显示文字）
      ...dates.map((date, index) => {
        const mood = diaryMoods.value[date]
        if (!mood) return null
        
        // 获取心情对应的emoji
        const moodEmoji = getMoodEmoji(mood)
        if (!moodEmoji) return null
        
        const totalDates = dates.length
        const leftPercent = totalDates === 1 ? 50 : (index / (totalDates - 1)) * 100
        const adjustedLeft = Math.max(8, Math.min(92, leftPercent))
        
        return {
          type: 'text',
          left: `${adjustedLeft}%`,
          top: '2%', // 在天气图标上方，更靠近顶部
          style: {
            text: moodEmoji,
            fontSize: 16,
            fill: '#666',
            textAlign: 'center',
            textVerticalAlign: 'middle',
            textShadowColor: 'rgba(255,255,255,0.8)',
            textShadowBlur: 2
          },
          onclick: () => {
            const weather = list[index]
            emit('cardClick', weather)
          },
          cursor: 'pointer'
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)
    ]
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

// 获取心情emoji（用于图表显示）
function getMoodEmoji(mood: string): string {
  const moodMap: Record<string, string> = {
    '开心': '😊',
    '愉快': '😄',
    '平静': '😌',
    '兴奋': '🤩',
    '放松': '😎',
    '忧郁': '😔',
    '烦躁': '😤',
    '疲惫': '😴'
  }
  return moodMap[mood] || '😊'
}

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
<template>
  <div class="app">
    <div class="app-header no-print">
      <div class="header-left">
        <h1>
          天气小鸭 · 暑假天气日历
          <span v-if="headerProvince || headerCity" class="title-location">（{{ headerProvince }}<template v-if="headerProvince && headerCity"> · </template>{{ headerCity }}）</span>
        </h1>
      </div>
      <div class="header-right">
        <div class="toolbar">
          <t-input
            class="control control--full"
            v-model="cityKeyword"
            placeholder="搜索城市（中文/英文）"
            @change="onCityInputChange"
            @enter="onCitySearch"
            clearable
          />
          <t-select
            class="control control--full"
            v-model="selectedCity"
            :options="cityOptions"
            placeholder="选择城市"
            @change="onCitySelected"
            :filterable="false"
          />
          <t-button 
            class="control" 
            variant="outline" 
            @click="useMyLocation"
            :loading="locating"
          >
            {{ locating ? '定位中...' : '使用定位' }}
          </t-button>
          <t-date-range-picker
            class="control control--full"
            v-model:value="dateRangeValue"
            allow-input
            clearable
            :placeholder="['开始日期', '结束日期']"
            @change="onDateRangeChange"
          />
          <t-button class="control" theme="primary" @click="fetchAll">获取天气</t-button>
          <t-button class="control" variant="outline" @click="printPage">打印</t-button>
        </div>
      </div>
    </div>

    <div class="app-content">
      <t-alert v-if="errorMessage" theme="error" :message="errorMessage" class="no-print" />
      <t-loading :loading="loading" text="数据加载中...">
        <div class="cards-grid">
          <WeatherCard 
            v-for="item in weatherList" 
            :key="item.date" 
            :weather="item" 
            @click="handleWeatherCardClick"
          />
        </div>
        <div class="chart-wrapper no-print">
          <WeatherLineChart :data="weatherList" :height="360" />
        </div>
      </t-loading>
    </div>

    <div class="app-footer no-print">
      <div class="footer">
        数据来源：Open-Meteo 免费API · 时区：Asia/Shanghai · 位置：{{ displayAddress }}（{{ latitude.toFixed(4) }}, {{ longitude.toFixed(4) }}）
        <span v-if="isDefaultLocation" class="location-note">（默认位置）</span>
      </div>
    </div>

    <!-- 日记编辑对话框 -->
    <WeatherDiary
      v-if="selectedWeather"
      v-model:visible="diaryVisible"
      :weather="selectedWeather"
      @saved="handleDiarySaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DateUtils } from './utils/dateUtils'
import WeatherCard from './components/WeatherCard.vue'
import WeatherLineChart from './components/WeatherLineChart.vue'
import WeatherDiary from './components/WeatherDiary.vue'
import { WeatherApiService } from './services/weatherApi'
import type { WeatherData } from './types/weather'
import { GeocodingService } from './services/geocoding'

const loading = ref(false)
const locating = ref(false)
const errorMessage = ref('')

const latitude = ref(22.5429)
const longitude = ref(114.0596)
const displayAddress = ref('定位中...')
const isDefaultLocation = ref(true)

const cityKeyword = ref('')
const cityOptions = ref<Array<{ label: string; value: string; lat: number; lon: number }>>([])
const selectedCity = ref<string>()

const defaultRange = DateUtils.getDefaultDateRange()
const startDate = ref(defaultRange.startDate)
const endDate = ref(defaultRange.endDate)
const dateRangeValue = ref<[string, string]>([startDate.value, endDate.value])

const weatherList = ref<WeatherData[]>([])

// 日记相关状态
const diaryVisible = ref(false)
const selectedWeather = ref<WeatherData | null>(null)

// 计算标题中显示的城市和省份
const headerParts = computed(() => {
  const raw = displayAddress.value || ''
  if (!raw || raw === '未知位置') return [] as string[]
  return raw.split(' · ').filter(Boolean)
})
const headerCity = computed(() => headerParts.value[0] || '')
const headerProvince = computed(() => headerParts.value[1] || '')

// 将"当前定位"设置为城市选择的默认值
function setSelectedToCurrentLocation(label?: string) {
  const value = `${latitude.value},${longitude.value}`
  const option = {
    label: label || displayAddress.value || '当前定位',
    value,
    lat: latitude.value,
    lon: longitude.value
  }
  const idx = cityOptions.value.findIndex((o) => o.value === value)
  if (idx >= 0) {
    cityOptions.value.splice(idx, 1, option)
  } else {
    cityOptions.value.unshift(option)
  }
  selectedCity.value = value
}

function onDateRangeChange(val: [Date, Date] | [string, string]) {
  const [start, end] = val as [Date | string, Date | string]
  const s = typeof start === 'string' ? start : start.toISOString().slice(0, 10)
  const e = typeof end === 'string' ? end : end.toISOString().slice(0, 10)
  startDate.value = s
  endDate.value = e
}

async function onCityInputChange() {
  if (!cityKeyword.value || cityKeyword.value.trim().length < 2) {
    cityOptions.value = []
    return
  }
  cityOptions.value = await GeocodingService.searchCity(cityKeyword.value.trim())
}

async function onCitySearch() {
  await onCityInputChange()
}

async function onCitySelected(val: string) {
  const target = cityOptions.value.find((o) => o.value === val)
  if (!target) return
  latitude.value = target.lat
  longitude.value = target.lon
  selectedCity.value = val
  displayAddress.value = target.label
  isDefaultLocation.value = false
  await fetchAll()
}

async function useMyLocation() {
  locating.value = true
  errorMessage.value = ''
  
  try {
    const loc = await WeatherApiService.getCurrentLocation()
    latitude.value = loc.latitude
    longitude.value = loc.longitude
    isDefaultLocation.value = false
    
    displayAddress.value = await GeocodingService.reverseGeocode(latitude.value, longitude.value)
    setSelectedToCurrentLocation(displayAddress.value)
    
    await fetchAll()
  } catch (e: any) {
    console.error('定位失败:', e)
    errorMessage.value = e?.message || '定位失败，请检查浏览器定位权限或网络连接'
    
    // 定位失败时使用默认坐标（广东深圳）
    latitude.value = 22.5429
    longitude.value = 114.0596
    isDefaultLocation.value = true
    displayAddress.value = '深圳市 · 广东省 · 中国'
    setSelectedToCurrentLocation('深圳市 · 广东省 · 中国（默认）')
    
    await fetchAll()
  } finally {
    locating.value = false
  }
}

async function fetchAll() {
  errorMessage.value = ''
  if (!DateUtils.isValidDateRange(startDate.value, endDate.value)) {
    errorMessage.value = '日期范围不合法（开始不能晚于结束，且最多30天）。'
    return
  }
  loading.value = true
  try {
    const data = await WeatherApiService.getHistoricalWeather(
      latitude.value,
      longitude.value,
      startDate.value,
      endDate.value
    )
    weatherList.value = data

    const today = new Date().toISOString().slice(0, 10)
    try {
      const current = await WeatherApiService.getCurrentWeather(
        latitude.value,
        longitude.value
      )
      const idx = weatherList.value.findIndex((d) => d.date === today)
      if (idx >= 0 && current) {
        const merged: WeatherData = {
          ...weatherList.value[idx],
          temperature: {
            ...weatherList.value[idx].temperature,
            current: Math.round(current.temperature?.current ?? weatherList.value[idx].temperature.current)
          },
          windSpeed: Math.round((current.windSpeed as number) ?? weatherList.value[idx].windSpeed),
          windDirection: (current.windDirection as string) ?? weatherList.value[idx].windDirection,
          description: (current.description as string) ?? weatherList.value[idx].description,
          icon: (current.icon as string) ?? weatherList.value[idx].icon,
          cloudCover: (current.cloudCover as number) ?? weatherList.value[idx].cloudCover,
          humidity: (current.humidity as number) ?? weatherList.value[idx].humidity
        }
        weatherList.value.splice(idx, 1, merged)
      }
    } catch {}
  } catch (e: any) {
    errorMessage.value = e?.message || '获取天气失败'
  } finally {
    loading.value = false
  }
}

function printPage() {
  window.print()
}

// 处理天气卡片点击
function handleWeatherCardClick(weather: WeatherData) {
  selectedWeather.value = weather
  diaryVisible.value = true
}

// 处理日记保存
function handleDiarySaved(date: string, content: string) {
  console.log(`日记已保存: ${date}`, content ? '有内容' : '已删除')
  // 可以在这里添加保存成功的提示或其他逻辑
}

onMounted(async () => {
  try {
    const loc = await WeatherApiService.getCurrentLocation()
    latitude.value = loc.latitude
    longitude.value = loc.longitude
    isDefaultLocation.value = false
  } catch (e) {
    console.warn('初始定位失败，使用默认坐标:', e)
    // 使用默认坐标（广东深圳）
    latitude.value = 22.5429
    longitude.value = 114.0596
    isDefaultLocation.value = true
  }
  
  try {
    displayAddress.value = await GeocodingService.reverseGeocode(latitude.value, longitude.value)
  } catch {
    displayAddress.value = isDefaultLocation.value ? '深圳市 · 广东省 · 中国' : '未知位置'
  }
  
  // 若未选择城市，则默认使用当前定位
  if (!selectedCity.value) {
    setSelectedToCurrentLocation(displayAddress.value)
  }
  
  await fetchAll()
})
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left h1 {
  font-size: 18px;
  margin: 0;
}
.title-location {
  font-size: 14px;
  color: #666;
  margin-left: 8px;
  font-weight: 400;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding: 16px;
}
.chart-wrapper {
  padding: 16px 16px 0;
}
.app-footer .footer {
  padding: 12px 16px;
  color: #666;
  font-size: 12px;
  text-align: center;
}
.location-note {
  color: #999;
  font-style: italic;
}
/* 顶部工具栏自适应 */
.toolbar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, max-content));
  align-items: center;
  gap: 8px 12px;
}
.control {
  min-width: 120px;
}
.control--full {
  min-width: 200px;
}
@media (max-width: 992px) {
  .toolbar {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  .control--full {
    width: 100%;
  }
}
@media (max-width: 768px) {
  .app-header {
    align-items: flex-start;
  }
  .header-left h1 {
    font-size: 16px;
  }
  .toolbar {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
/* .no-print 的打印样式在下方 @media print 中定义，这里无需常规样式 */
@media print {
  .no-print { display: none !important; }
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 0;
  }
}
</style>


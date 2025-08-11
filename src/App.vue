<template>
  <div class="app">
    <div class="app-header no-print">
      <div class="header-left">
        <h1>天气小鸭 · 暑假天气日历</h1>
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
          <t-button class="control" variant="outline" @click="useMyLocation">使用定位</t-button>
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
          <WeatherCard v-for="item in weatherList" :key="item.date" :weather="item" />
        </div>
      </t-loading>
    </div>

    <div class="app-footer no-print">
      <div class="footer">
        数据来源：Open-Meteo 免费API · 时区：Asia/Shanghai · 位置：{{ displayAddress }}（{{ latitude.toFixed(4) }}, {{ longitude.toFixed(4) }}）
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DateUtils } from './utils/dateUtils'
import WeatherCard from './components/WeatherCard.vue'
import { WeatherApiService } from './services/weatherApi'
import type { WeatherData } from './types/weather'
import { GeocodingService } from './services/geocoding'

const loading = ref(false)
const errorMessage = ref('')

const latitude = ref(39.9042)
const longitude = ref(116.4074)
const displayAddress = ref('定位中...')

const cityKeyword = ref('')
const cityOptions = ref<Array<{ label: string; value: string; lat: number; lon: number }>>([])
const selectedCity = ref<string>()

const defaultRange = DateUtils.getDefaultDateRange()
const startDate = ref(defaultRange.startDate)
const endDate = ref(defaultRange.endDate)
const dateRangeValue = ref<[string, string]>([startDate.value, endDate.value])

const weatherList = ref<WeatherData[]>([])

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
  await fetchAll()
}

async function useMyLocation() {
  try {
    const loc = await WeatherApiService.getCurrentLocation()
    latitude.value = loc.latitude
    longitude.value = loc.longitude
    selectedCity.value = undefined
    displayAddress.value = await GeocodingService.reverseGeocode(latitude.value, longitude.value)
    await fetchAll()
  } catch {
    errorMessage.value = '定位失败，请检查浏览器定位权限。'
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

onMounted(async () => {
  try {
    const loc = await WeatherApiService.getCurrentLocation()
    latitude.value = loc.latitude
    longitude.value = loc.longitude
  } catch {}
  try {
    displayAddress.value = await GeocodingService.reverseGeocode(latitude.value, longitude.value)
  } catch {
    displayAddress.value = '未知位置'
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
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding: 16px;
}
.app-footer .footer {
  padding: 12px 16px;
  color: #666;
  font-size: 12px;
  text-align: center;
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


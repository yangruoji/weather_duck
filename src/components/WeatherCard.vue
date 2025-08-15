<template>
  <t-card class="weather-card" :class="{ 'today': isToday }" @click="handleCardClick">
    <div class="weather-header">
      <div class="date-info">
        <div class="date">{{ formatDate(weather.date) }}</div>
        <div class="weekday">{{ getWeekday(weather.date) }}</div>
      </div>
      <div class="weather-icon" :title="weather.description">
        {{ weather.icon }}
      </div>
    </div>
    
    <div class="weather-main">
      <div class="temperature">
        <span class="current">{{ weather.temperature.current }}°</span>
        <div class="range">
          <span class="min">{{ weather.temperature.min }}°</span>
          <span class="separator">/</span>
          <span class="max">{{ weather.temperature.max }}°</span>
        </div>
      </div>
      <div class="description">{{ weather.description }}</div>
    </div>
    
    <div class="weather-details">
      <div class="detail-item">
        <span class="label">降雨量:</span>
        <span class="value">{{ weather.precipitation }}mm</span>
      </div>
      <div class="detail-item">
        <span class="label">风力:</span>
        <span class="value">{{ weather.windSpeed }}km/h</span>
      </div>
      <div class="detail-item">
        <span class="label">风向:</span>
        <span class="value">{{ weather.windDirection }}</span>
      </div>
      <div class="detail-item">
        <span class="label">云量:</span>
        <span class="value">{{ weather.cloudCover }}%</span>
      </div>
    </div>
    
    <div class="diary-indicator" v-if="hasDiary">
      <t-icon name="edit" size="16" />
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { WeatherData } from '../types/weather'
import { DateUtils } from '../utils/dateUtils'
import { diaryDb } from '../services/diaryDb'

interface Props {
  weather: WeatherData
}

interface Emits {
  (e: 'click', weather: WeatherData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formatDate = DateUtils.formatDate
const getWeekday = DateUtils.getWeekday

const isToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return props.weather.date === today
})

const hasDiary = ref(false)

onMounted(async () => {
  try {
    hasDiary.value = await diaryDb.hasDiary(props.weather.date)
  } catch (e) {
    console.warn('检查日记状态失败:', e)
    hasDiary.value = false
  }
})

function handleCardClick() {
  emit('click', props.weather)
}
</script>

<style scoped>
.weather-card {
  min-height: 200px;
  transition: all 0.3s ease;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
}

.weather-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.weather-card.today {
  border: 2px solid #0052d9;
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%);
}

.weather-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.date-info {
  text-align: left;
}

.date {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.weekday {
  font-size: 14px;
  color: #666;
}

.weather-icon {
  font-size: 32px;
  line-height: 1;
}

.weather-main {
  text-align: center;
  margin-bottom: 20px;
}

.temperature {
  margin-bottom: 8px;
}

.current {
  font-size: 32px;
  font-weight: 700;
  color: #0052d9;
}

.range {
  font-size: 16px;
  color: #666;
}

.min {
  color: #0052d9;
}

.max {
  color: #d54941;
}

.separator {
  margin: 0 4px;
  color: #999;
}

.description {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.weather-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.label {
  color: #666;
}

.value {
  color: #333;
  font-weight: 500;
}

.diary-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 82, 217, 0.1);
  color: #0052d9;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .weather-card {
    min-height: 180px;
  }
  
  .weather-details {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .current {
    font-size: 28px;
  }
  
  .weather-icon {
    font-size: 28px;
  }
}
</style>

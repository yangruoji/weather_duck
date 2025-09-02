<template>
  <div class="weather-summary" v-if="weather">
    <div class="weather-main">
      <div class="weather-icon-section">
        <div class="weather-icon">{{ weather.icon || '🌤️' }}</div>
        <div class="weather-description">{{ weather.description || '未知天气' }}</div>
      </div>
      <div class="temperature-section">
        <div class="temperature">{{ weather.temperature?.current || 0 }}°</div>
        <div class="temp-range">
          {{ weather.temperature?.min || 0 }}° / {{ weather.temperature?.max || 0 }}°
        </div>
      </div>
    </div>
    <div class="weather-details">
      <div class="detail-item">
        <span class="detail-icon">🌧️</span>
        <span class="detail-text">降雨量: {{ weather.precipitation || 0 }}mm</span>
      </div>
      <div class="detail-item">
        <span class="detail-icon">☁️</span>
        <span class="detail-text">云量: {{ weather.cloudCover || 0 }}%</span>
      </div>
      <div class="detail-item">
        <span class="detail-icon">💨</span>
        <span class="detail-text">风力: {{ weather.windSpeed || 0 }}km/h {{ weather.windDirection || '' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WeatherData } from '../types/weather'

interface Props {
  weather: WeatherData
}

defineProps<Props>()
</script>

<style scoped>
.weather-summary {
  padding: 20px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%);
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 82, 217, 0.1);
}

.weather-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.weather-icon-section {
  display: flex;
  align-items: center;
  text-align: center;
}

.weather-icon {
  font-size: 56px;
  margin-bottom: 16px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.weather-description {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.temperature-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.temperature {
  font-size: 42px;
  font-weight: 700;
  color: #0052d9;
  line-height: 1;
  margin-bottom: 4px;
}

.temp-range {
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

.weather-details {
  display: flex;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 82, 217, 0.1);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.detail-icon {
  font-size: 16px;
}

.detail-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

@media (max-width: 768px) {
  .weather-summary {
    padding: 16px;
  }
  
  .weather-icon-section {
    order: 1;
  }
  
  .temperature-section {
    order: 2;
    align-items: center;
    text-align: center;
  }
  
  .weather-icon {
    font-size: 48px;
  }
  
  .temperature {
    font-size: 36px;
  }
  
  .detail-item {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .weather-summary {
    padding: 12px;
  }
  
  .weather-icon {
    font-size: 40px;
  }
  
  .temperature {
    font-size: 32px;
  }
  
  .weather-description {
    font-size: 14px;
  }
  
  .temp-range {
    font-size: 14px;
  }
  
  .detail-text {
    font-size: 13px;
  }
}
</style>
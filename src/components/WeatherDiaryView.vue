<template>
  <t-dialog
    :visible="visible"
    :header="`${date} 天气日记`"
    width="600px"
    :footer="false"
    @close="handleClose"
    @update:visible="handleVisibleChange"
  >
    <div class="diary-view-content" v-if="diaryData">
      <!-- 天气概览 -->
      <div class="weather-summary" v-if="weather">
        <div class="weather-icon">{{ weather.icon || '🌤️' }}</div>
        <div class="weather-info">
          <div class="temperature">{{ weather.temperature?.current || 0 }}°</div>
          <div class="description">{{ weather.description || '未知天气' }}</div>
          <div class="details">
            {{ weather.temperature?.min || 0 }}° / {{ weather.temperature?.max || 0 }}° · 
            降雨量: {{ weather.precipitation || 0 }}mm · 
            风力: {{ weather.windSpeed || 0 }}km/h {{ weather.windDirection || '' }}
          </div>
        </div>
      </div>

      <!-- 日记信息 -->
      <div class="diary-info">
        <div class="info-row-combined" v-if="diaryData.city || diaryData.mood">
          <div class="info-item" v-if="diaryData.mood">
            <span class="info-label">心情：</span>
            <span class="info-value">
              {{ getMoodIcon(diaryData.mood) }} {{ diaryData.mood }}
            </span>
          </div>
          <div class="info-item" v-if="diaryData.city">
            <span class="info-label">📍 位置：</span>
            <span class="info-value">{{ diaryData.city }}</span>
          </div>
        </div>
      </div>

      <!-- 日记内容 -->
      <div class="diary-content" v-if="diaryData.content">
        <h3 class="content-title">日记内容</h3>
        <div class="content-text">{{ diaryData.content }}</div>
      </div>

      <!-- 图片展示 -->
      <div class="diary-images" v-if="diaryData.images && diaryData.images.length > 0">
        <h3 class="content-title">图片记录</h3>
        <div class="image-gallery">
          <div 
            v-for="(image, index) in diaryData.images" 
            :key="index"
            class="image-item"
            @click="previewImage(image, index)"
          >
            <img :src="image" :alt="`图片 ${index + 1}`" />
          </div>
        </div>
      </div>

      <!-- 视频展示 -->
      <div class="diary-video" v-if="diaryData.videos && diaryData.videos.length > 0">
        <h3 class="content-title">视频记录</h3>
        <div v-for="(video, index) in diaryData.videos" :key="index" class="video-item">
          <video :src="video" controls class="video-player">
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="diary-actions">
        <t-space>
          <t-button variant="outline" @click="handleClose">关闭</t-button>
          <t-button theme="primary" @click="handleEdit">编辑日记</t-button>
        </t-space>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">📝</div>
      <div class="empty-text">暂无日记内容</div>
      <t-button theme="primary" @click="handleEdit">开始记录</t-button>
    </div>

    <!-- 图片预览 -->
    <t-image-viewer
      v-model:visible="imagePreviewVisible"
      :images="diaryData?.images || []"
      :index="previewIndex"
    />
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { WeatherData } from '../types/weather'
import { DateUtils } from '../utils/dateUtils'
import { OptimizedSupabaseDiaryService } from '../services/optimizedSupabaseDiary'
import type { WeatherDiary } from '../config/supabase'

interface Props {
  visible: boolean
  weather: WeatherData
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'edit', weather: WeatherData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const diaryData = ref<WeatherDiary | null>(null)
const imagePreviewVisible = ref(false)
const previewIndex = ref(0)

const date = computed(() => {
  if (!props.weather || !props.weather.date) return ''
  return DateUtils.formatFullDate(props.weather.date)
})

// 监听对话框打开，加载日记
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await loadDiary()
  }
})

// 从数据库加载日记
async function loadDiary() {
  if (!props.weather || !props.weather.date) {
    diaryData.value = null
    return
  }
  
  try {
    const diary = await OptimizedSupabaseDiaryService.getDiary(props.weather.date)
    diaryData.value = diary
  } catch (e) {
    console.warn('加载日记失败:', e)
    diaryData.value = null
  }
}

function getMoodIcon(mood: string): string {
  const moodIcons: Record<string, string> = {
    '开心': '😊',
    '愉快': '😄',
    '平静': '😌',
    '忧郁': '😔',
    '烦躁': '😤',
    '兴奋': '🤩',
    '放松': '😎',
    '疲惫': '😴'
  }
  return moodIcons[mood] || '😊'
}

function previewImage(_image: string, index: number) {
  previewIndex.value = index
  imagePreviewVisible.value = true
}

function handleEdit() {
  emit('edit', props.weather)
  handleClose()
}

function handleClose() {
  emit('update:visible', false)
}

function handleVisibleChange(value: boolean) {
  emit('update:visible', value)
}
</script>

<style scoped>
.diary-view-content {
  padding: 0;
}

.weather-summary {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%);
  border-radius: 8px;
  margin-bottom: 24px;
}

.weather-icon {
  font-size: 48px;
  margin-right: 16px;
}

.weather-info {
  flex: 1;
}

.temperature {
  font-size: 32px;
  font-weight: 700;
  color: #0052d9;
  margin-bottom: 4px;
}

.description {
  font-size: 18px;
  color: #333;
  margin-bottom: 8px;
}

.details {
  font-size: 14px;
  color: #666;
}

.diary-info {
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 16px;
}

.info-row-combined {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-label {
  font-weight: 500;
  color: #666;
  margin-right: 8px;
}

.info-value {
  color: #333;
}

.diary-content {
  margin-bottom: 24px;
}

.content-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.content-text {
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #0052d9;
}

.diary-images {
  margin-bottom: 24px;
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.image-item {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;
}

.image-item:hover {
  transform: scale(1.02);
}

.image-item img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.diary-video {
  margin-bottom: 24px;
}

.video-player {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
}

.diary-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  color: #666;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .weather-summary {
    flex-direction: column;
    text-align: center;
  }
  
  .weather-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }
  
  .image-gallery {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
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

    <div class="diary-preview" v-if="diaryData">
      <div class="diary-content" v-if="diaryData.content">
        <div class="diary-text">{{ getDiaryPreview(diaryData.content) }}</div>
      </div>
      <div class="diary-image" v-if="getFirstImage(diaryData)">
        <img :src="getFirstImage(diaryData)" alt="日记图片" />
      </div>
    </div>
    
    <div class="image-upload" v-if="hasDiary" @click.stop>
      <input type="file" multiple accept="image/*" @change="onImagesChange" ref="fileInput" style="display: none" />
      <t-button size="small" variant="outline" @click="triggerUpload">
        <t-icon name="add" size="14" />
        上传图片
      </t-button>
      <div class="image-gallery" v-if="uploadedImages.length > 0">
        <div class="image-item" v-for="(img, index) in uploadedImages" :key="index">
          <img :src="img" alt="上传图片" />
          <t-button size="small" theme="danger" variant="text" @click="removeImage(index)">×</t-button>
        </div>
      </div>
    </div>
    
    <div class="diary-empty-cta" v-if="!hasDiary" @click.stop="handleCardClick">
      写一写今天对天气的感受吧
    </div>

    <div class="diary-indicator" v-if="hasDiary">
      <t-icon name="edit" size="16" />
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { WeatherData } from '../types/weather'
import { DateUtils } from '../utils/dateUtils'
import { diaryDb, DiaryEntry } from '../services/diaryDb'

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
const diaryData = ref<DiaryEntry | null>(null)
const uploadedImages = ref<string[]>([])
const fileInput = ref<HTMLInputElement>()

async function loadDiary() {
  try {
    const diary = await diaryDb.getDiary(props.weather.date)
    if (diary) {
      hasDiary.value = true
      diaryData.value = diary
      uploadedImages.value = diary.images || []
    } else {
      hasDiary.value = false
      diaryData.value = null
      uploadedImages.value = []
    }
  } catch (e) {
    console.warn('加载日记失败:', e)
    hasDiary.value = false
  }
}

function onDiaryEvent(ev: Event) {
  const ce = ev as CustomEvent
  const d = ce?.detail?.date
  if (d === props.weather.date) {
    loadDiary()
  }
}

onMounted(async () => {
  await loadDiary()
  window.addEventListener('diary:saved', onDiaryEvent)
})

onUnmounted(() => {
  window.removeEventListener('diary:saved', onDiaryEvent)
})

function getDiaryPreview(content: string): string {
  const text = content.trim()
  if (!text) return ''
  const head = text.slice(0, 10)
  return head + (text.length > 10 ? '…' : '')
}

function getFirstImage(diary: DiaryEntry): string {
  if (diary.images && diary.images.length > 0) {
    return diary.images[0]
  }
  return diary.image || ''
}

function triggerUpload() {
  fileInput.value?.click()
}

async function onImagesChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files) return
  
  const newImages: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const reader = new FileReader()
    reader.onload = () => {
      newImages.push(String(reader.result || ''))
      if (newImages.length === files.length) {
        uploadedImages.value = [...uploadedImages.value, ...newImages]
        saveImages()
      }
    }
    reader.readAsDataURL(file)
  }
}

function removeImage(index: number) {
  uploadedImages.value.splice(index, 1)
  saveImages()
}

async function saveImages() {
  try {
    // 保持现有的日记内容，只更新图片
    const content = diaryData.value?.content || ''
    // 确保传递完整的天气数据和图片数组
    await diaryDb.saveDiary(props.weather.date, content, props.weather, uploadedImages.value[0], uploadedImages.value)
    await loadDiary()
    // 触发保存事件，通知其他组件更新
    window.dispatchEvent(new CustomEvent('diary:saved', { 
      detail: { date: props.weather.date } 
    }))
  } catch (e) {
    console.error('保存图片失败:', e)
  }
}

function handleCardClick() {
  emit('click', props.weather)
}
</script>

<style scoped>
.weather-card {
  min-height: 200px;
  transition: all 3s ease;
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

.diary-preview {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.diary-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.diary-image {
  margin-bottom: 8px;
}

.diary-image img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}

.image-upload {
  margin-top: 12px;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.image-item {
  position: relative;
  width: 60px;
  height: 60px;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.image-item button {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  padding: 0;
  font-size: 12px;
  line-height: 1;
}

.diary-empty-cta {
  margin-top: 16px;
  padding: 10px 12px;
  border: 1px dashed #0052d9;
  color: #0052d9;
  background: rgba(0, 82, 217, 0.05);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.diary-empty-cta:hover {
  background: rgba(0, 82, 217, 0.08);
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
<template>
  <t-dialog
    :visible="visible"
    :header="`${date} 天气日记`"
    width="600px"
    :footer="false"
    @close="handleClose"
    @update:visible="handleVisibleChange"
  >
    <div class="diary-content">
      <div class="weather-summary" v-if="weather">
        <div class="weather-icon">{{ weather.icon || '🌤️' }}</div>
        <div class="weather-info">
          <div class="temp-row">
            <img v-if="imageData" class="diary-thumb" :src="imageData" alt="日记图片" />
            <div class="temperature">{{ weather.temperature?.current || 0 }}°</div>
            <div class="snippet" v-if="savedPreview">{{ savedPreview }}</div>
          </div>
          <div class="description">{{ weather.description || '未知天气' }}</div>
          <div class="details">
            {{ weather.temperature?.min || 0 }}° / {{ weather.temperature?.max || 0 }}° · 
            降雨量: {{ weather.precipitation || 0 }}mm · 
            风力: {{ weather.windSpeed || 0 }}km/h {{ weather.windDirection || '' }}
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <t-loading size="medium" text="正在加载日记..." />
      </div>
      
      <!-- 日记内容 -->
      <template v-else>
        <div class="diary-preview" v-if="savedContent">
          已保存日记：{{ savedPreview }}
        </div>
        
        <div class="diary-editor">
          <t-textarea
            v-model="diaryText"
            :placeholder="`记录一下 ${date} 的天气感受吧...`"
            :maxlength="1000"
            :autosize="{ minRows: 8, maxRows: 15 }"
            show-limit-number
            clearable
          />
        </div>
        <div class="image-uploader">
          <t-space align="center">
            <input type="file" multiple accept="image/*" @change="onFilesChange" />
            <t-button v-if="imageList.length > 0" variant="outline" theme="danger" size="small" @click="clearAllImages">清空图片</t-button>
          </t-space>
          <div class="images-preview" v-if="imageList.length > 0">
            <div class="image-item" v-for="(img, index) in imageList" :key="index">
              <img :src="img" alt="预览" />
              <t-button size="small" theme="danger" variant="text" @click="removeImage(index)">×</t-button>
            </div>
          </div>
        </div>
        
        <div class="diary-actions">
          <t-space>
            <t-button variant="outline" @click="handleClose">取消</t-button>
            <t-button theme="primary" @click="handleSave" :loading="saving">
              保存日记
            </t-button>
          </t-space>
        </div>
      </template>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { WeatherData } from '../types/weather'
import { DateUtils } from '../utils/dateUtils'
import { StorageAdapter } from '../services/storageAdapter'
import { OptimizedSupabaseDiaryService } from '../services/optimizedSupabaseDiary'

interface Props {
  visible: boolean
  weather: WeatherData
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'saved', date: string, content: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const diaryText = ref('')
const saving = ref(false)
const savedContent = ref('')
const imageData = ref<string>('') // 封面（第一张）
const imageList = ref<string[]>([])
const imageDirty = ref(false)
const isLoading = ref(false)

const savedPreview = computed(() => {
  const text = savedContent.value.trim()
  if (!text) return ''
  const head = text.slice(0, 10)
  return head + (text.length > 10 ? '…' : '')
})

const date = computed(() => {
  if (!props.weather || !props.weather.date) return ''
  return DateUtils.formatFullDate(props.weather.date)
})

// 监听对话框打开，加载已有日记
watch(() => props.visible, async (newVisible, oldVisible) => {
  console.log('🔍 visible 变化:', oldVisible, '->', newVisible, 'weather.date:', props.weather?.date)
  console.log('🔍 完整 weather 对象:', props.weather)
  
  if (newVisible) {
    console.log('🚀 对话框打开，立即开始加载日记')
    isLoading.value = true
    
    // 强制等待一个微任务，确保组件完全渲染
    await new Promise(resolve => setTimeout(resolve, 0))
    
    if (props.weather?.date) {
      console.log('🔍 调用 loadDiary，日期:', props.weather.date)
      await loadDiary()
    } else {
      console.log('❌ weather.date 不存在，无法加载日记')
    }
    
    isLoading.value = false
  } else {
    console.log('对话框关闭，清空数据')
    diaryText.value = ''
    imageData.value = ''
    imageList.value = []
    imageDirty.value = false
    isLoading.value = false
  }
}, { immediate: true })

// 组件挂载时，如果对话框已经可见，立即加载数据
onMounted(async () => {
  console.log('组件挂载，visible:', props.visible, 'weather.date:', props.weather?.date)
  if (props.visible && props.weather?.date) {
    console.log('挂载时立即加载日记')
    isLoading.value = true
    await loadDiary()
    isLoading.value = false
  }
})

// 监听天气数据变化，重新加载日记
watch(() => props.weather?.date, async (newDate, oldDate) => {
  if (newDate && newDate !== oldDate && props.visible) {
    isLoading.value = true
    await loadDiary()
    isLoading.value = false
  }
})

// 从数据库加载日记
async function loadDiary() {
  console.log('🔍 loadDiary 被调用')
  console.log('🔍 props.weather:', props.weather)
  console.log('🔍 props.weather?.date:', props.weather?.date)
  
  if (!props.weather || !props.weather.date) {
    console.log('❌ 没有天气数据或日期，清空状态')
    savedContent.value = ''
    diaryText.value = ''
    imageData.value = ''
    imageList.value = []
    imageDirty.value = false
    return
  }
  
  try {
    console.log('🚀 开始调用 OptimizedSupabaseDiaryService.getDiary，日期:', props.weather.date)
    
    // 强制调用服务
    const diary = await OptimizedSupabaseDiaryService.getDiary(props.weather.date)
    
    console.log('📦 服务返回的日记数据:', diary)
    
    if (diary) {
      console.log('✅ 找到日记，设置内容')
      savedContent.value = diary.content || ''
      diaryText.value = diary.content || ''
      imageData.value = diary.images?.[0] || ''
      imageList.value = diary.images || []
      imageDirty.value = false
    } else {
      console.log('📝 没有找到日记，设置为空状态')
      savedContent.value = ''
      diaryText.value = ''
      imageData.value = ''
      imageList.value = []
      imageDirty.value = false
    }
  } catch (e) {
    console.error('💥 加载日记失败:', e)
    savedContent.value = ''
    diaryText.value = ''
    imageData.value = ''
    imageList.value = []
    imageDirty.value = false
  }
}

// 保存日记到数据库
async function handleSave() {
  if (!props.weather || !props.weather.date) {
    handleClose()
    return
  }
  
  if (!diaryText.value.trim()) {
    // 如果内容为空，删除日记
    try {
      await StorageAdapter.deleteDiary(props.weather.date)
      savedContent.value = ''
      emit('saved', props.weather.date, '')
      // 通知全局刷新（卡片实时更新）
      window.dispatchEvent(new CustomEvent('diary:updated', { detail: { date: props.weather.date, action: 'save' } }))
      handleClose()
    } catch (e) {
      console.error('删除日记失败:', e)
    }
    return
  }

  saving.value = true
  try {
    await OptimizedSupabaseDiaryService.saveDiary({
      date: props.weather.date,
      content: diaryText.value.trim(),
      weather_data: props.weather,
      images: imageDirty.value ? imageList.value : [],
      mood: '',
      city: '',
      videos: []
    })
    savedContent.value = diaryText.value.trim()
    emit('saved', props.weather.date, diaryText.value.trim())
    // 通知全局刷新（卡片实时更新）
    window.dispatchEvent(new CustomEvent('diary:updated', { detail: { date: props.weather.date, action: 'delete' } }))
    handleClose()
  } catch (e) {
    console.error('保存日记失败:', e)
  } finally {
    saving.value = false
  }
}

function onFilesChange(e: Event) {
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
        imageList.value = [...imageList.value, ...newImages]
        if (imageList.value.length > 0) {
          imageData.value = imageList.value[0]
        }
        imageDirty.value = true
      }
    }
    reader.readAsDataURL(file)
  }
}

function removeImage(index: number) {
  imageList.value.splice(index, 1)
  if (index === 0 && imageList.value.length > 0) {
    imageData.value = imageList.value[0]
  } else if (imageList.value.length === 0) {
    imageData.value = ''
  }
  imageDirty.value = true
}

function clearAllImages() {
  imageData.value = ''
  imageList.value = []
  imageDirty.value = true
}

function handleClose() {
  emit('update:visible', false)
}

function handleVisibleChange(value: boolean) {
  emit('update:visible', value)
}
</script>

<style scoped>
.diary-content {
  padding: 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #666;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #666;
}

.weather-summary {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%);
  border-radius: 8px;
  margin-bottom: 20px;
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

.temp-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diary-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.snippet {
  margin-left: 8px;
  color: #666;
  font-size: 14px;
  white-space: nowrap;
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

.diary-preview {
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
}

.diary-editor {
  margin-bottom: 20px;
}

.image-uploader {
  margin-bottom: 12px;
}

.images-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.image-item button {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  padding: 0;
  font-size: 14px;
  line-height: 1;
}

.diary-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #eee;
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
}
</style>
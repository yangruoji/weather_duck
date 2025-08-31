<template>
  <t-dialog
    :visible="visible"
    :header="`编辑 ${date} 天气日记`"
    width="700px"
    :footer="false"
    @close="handleClose"
    @update:visible="handleVisibleChange"
  >
    <div class="diary-edit-content">
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

      <!-- 城市信息 -->
      <div class="form-section">
        <label class="form-label">城市位置</label>
        <t-input
          v-model="cityLocation"
          placeholder="记录当时所在的城市"
          clearable
        />
      </div>

      <!-- 心情选择 -->
      <div class="form-section">
        <label class="form-label">今日心情</label>
        <div class="mood-selector">
          <div 
            v-for="mood in moodOptions" 
            :key="mood.value"
            class="mood-option"
            :class="{ active: selectedMood === mood.value }"
            @click="selectedMood = mood.value"
          >
            <span class="mood-emoji">{{ mood.emoji }}</span>
            <span class="mood-label">{{ mood.label }}</span>
          </div>
        </div>
      </div>

      <!-- 日记内容 -->
      <div class="form-section">
        <label class="form-label">日记内容</label>
        <t-textarea
          v-model="diaryText"
          :placeholder="`记录一下 ${date} 的天气感受吧...`"
          :maxlength="2000"
          :autosize="{ minRows: 6, maxRows: 12 }"
          show-limit-number
          clearable
        />
      </div>

      <!-- 图片上传 -->
      <div class="form-section">
        <label class="form-label">上传图片</label>
        <t-upload
          v-model="uploadFiles"
          :before-upload="beforeUpload"
          :auto-upload="false"
          multiple
          accept="image/*"
          :max="9"
          theme="image"
          :show-image-file-name="true"
          :image-viewer-props="{ 
            trigger: 'click',
            closeOnClickModal: true,
            showArrow: true,
            showIndex: true
          }"
          tips="支持上传jpg、png格式图片，单张不超过5MB，最多9张"
        />
      </div>

      <!-- 视频上传 -->
      <div class="form-section">
        <label class="form-label">上传视频</label>
        <t-upload
          v-model="videoFiles"
          :before-upload="beforeVideoUpload"
          :auto-upload="false"
          accept="video/*"
          :max="1"
          theme="file"
          :show-upload-progress="true"
          tips="支持上传mp4、mov格式视频，不超过50MB"
        />
        
        <!-- 视频预览播放器 -->
        <div v-if="videoFiles.length > 0" class="video-preview">
          <div v-for="(video, index) in videoFiles" :key="index" class="video-item">
            <video 
              v-if="video.url"
              :src="video.url" 
              controls 
              preload="metadata"
              style="width: 100%; max-height: 300px; border-radius: 6px; margin-bottom: 8px;"
            >
              您的浏览器不支持视频播放
            </video>
            <div v-else class="video-loading">
              <t-loading size="small" />
              <span style="margin-left: 8px;">视频处理中...</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="diary-actions">
        <t-space>
          <t-button variant="outline" @click="handleClose">取消</t-button>
          <t-button theme="danger" variant="outline" @click="handleDelete" v-if="hasExistingDiary">
            删除日记
          </t-button>
          <t-button theme="primary" @click="handleSave" :loading="saving">
            保存日记
          </t-button>
        </t-space>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { WeatherData } from '../types/weather'
import { DateUtils } from '../utils/dateUtils'
import { StorageAdapter } from '../services/storageAdapter'
import type { WeatherDiary } from '../config/supabase'

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

// 表单数据
const cityLocation = ref('')
const selectedMood = ref('')
const diaryText = ref('')
const uploadFiles = ref<any[]>([])
const videoFiles = ref<any[]>([])
const saving = ref(false)
const hasExistingDiary = ref(false)

// 心情选项
const moodOptions = [
  { value: '开心', label: '开心', emoji: '😊' },
  { value: '愉快', label: '愉快', emoji: '😄' },
  { value: '平静', label: '平静', emoji: '😌' },
  { value: '兴奋', label: '兴奋', emoji: '🤩' },
  { value: '放松', label: '放松', emoji: '😎' },
  { value: '忧郁', label: '忧郁', emoji: '😔' },
  { value: '烦躁', label: '烦躁', emoji: '😤' },
  { value: '疲惫', label: '疲惫', emoji: '😴' }
]

const date = computed(() => {
  if (!props.weather || !props.weather.date) return ''
  return DateUtils.formatFullDate(props.weather.date)
})

// 上传配置
const uploadAction = 'data:' // 使用data URL，不实际上传到服务器

// 监听对话框打开，加载已有日记
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await loadDiary()
  } else {
    resetForm()
  }
})

// 重置表单
function resetForm() {
  cityLocation.value = ''
  selectedMood.value = ''
  diaryText.value = ''
  uploadFiles.value = []
  videoFiles.value = []
  hasExistingDiary.value = false
}

// 从数据库加载日记
async function loadDiary() {
  if (!props.weather || !props.weather.date) {
    resetForm()
    return
  }
  
  try {
    const diary = await StorageAdapter.getDiary(props.weather.date)
    if (diary) {
      hasExistingDiary.value = true
      cityLocation.value = diary.city || ''
      selectedMood.value = diary.mood || ''
      diaryText.value = diary.content || ''
      // 处理已有的图片和视频文件
      if (diary.images && diary.images.length > 0) {
        uploadFiles.value = diary.images.map((url, index) => ({
          name: `image-${index}.jpg`,
          url: url,
          status: 'success'
        }))
      }
      if (diary.video) {
        videoFiles.value = [{
          name: 'video.mp4',
          url: diary.video,
          status: 'success'
        }]
      }
    } else {
      resetForm()
    }
  } catch (e) {
    console.warn('加载日记失败:', e)
    resetForm()
  }
}

// 图片上传前处理
function beforeUpload(file: any) {
  // 检查文件对象是否有效
  if (!file || typeof file !== 'object') {
    console.error('无效的文件对象:', file)
    return false
  }
  
  // 如果file.raw存在，使用file.raw（TDesign Upload组件的文件结构）
  const actualFile = file.raw || file
  
  // 再次检查实际文件对象
  if (!actualFile || !(actualFile instanceof File || actualFile instanceof Blob)) {
    console.error('无效的文件对象:', actualFile)
    return false
  }
  
  const isImage = actualFile.type.startsWith('image/')
  const isLt5M = actualFile.size / 1024 / 1024 < 5
  
  if (!isImage) {
    console.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    console.error('图片大小不能超过5MB!')
    return false
  }
  
  // 同步转换为base64并设置预览URL
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target && e.target.result) {
      file.url = e.target.result
      file.status = 'success'
      // 强制更新视频文件列表以触发预览显示
      videoFiles.value = [...videoFiles.value]
    }
  }
  reader.readAsDataURL(actualFile)
  
  // 返回true允许文件添加到列表
  return true
}

// 视频上传前处理
function beforeVideoUpload(file: any) {
  // 检查文件对象是否有效
  if (!file || typeof file !== 'object') {
    console.error('无效的文件对象:', file)
    return false
  }
  
  // 如果file.raw存在，使用file.raw（TDesign Upload组件的文件结构）
  const actualFile = file.raw || file
  
  // 再次检查实际文件对象
  if (!actualFile || !(actualFile instanceof File || actualFile instanceof Blob)) {
    console.error('无效的文件对象:', actualFile)
    return false
  }
  
  const isVideo = actualFile.type.startsWith('video/')
  const isLt50M = actualFile.size / 1024 / 1024 < 50
  
  if (!isVideo) {
    console.error('只能上传视频文件!')
    return false
  }
  if (!isLt50M) {
    console.error('视频大小不能超过50MB!')
    return false
  }
  
  // 同步转换为base64并设置预览URL
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target && e.target.result) {
      file.url = e.target.result
      file.status = 'success'
      // 强制更新视频文件列表以触发预览显示
      videoFiles.value = [...videoFiles.value]
    }
  }
  reader.readAsDataURL(actualFile)
  
  // 返回true允许文件添加到列表
  return true
}

function onUploadSuccess(context: any) {
  console.log('图片上传成功', context)
}

function onVideoUploadSuccess(context: any) {
  console.log('视频上传成功', context)
}

function onRemoveFile(context: any) {
  console.log('移除图片', context)
}

function onRemoveVideo(context: any) {
  console.log('移除视频', context)
}

// 保存日记
async function handleSave() {
  if (!props.weather || !props.weather.date) {
    handleClose()
    return
  }
  
  saving.value = true
  try {
    // 提取图片URLs
    const imageUrls = uploadFiles.value
      .filter(file => file.url)
      .map(file => file.url)
    
    // 提取视频URL
    const videoUrl = videoFiles.value.length > 0 ? videoFiles.value[0].url : ''
    

    
    // 保存到数据库（StorageAdapter会自动选择存储方式）
    await StorageAdapter.saveDiary({
      date: props.weather.date,
      content: diaryText.value.trim(),
      weather_data: props.weather,
      images: imageUrls,
      mood: selectedMood.value,
      city: cityLocation.value.trim(),
      video: videoUrl
    })
    
    emit('saved', props.weather.date, diaryText.value.trim())
    // 通知全局刷新
    window.dispatchEvent(new CustomEvent('diary:saved', { 
      detail: { date: props.weather.date } 
    }))
    handleClose()
  } catch (e) {
    console.error('保存日记失败:', e)
  } finally {
    saving.value = false
  }
}

// 删除日记
async function handleDelete() {
  if (!props.weather || !props.weather.date) return
  
  try {
    await StorageAdapter.deleteDiary(props.weather.date)
    emit('saved', props.weather.date, '')
    // 通知全局刷新
    window.dispatchEvent(new CustomEvent('diary:saved', { 
      detail: { date: props.weather.date } 
    }))
    handleClose()
  } catch (e) {
    console.error('删除日记失败:', e)
  }
}

function handleClose() {
  emit('update:visible', false)
}

function handleVisibleChange(value: boolean) {
  emit('update:visible', value)
}
</script>

<style scoped>
.diary-edit-content {
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

.form-section {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.mood-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.mood-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mood-option:hover {
  border-color: #0052d9;
  background: rgba(0, 82, 217, 0.05);
}

.mood-option.active {
  border-color: #0052d9;
  background: rgba(0, 82, 217, 0.1);
}

.mood-emoji {
  font-size: 24px;
  margin-bottom: 4px;
}

.mood-label {
  font-size: 12px;
  color: #666;
}

.mood-option.active .mood-label {
  color: #0052d9;
  font-weight: 500;
}

.video-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.video-item {
  margin-bottom: 8px;
}

.video-item:last-child {
  margin-bottom: 0;
}

.video-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.diary-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
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
  
  .mood-selector {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
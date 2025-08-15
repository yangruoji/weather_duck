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
          <div class="temperature">{{ weather.temperature?.current || 0 }}°</div>
          <div class="description">{{ weather.description || '未知天气' }}</div>
          <div class="details">
            {{ weather.temperature?.min || 0 }}° / {{ weather.temperature?.max || 0 }}° · 
            降雨量: {{ weather.precipitation || 0 }}mm · 
            风力: {{ weather.windSpeed || 0 }}km/h {{ weather.windDirection || '' }}
          </div>
        </div>
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
      
      <div class="diary-actions">
        <t-space>
          <t-button variant="outline" @click="handleClose">取消</t-button>
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
import { diaryDb } from '../services/diaryDb'

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

const date = computed(() => {
  if (!props.weather || !props.weather.date) return ''
  return DateUtils.formatFullDate(props.weather.date)
})

// 监听对话框打开，加载已有日记
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await loadDiary()
  } else {
    diaryText.value = ''
  }
})

// 从数据库加载日记
async function loadDiary() {
  if (!props.weather || !props.weather.date) {
    diaryText.value = ''
    return
  }
  try {
    const diary = await diaryDb.getDiary(props.weather.date)
    if (diary) {
      diaryText.value = diary.content
    } else {
      diaryText.value = ''
    }
  } catch (e) {
    console.warn('加载日记失败:', e)
    diaryText.value = ''
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
      await diaryDb.deleteDiary(props.weather.date)
      emit('saved', props.weather.date, '')
      handleClose()
    } catch (e) {
      console.error('删除日记失败:', e)
    }
    return
  }

  saving.value = true
  try {
    await diaryDb.saveDiary(props.weather.date, diaryText.value.trim(), props.weather)
    emit('saved', props.weather.date, diaryText.value.trim())
    handleClose()
  } catch (e) {
    console.error('保存日记失败:', e)
  } finally {
    saving.value = false
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
.diary-content {
  padding: 0;
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

.description {
  font-size: 18px;
  color: #333;
  margin-bottom: 8px;
}

.details {
  font-size: 14px;
  color: #666;
}

.diary-editor {
  margin-bottom: 20px;
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

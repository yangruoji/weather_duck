<template>
  <div class="lazy-diary-loader">
    <!-- 日记数据会在需要时才加载 -->
    <slot :diaries="diaries" :loading="loading" :loadMore="loadMore" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { OptimizedDiaryService } from '../services/optimizedDiary'
import type { WeatherDiary } from '../config/supabase'

const diaries = ref<Partial<WeatherDiary>[]>([])
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 20

// 加载日记概览（不包含大文件）
async function loadDiariesOverview() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize
    const newDiaries = await OptimizedDiaryService.getDiariesOverview(pageSize, offset)
    
    if (newDiaries.length < pageSize) {
      hasMore.value = false
    }
    
    diaries.value.push(...newDiaries)
    currentPage.value++
  } catch (error) {
    console.error('加载日记概览失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载更多
function loadMore() {
  loadDiariesOverview()
}

onMounted(() => {
  loadDiariesOverview()
})
</script>

<style scoped>
.lazy-diary-loader {
  width: 100%;
}
</style>
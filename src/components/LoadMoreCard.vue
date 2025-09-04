<template>
  <t-card 
    class="load-more-card"
    :bordered="false"
    hover
    @click="handleLoadMore"
  >
    <div class="load-more-content">
      <div class="load-more-icon">
        <t-icon name="add" size="32px" />
      </div>
      <div class="load-more-text">
        <div class="title">加载更多天气日记</div>
        <div class="subtitle">点击加载前7天数据</div>
      </div>
      <t-loading v-if="loading" size="small" />
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  loadMore: []
}>()

function handleLoadMore() {
  if (!props.loading) {
    emit('loadMore')
  }
}
</script>

<style scoped>
.load-more-card {
  height: 200px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px dashed #e0e0e0;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.load-more-card:hover {
  border-color: #1976d2;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
}

.load-more-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  position: relative;
}

.load-more-icon {
  color: #666;
  transition: color 0.3s ease;
}

.load-more-card:hover .load-more-icon {
  color: #1976d2;
}

.load-more-text {
  text-align: center;
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  color: #666;
}

.load-more-card:hover .title {
  color: #1976d2;
}

.load-more-card:hover .subtitle {
  color: #1565c0;
}
</style>
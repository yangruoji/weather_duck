<template>
  <transition name="slide-down">
    <div v-if="!isOnline" class="offline-indicator">
      <div class="offline-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01L16.17 17l1.42 1.42 1.27-1.27z" fill="currentColor"/>
        </svg>
        <span>离线模式</span>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'OfflineIndicator',
  data() {
    return {
      isOnline: navigator.onLine
    }
  },
  mounted() {
    window.addEventListener('online', this.updateOnlineStatus)
    window.addEventListener('offline', this.updateOnlineStatus)
  },
  beforeUnmount() {
    window.removeEventListener('online', this.updateOnlineStatus)
    window.removeEventListener('offline', this.updateOnlineStatus)
  },
  methods: {
    updateOnlineStatus() {
      this.isOnline = navigator.onLine
      
      if (this.isOnline) {
        this.$emit('online')
      } else {
        this.$emit('offline')
      }
    }
  }
}
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  background: #ff6b6b;
  color: white;
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.offline-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
}
</style>
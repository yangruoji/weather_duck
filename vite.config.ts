import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'tdesign-vue-next'],
          supabase: ['@supabase/supabase-js'],
          charts: ['echarts']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    host: true
  }
})

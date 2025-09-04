// 全局数据管理器 - 确保所有数据请求都通过缓存
import { diaryService } from './diaryService.js'
import { weatherService } from './weatherService.js'

class GlobalDataManager {
  constructor() {
    this.isInitialized = false
    this.currentDateRange = null
    this.dataCache = new Map()
  }

  // 初始化并预加载数据
  async initialize(startDate, endDate, latitude, longitude) {
    if (this.isInitialized && 
        this.currentDateRange && 
        this.currentDateRange.startDate === startDate && 
        this.currentDateRange.endDate === endDate) {
      console.log('数据已初始化，跳过重复加载')
      return
    }

    console.log('🚀 全局数据管理器：开始初始化数据')
    
    try {
      // 并行加载天气和日记数据
      const [weatherData, diariesData] = await Promise.all([
        weatherService.getWeatherForDateRange(latitude, longitude, startDate, endDate),
        diaryService.getDiariesByDateRange(startDate, endDate)
      ])

      // 将日记数据映射到缓存中
      const diariesMap = new Map()
      diariesData.forEach(diary => {
        if (diary.date) {
          diariesMap.set(diary.date, diary)
        }
      })

      // 更新全局状态
      this.currentDateRange = { startDate, endDate }
      this.dataCache.set('weather', weatherData)
      this.dataCache.set('diaries', diariesMap)
      this.isInitialized = true

      // 暴露到全局供组件使用
      window.__globalDataManager = this
      window.__diaryCache = diariesMap
      window.__weatherList = weatherData

      console.log('✅ 全局数据管理器：数据初始化完成', {
        weatherCount: weatherData.length,
        diaryCount: diariesData.length
      })

      // 通知所有组件数据已准备就绪
      window.dispatchEvent(new CustomEvent('global:data:ready', {
        detail: { weatherData, diariesData }
      }))

    } catch (error) {
      console.error('❌ 全局数据管理器：初始化失败', error)
      throw error
    }
  }

  // 获取日记数据（优先从缓存）
  getDiary(date) {
    const diariesMap = this.dataCache.get('diaries')
    return diariesMap ? diariesMap.get(date) : null
  }

  // 获取天气数据
  getWeatherList() {
    return this.dataCache.get('weather') || []
  }

  // 刷新特定日期的数据
  async refreshDate(date) {
    try {
      console.log(`🔄 刷新日期数据: ${date}`)
      const diary = await diaryService.getDiaryByDate(date, true) // 强制刷新
      
      const diariesMap = this.dataCache.get('diaries')
      if (diariesMap) {
        diariesMap.set(date, diary)
      }

      // 通知组件更新
      window.dispatchEvent(new CustomEvent('diary:updated', {
        detail: { date, diary }
      }))

      return diary
    } catch (error) {
      console.error(`刷新日期数据失败 (${date}):`, error)
      throw error
    }
  }

  // 清理缓存
  clearCache() {
    this.dataCache.clear()
    this.isInitialized = false
    this.currentDateRange = null
    console.log('🧹 全局数据缓存已清理')
  }
}

export const globalDataManager = new GlobalDataManager()
export default globalDataManager
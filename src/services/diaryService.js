// 优化的日记服务
import { supabase } from '../config/supabase'
import { cacheService } from './cacheService.js'

class DiaryService {
  constructor() {
    this.defaultTTL = 300000 // 5分钟缓存
  }

  async getDiaries(limit = 50, forceRefresh = false) {
    const key = cacheService.generateKey('diaries', { limit })
    
    if (!forceRefresh && cacheService.has(key)) {
      console.log('使用缓存的日记列表')
      return cacheService.get(key)
    }

    try {
      console.log('请求新的日记列表')
      const { data, error } = await supabase
        .from('weather_diaries')
        .select('id,date,content,mood,city,weather_data,images,video,created_at,updated_at')
        .order('date', { ascending: false })
        .limit(limit)

      if (error) throw error

      const diaries = data || []
      cacheService.set(key, diaries, this.defaultTTL)
      
      // 同时缓存单个日记
      diaries.forEach(diary => {
        const singleKey = cacheService.generateKey('diary_by_date', { date: diary.date })
        cacheService.set(singleKey, diary, this.defaultTTL)
      })

      return diaries
    } catch (error) {
      console.error('获取日记列表失败:', error)
      const cachedData = cacheService.get(key)
      if (cachedData) {
        console.log('使用过期的日记列表缓存')
        return cachedData
      }
      throw error
    }
  }

  async getDiariesByDateRange(startDate, endDate, forceRefresh = false) {
    const key = cacheService.generateKey('diaries_range', { startDate, endDate })
    
    if (!forceRefresh && cacheService.has(key)) {
      console.log('使用缓存的日期范围日记')
      return cacheService.get(key)
    }

    try {
      console.log('请求新的日期范围日记')
      const { data, error } = await supabase
        .from('weather_diaries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) throw error

      const diaries = data || []
      cacheService.set(key, diaries, this.defaultTTL)
      
      // 同时缓存单个日记
      diaries.forEach(diary => {
        const singleKey = cacheService.generateKey('diary_by_date', { date: diary.date })
        cacheService.set(singleKey, diary, this.defaultTTL)
      })

      return diaries
    } catch (error) {
      console.error('获取日期范围日记失败:', error)
      const cachedData = cacheService.get(key)
      if (cachedData) {
        console.log('使用过期的日期范围日记缓存')
        return cachedData
      }
      throw error
    }
  }

  async getDiaryByDate(date, forceRefresh = false) {
    const key = cacheService.generateKey('diary_by_date', { date })
    
    if (!forceRefresh && cacheService.has(key)) {
      console.log(`使用缓存的日记数据: ${date}`)
      return cacheService.get(key)
    }

    try {
      console.log(`请求新的日记数据: ${date}`)
      const { data, error } = await supabase
        .from('weather_diaries')
        .select('id,date,content,mood,city,weather_data,images,video,created_at,updated_at')
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 是没有找到记录的错误
        throw error
      }

      const diary = data || null
      cacheService.set(key, diary, this.defaultTTL)
      return diary
    } catch (error) {
      console.error(`获取日记失败 (${date}):`, error)
      const cachedData = cacheService.get(key)
      if (cachedData) {
        console.log(`使用过期的日记缓存: ${date}`)
        return cachedData
      }
      return null // 对于日记，如果获取失败就返回null
    }
  }

  async createDiary(diaryData) {
    try {
      const { data, error } = await supabase
        .from('weather_diaries')
        .insert([diaryData])
        .select()
        .single()

      if (error) throw error

      // 更新缓存
      this.updateCacheAfterModification(data)
      return data
    } catch (error) {
      console.error('创建日记失败:', error)
      throw error
    }
  }

  async updateDiary(id, diaryData) {
    try {
      const { data, error } = await supabase
        .from('weather_diaries')
        .update(diaryData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // 更新缓存
      this.updateCacheAfterModification(data)
      return data
    } catch (error) {
      console.error('更新日记失败:', error)
      throw error
    }
  }

  async deleteDiary(id) {
    try {
      const { error } = await supabase
        .from('weather_diaries')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 清理相关缓存
      this.clearDiaryCache()
      return true
    } catch (error) {
      console.error('删除日记失败:', error)
      throw error
    }
  }

  updateCacheAfterModification(diary) {
    // 更新单个日记缓存
    const singleKey = cacheService.generateKey('diary_by_date', { date: diary.date })
    cacheService.set(singleKey, diary, this.defaultTTL)
    
    // 清理列表缓存，强制重新加载
    cacheService.invalidateByType('diaries')
    cacheService.invalidateByType('diaries_range')
  }

  clearDiaryCache() {
    cacheService.invalidateByType('diary_by_date')
    cacheService.invalidateByType('diaries')
    cacheService.invalidateByType('diaries_range')
    console.log('日记缓存已清空')
  }

  async refreshDiaryByDate(date) {
    return this.getDiaryByDate(date, true)
  }

  async preloadAdjacentDiaries(currentDate) {
    const current = new Date(currentDate)
    const prevDate = new Date(current.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const nextDate = new Date(current.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // 预加载相邻日期的日记（不等待结果）
    Promise.all([
      this.getDiaryByDate(prevDate).catch(() => null),
      this.getDiaryByDate(nextDate).catch(() => null)
    ]).then(() => {
      console.log(`预加载相邻日记完成: ${prevDate}, ${nextDate}`)
    })
  }
}

export const diaryService = new DiaryService()
export default diaryService
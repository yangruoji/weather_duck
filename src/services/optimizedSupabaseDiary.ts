import { supabase, WeatherDiary } from '../config/supabase'
import { SupabaseStorageService } from './supabaseStorage'

/**
 * 优化版Supabase天气日记服务
 * 支持批量查询、更好的性能和错误处理
 */
export class OptimizedSupabaseDiaryService {
  
  /**
   * 获取指定日期的日记
   */
  static async getDiary(date: string): Promise<WeatherDiary | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }
      
      const { data, error } = await supabase
        .from('weather_diaries')
        .select('*')
        .eq('date', date)
        .maybeSingle()

      if (error) {
        console.error('获取日记失败:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('获取日记时发生错误', error)
      return null
    }
  }

  /**
   * 批量获取指定日期的日记 - 用于日历优化
   * 一次请求获取多个日期的日记，避免多次请求
   */
  static async getDiariesByDates(dates: string[]): Promise<Record<string, WeatherDiary>> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }

      if (dates.length === 0) {
        return {}
      }

      const { data, error } = await supabase
        .from('weather_diaries')
        .select('*')
        .in('date', dates)

      if (error) {
        console.error('批量获取日记失败:', error)
        throw error
      }

      // 转换为以日期为键的对象，方便快速查找
      const diariesMap: Record<string, WeatherDiary> = {}
      data?.forEach(diary => {
        if (diary.date) {
          diariesMap[diary.date] = diary
        }
      })

      return diariesMap
    } catch (error) {
      console.error('批量获取日记时发生错误', error)
      return {}
    }
  }

  /**
   * 获取日期范围内的所有日记 - 优化版本
   */
  static async getDiariesInRange(startDate: string, endDate: string): Promise<WeatherDiary[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }

      const { data, error } = await supabase
        .from('weather_diaries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) {
        console.error('获取日记范围失败:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('获取日记范围时发生错误', error)
      return []
    }
  }

  /**
   * 保存或更新日记 - 简化版本，文件上传在组件中处理
   */
  static async saveDiary(
    diary: Omit<WeatherDiary, 'id' | 'created_at' | 'updated_at'>
  ): Promise<WeatherDiary> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }

      // 检查是否已存在
      const existing = await this.getDiary(diary.date)
      
      if (existing) {
        // 更新现有记录
        const { data, error } = await supabase
          .from('weather_diaries')
          .update({
            weather_data: diary.weather_data,
            content: diary.content,
            mood: diary.mood,
            city: diary.city,
            images: diary.images,
            videos: diary.videos
          })
          .eq('date', diary.date)
          .select()
          .single()

        if (error) {
          console.error('更新日记失败:', error)
          throw error
        }

        return data
      } else {
        // 创建新记录
        const { data, error } = await supabase
          .from('weather_diaries')
          .insert([diary])
          .select()
          .single()

        if (error) {
          console.error('创建日记失败:', error)
          throw error
        }

        return data
      }
    } catch (error) {
      console.error('保存日记时发生错误', error)
      throw error
    }
  }

  /**
   * 删除日记及相关文件
   */
  static async deleteDiary(date: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }

      // 先获取日记以删除相关文件
      const diary = await this.getDiary(date)
      
      if (diary) {
        // 删除相关文件
        const filesToDelete: string[] = []
        if (diary.images) {
          filesToDelete.push(...diary.images)
        }
        if (diary.videos) {
          filesToDelete.push(...diary.videos)
        }
        
        if (filesToDelete.length > 0) {
          await SupabaseStorageService.deleteFiles(filesToDelete)
        }
      }

      // 删除数据库记录
      const { error } = await supabase
        .from('weather_diaries')
        .delete()
        .eq('date', date)

      if (error) {
        console.error('删除日记失败:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('删除日记时发生错误', error)
      return false
    }
  }

  /**
   * 获取日历月份的所有日记 - 优化版本
   * 用于日历组件，一次性加载整个月的数据
   */
  static async getMonthDiaries(year: number, month: number): Promise<Record<string, WeatherDiary>> {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`
      
      const diaries = await this.getDiariesInRange(startDate, endDate)
      
      // 转换为以日期为键的对象
      const diariesMap: Record<string, WeatherDiary> = {}
      diaries.forEach(diary => {
        if (diary.date) {
          diariesMap[diary.date] = diary
        }
      })

      return diariesMap
    } catch (error) {
      console.error('获取月份日记时发生错误', error)
      return {}
    }
  }

  /**
   * 搜索日记内容 - 优化版本
   */
  static async searchDiaries(keyword: string, limit: number = 20): Promise<WeatherDiary[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }

      const { data, error } = await supabase
        .from('weather_diaries')
        .select('*')
        .or(`content.ilike.%${keyword}%,city.ilike.%${keyword}%,mood.ilike.%${keyword}%`)
        .order('date', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('搜索日记失败:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('搜索日记时发生错误', error)
      return []
    }
  }

  /**
   * 获取统计信息 - 优化版本
   */
  static async getStatistics() {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }

      const { data, error } = await supabase
        .from('weather_diaries')
        .select('mood, city, date, images, videos')

      if (error) {
        console.error('获取统计信息失败:', error)
        throw error
      }

      const stats = {
        totalDiaries: data?.length || 0,
        totalImages: 0,
        totalVideos: 0,
        moodStats: {} as Record<string, number>,
        cityStats: {} as Record<string, number>,
        monthlyStats: {} as Record<string, number>
      }

      data?.forEach(diary => {
        // 统计图片和视频
        if (diary.images) {
          stats.totalImages += diary.images.length
        }
        if (diary.videos) {
          stats.totalVideos += diary.videos.length
        }

        // 心情统计
        if (diary.mood) {
          stats.moodStats[diary.mood] = (stats.moodStats[diary.mood] || 0) + 1
        }
        
        // 城市统计
        if (diary.city) {
          stats.cityStats[diary.city] = (stats.cityStats[diary.city] || 0) + 1
        }
        
        // 月度统计
        if (diary.date) {
          const month = diary.date.substring(0, 7) // YYYY-MM
          stats.monthlyStats[month] = (stats.monthlyStats[month] || 0) + 1
        }
      })

      return stats
    } catch (error) {
      console.error('获取统计信息时发生错误', error)
      return {
        totalDiaries: 0,
        totalImages: 0,
        totalVideos: 0,
        moodStats: {},
        cityStats: {},
        monthlyStats: {}
      }
    }
  }

  /**
   * 批量操作 - 删除多个日记
   */
  static async deleteDiaries(dates: string[]): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }

      // 获取所有要删除的日记
      const diaries = await this.getDiariesByDates(dates)
      
      // 收集所有要删除的文件
      const filesToDelete: string[] = []
      Object.values(diaries).forEach(diary => {
        if (diary.images) {
          filesToDelete.push(...diary.images)
        }
        if (diary.videos) {
          filesToDelete.push(...diary.videos)
        }
      })

      // 删除文件
      if (filesToDelete.length > 0) {
        await SupabaseStorageService.deleteFiles(filesToDelete)
      }

      // 批量删除数据库记录
      const { error } = await supabase
        .from('weather_diaries')
        .delete()
        .in('date', dates)

      if (error) {
        console.error('批量删除日记失败:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('批量删除日记时发生错误', error)
      return false
    }
  }
}
import { supabase, WeatherDiary } from '../config/supabase'
import { SupabaseStorageService } from './supabaseStorage'

/**
 * Supabase天气日记服务
 */
export class SupabaseDiaryService {
  
  /**
   * 获取指定日期的日�?
   */
  static async getDiary(date: string): Promise<WeatherDiary | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase未配置')
      }
      const { data, error } = await supabase!
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
      console.error('获取日记时发生错�?', error)
      return null
    }
  }

  /**
   * 保存或更新日�?
   */
  static async saveDiary(diary: Omit<WeatherDiary, 'id' | 'created_at' | 'updated_at'>): Promise<WeatherDiary> {
    try {
      // 检查是否已存在
      const existing = await this.getDiary(diary.date)
      
      if (existing) {
        // 更新现有记录
        const { data, error } = await supabase!!
          .from('weather_diaries')
          .update({
            weather_data: diary.weather_data,
            content: diary.content,
            mood: diary.mood,
            city: diary.city,
            images: diary.images,
            video: diary.video
          })
          .eq('date', diary.date)
          .select()
          .maybeSingle()

        if (error) {
          console.error('更新日记失败:', error)
          throw error
        }

        return data
      } else {
        // 创建新记�?
        const { data, error } = await supabase!
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
      console.error('保存日记时发生错�?', error)
      throw error
    }
  }

  /**
   * 删除日记
   */
  static async deleteDiary(date: string): Promise<boolean> {
    try {
      // 先获取日记以删除相关文件
      const diary = await this.getDiary(date)
      
      if (diary) {
        // 删除相关文件
        const filesToDelete: string[] = []
        if (diary.images) {
          filesToDelete.push(...diary.images)
        }
        if (diary.video) {
          filesToDelete.push(diary.video)
        }
        
        if (filesToDelete.length > 0) {
          await SupabaseStorageService.deleteFiles(filesToDelete)
        }
      }

      // 删除数据库记�?
      const { error } = await supabase!
        .from('weather_diaries')
        .delete()
        .eq('date', date)

      if (error) {
        console.error('删除日记失败:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('删除日记时发生错�?', error)
      return false
    }
  }

  /**
   * 获取日期范围内的所有日�?
   */
  static async getDiariesInRange(startDate: string, endDate: string): Promise<WeatherDiary[]> {
    try {
      const { data, error } = await supabase!
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
      console.error('获取日记范围时发生错�?', error)
      return []
    }
  }

  /**
   * 获取所有日�?
   */
  static async getAllDiaries(): Promise<WeatherDiary[]> {
    try {
      const { data, error } = await supabase!
        .from('weather_diaries')
        .select('*')
        .order('date', { ascending: false })

      if (error) {
        console.error('获取所有日记失�?', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('获取所有日记时发生错误:', error)
      return []
    }
  }

  /**
   * 按城市搜索日�?
   */
  static async getDiariesByCity(city: string): Promise<WeatherDiary[]> {
    try {
      const { data, error } = await supabase!
        .from('weather_diaries')
        .select('*')
        .eq('city', city)
        .order('date', { ascending: false })

      if (error) {
        console.error('按城市搜索日记失�?', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('按城市搜索日记时发生错误:', error)
      return []
    }
  }

  /**
   * 按心情搜索日�?
   */
  static async getDiariesByMood(mood: string): Promise<WeatherDiary[]> {
    try {
      const { data, error } = await supabase!
        .from('weather_diaries')
        .select('*')
        .eq('mood', mood)
        .order('date', { ascending: false })

      if (error) {
        console.error('按心情搜索日记失�?', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('按心情搜索日记时发生错误:', error)
      return []
    }
  }

  /**
   * 搜索日记内容
   */
  static async searchDiaries(keyword: string): Promise<WeatherDiary[]> {
    try {
      const { data, error } = await supabase!
        .from('weather_diaries')
        .select('*')
        .or(`content.ilike.%${keyword}%,city.ilike.%${keyword}%,mood.ilike.%${keyword}%`)
        .order('date', { ascending: false })

      if (error) {
        console.error('搜索日记失败:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('搜索日记时发生错�?', error)
      return []
    }
  }

  /**
   * 获取统计信息
   */
  static async getStatistics() {
    try {
      const { data, error } = await supabase!
        .from('weather_diaries')
        .select('mood, city, date')

      if (error) {
        console.error('获取统计信息失败:', error)
        throw error
      }

      const stats = {
        totalDiaries: data?.length || 0,
        moodStats: {} as Record<string, number>,
        cityStats: {} as Record<string, number>,
        monthlyStats: {} as Record<string, number>
      }

      data?.forEach(diary => {
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
      console.error('获取统计信息时发生错�?', error)
      return {
        totalDiaries: 0,
        moodStats: {},
        cityStats: {},
        monthlyStats: {}
      }
    }
  }
}

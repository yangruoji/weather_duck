import { supabase, isSupabaseEnabled } from '../config/supabase'

/**
 * 优化的日记服务 - 解决大量请求和数据传输问题
 */
export class OptimizedDiaryService {
  
  /**
   * 获取日记概览（只包含基本信息，不包含大文件）
   */
  static async getDiariesOverview(limit: number = 100, offset: number = 0) {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Supabase未配置')
    }

    try {
      const { data, error } = await supabase
        .from('weather_diaries')
        .select('id, date, mood, city, created_at')
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('获取日记概览失败:', error)
      throw error
    }
  }

  /**
   * 批量获取指定日期的日记（避免单个请求）
   */
  static async getDiariesByDateRange(startDate: string, endDate: string) {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Supabase未配置')
    }

    try {
      const { data, error } = await supabase
        .from('weather_diaries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('批量获取日记失败:', error)
      throw error
    }
  }

  /**
   * 获取日记详情（包含媒体文件URL）
   */
  static async getDiaryDetail(date: string) {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Supabase未配置')
    }

    try {
      const { data, error } = await supabase
        .from('weather_diaries')
        .select('*')
        .eq('date', date)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('获取日记详情失败:', error)
      throw error
    }
  }

  /**
   * 分页获取日记列表
   */
  static async getPaginatedDiaries(page: number = 1, pageSize: number = 20) {
    const offset = (page - 1) * pageSize
    
    try {
      // 获取总数
      const { count } = await supabase!
        .from('weather_diaries')
        .select('*', { count: 'exact', head: true })

      // 获取分页数据
      const { data, error } = await supabase!
        .from('weather_diaries')
        .select('id, date, content, mood, city, created_at')
        .order('date', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) throw error

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    } catch (error) {
      console.error('分页获取日记失败:', error)
      throw error
    }
  }
}
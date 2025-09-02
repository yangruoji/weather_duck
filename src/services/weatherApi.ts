import axios from 'axios'
import { WeatherApiResponse, WeatherData } from '../types/weather'

// 使用免费的Open-Meteo API
const API_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'

// 天气代码对应的描述和图标
const weatherCodes: Record<number, { description: string; icon: string }> = {
  0: { description: '晴天', icon: '☀️' },
  1: { description: '多云', icon: '⛅' },
  2: { description: '阴天', icon: '☁️' },
  3: { description: '雾', icon: '🌫️' },
  45: { description: '雾', icon: '🌫️' },
  48: { description: '雾凇', icon: '🌫️' },
  51: { description: '小雨', icon: '🌦️' },
  53: { description: '中雨', icon: '🌧️' },
  55: { description: '大雨', icon: '🌧️' },
  61: { description: '小雨', icon: '🌦️' },
  63: { description: '中雨', icon: '🌧️' },
  65: { description: '大雨', icon: '🌧️' },
  71: { description: '小雪', icon: '🌨️' },
  73: { description: '中雪', icon: '❄️' },
  75: { description: '大雪', icon: '❄️' },
  95: { description: '雷雨', icon: '⛈️' },
  96: { description: '雷阵雨', icon: '⛈️' },
  99: { description: '强雷阵雨', icon: '⛈️' }
}

export class WeatherApiService {
  // 获取历史天气数据
  static async getHistoricalWeather(
    latitude: number = 22.5429, // 默认广东深圳坐标
    longitude: number = 114.0596,
    startDate: string,
    endDate: string
  ): Promise<WeatherData[]> {
    // 离线快速失败
    const offlineMsg = '网络不可用，请检查连接后重试'
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn('离线状态，跳过请求')
      throw new Error(offlineMsg)
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    const shouldRetry = (err: any): boolean => {
      const code = err?.code
      const msg = String(err?.message || '')
      const status = err?.response?.status
      if (code === 'ERR_NETWORK') return true
      if (/Network Error|ERR_NETWORK_CHANGED/i.test(msg)) return true
      if (status === 429 || (status >= 500 && status < 600)) return true
      return false
    }

    const maxRetries = 3
    let lastError: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get<WeatherApiResponse>(API_BASE_URL, {
          params: {
            latitude,
            longitude,
            start_date: startDate,
            end_date: endDate,
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,cloudcover_mean,weathercode',
            timezone: 'Asia/Shanghai'
          },
          timeout: 10000
        })

        const daily = response.data?.daily
        if (!daily || !Array.isArray(daily.time)) {
          throw new Error('天气数据格式异常')
        }

        const result: WeatherData[] = []
        const len = daily.time.length
        for (let i = 0; i < len; i += 1) {
          const date = daily.time[i]
          const tmax = daily.temperature_2m_max?.[i]
          const tmin = daily.temperature_2m_min?.[i]
          const precip = daily.precipitation_sum?.[i] ?? 0
          const windSpeed = daily.windspeed_10m_max?.[i] ?? 0
          const windDirDeg = daily.winddirection_10m_dominant?.[i]
          const cloud = daily.cloudcover_mean?.[i] ?? 0
          const wcode = daily.weathercode?.[i] ?? 0

          const info = weatherCodes[wcode] || { description: '未知', icon: '❓' }
          const windDirection = typeof windDirDeg === 'number' ? this.getWindDirection(windDirDeg) : '不详'
          const hasT = typeof tmax === 'number' && typeof tmin === 'number'
          
          // 改进温度数据处理 - 不跳过任何日期
          let minTemp = 0
          let maxTemp = 0
          let currentTemp = 0
          let isPlaceholder = false
          
          if (hasT) {
            minTemp = Math.round(tmin as number)
            maxTemp = Math.round(tmax as number)
            currentTemp = Math.round(((tmin as number) + (tmax as number)) / 2)
          } else {
            // 如果没有温度数据，使用0值
            console.warn(`日期 ${date} 缺少温度数据`)
            minTemp = 0
            maxTemp = 0
            currentTemp = 0
            isPlaceholder = true
          }

          result.push({
            date,
            temperature: {
              min: minTemp,
              max: maxTemp,
              current: currentTemp
            },
            humidity: 60,
            windSpeed: Math.round(windSpeed as number),
            windDirection,
            precipitation: Math.round((precip as number) * 100) / 100,
            cloudCover: Math.round(cloud as number),
            description: isPlaceholder ? '历史数据缺失' : info.description,
            icon: isPlaceholder ? '❓' : info.icon,
            isPlaceholder
          })
        }

        return result
      } catch (error: any) {
        lastError = error
        if (attempt < maxRetries && shouldRetry(error)) {
          const base = 500
          const wait = base * Math.pow(2, attempt) + Math.floor(Math.random() * 300)
          console.warn(`获取天气数据失败，准备重试(${attempt + 1}/${maxRetries})，等待 ${wait}ms`, error)
          await sleep(wait)
          continue
        }
        console.error('获取天气数据失败:', error)
        const msg = shouldRetry(error) ? '网络波动，获取天气数据失败，请稍后重试' : '获取天气数据失败，请稍后重试'
        throw new Error(msg)
      }
    }

    throw lastError || new Error('获取天气数据失败，请稍后重试')
  }

  // 获取实时天气（用于今天的补充信息）
  static async getCurrentWeather(
    latitude: number = 22.5429,
    longitude: number = 114.0596
  ): Promise<Partial<WeatherData> | null> {
    try {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude,
          longitude,
          current_weather: true,
          timezone: 'Asia/Shanghai'
        }
      })
      const cw = response.data?.current_weather
      if (!cw) return null
      const info = weatherCodes[cw.weathercode] || { description: '未知', icon: '❓' }
      return {
        date: String(cw.time).slice(0, 10),
        temperature: { current: Math.round(cw.temperature), min: 0, max: 0 },
        windSpeed: Math.round(cw.windspeed),
        windDirection: this.getWindDirection(cw.winddirection),
        description: info.description,
        icon: info.icon
      }
    } catch (e) {
      console.warn('实时天气获取失败', e)
      return null
    }
  }

  // 获取最近几天的完整天气数据（包括今天和未来几天）
  static async getRecentWeather(
    latitude: number = 22.5429,
    longitude: number = 114.0596,
    days: number = 7
  ): Promise<WeatherData[]> {
    try {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude,
          longitude,
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,cloudcover_mean,weathercode',
          current_weather: true,
          timezone: 'Asia/Shanghai',
          forecast_days: days
        },
        timeout: 10000
      })

      const daily = response.data?.daily
      const current = response.data?.current_weather
      
      if (!daily || !Array.isArray(daily.time)) {
        throw new Error('天气数据格式异常')
      }

      const result: WeatherData[] = []
      const len = daily.time.length
      const today = new Date().toISOString().slice(0, 10)

      for (let i = 0; i < len; i += 1) {
        const date = daily.time[i]
        const tmax = daily.temperature_2m_max?.[i]
        const tmin = daily.temperature_2m_min?.[i]
        const precip = daily.precipitation_sum?.[i] ?? 0
        const windSpeed = daily.windspeed_10m_max?.[i] ?? 0
        const windDirDeg = daily.winddirection_10m_dominant?.[i]
        const cloud = daily.cloudcover_mean?.[i] ?? 0
        const wcode = daily.weathercode?.[i] ?? 0

        const info = weatherCodes[wcode] || { description: '未知', icon: '❓' }
        const windDirection = typeof windDirDeg === 'number' ? this.getWindDirection(windDirDeg) : '不详'
        const hasT = typeof tmax === 'number' && typeof tmin === 'number'

        if (!hasT) {
          console.warn(`日期 ${date} 缺少温度数据`)
          continue
        }

        const minTemp = Math.round(tmin as number)
        const maxTemp = Math.round(tmax as number)
        
        // 对于今天，如果有实时温度数据，使用实时温度作为当前温度
        let currentTemp = Math.round((minTemp + maxTemp) / 2)
        if (date === today && current && typeof current.temperature === 'number') {
          currentTemp = Math.round(current.temperature)
        }

        result.push({
          date,
          temperature: {
            min: minTemp,
            max: maxTemp,
            current: currentTemp
          },
          humidity: 60, // 默认值，forecast API不提供湿度
          windSpeed: Math.round(windSpeed as number),
          windDirection,
          precipitation: Math.round((precip as number) * 100) / 100,
          cloudCover: Math.round(cloud as number),
          description: info.description,
          icon: info.icon
        })
      }

      return result
    } catch (error: any) {
      console.error('获取最近天气数据失败:', error)
      throw new Error('获取最近天气数据失败，请稍后重试')
    }
  }

  // 增强版获取天气数据 - 结合历史数据和最近数据，确保连续性
  static async getEnhancedWeatherData(
    latitude: number = 22.5429,
    longitude: number = 114.0596,
    startDate: string,
    endDate: string
  ): Promise<WeatherData[]> {
    const today = new Date().toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    
    try {
      const allData: WeatherData[] = []
      const promises: Promise<WeatherData[]>[] = []
      
      // 1. 获取历史数据（到前天为止）
      if (startDate <= twoDaysAgo) {
        const historyEndDate = endDate <= twoDaysAgo ? endDate : twoDaysAgo
        promises.push(
          this.getHistoricalWeather(latitude, longitude, startDate, historyEndDate)
            .catch(error => {
              console.warn('历史数据获取失败，将使用占位数据:', error)
              return []
            })
        )
      }
      
      // 2. 获取最近数据（昨天、今天及未来）
      const recentStartDate = startDate > twoDaysAgo ? startDate : new Date(new Date(twoDaysAgo).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      if (recentStartDate <= endDate) {
        const daysFromYesterday = Math.ceil((new Date(endDate).getTime() - new Date(recentStartDate).getTime()) / (24 * 60 * 60 * 1000)) + 1
        promises.push(
          this.getRecentWeather(latitude, longitude, Math.min(daysFromYesterday + 1, 16))
            .then(data => data.filter(item => item.date >= recentStartDate && item.date <= endDate))
            .catch(error => {
              console.warn('最近数据获取失败，将使用占位数据:', error)
              return []
            })
        )
      }
      
      // 3. 等待所有请求完成
      const results = await Promise.allSettled(promises)
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allData.push(...result.value)
        }
      })
      
      // 4. 去重并排序
      const uniqueData = allData.reduce((acc, item) => {
        if (!acc.find(existing => existing.date === item.date)) {
          acc.push(item)
        }
        return acc
      }, [] as WeatherData[])
      
      // 5. 生成完整的日期范围，填补缺失数据
      const completeData = this.generateCompleteDateRange(startDate, endDate, uniqueData)
      
      return completeData.sort((a, b) => a.date.localeCompare(b.date))
      
    } catch (error) {
      console.error('获取增强天气数据失败:', error)
      // 即使失败也要返回完整的日期范围
      return this.generateCompleteDateRange(startDate, endDate, [])
    }
  }

  // 生成完整的日期范围，填补缺失的天气数据
  private static generateCompleteDateRange(
    startDate: string,
    endDate: string,
    existingData: WeatherData[]
  ): WeatherData[] {
    const result: WeatherData[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date().toISOString().slice(0, 10)
    
    // 创建现有数据的映射
    const dataMap = new Map<string, WeatherData>()
    existingData.forEach(item => {
      dataMap.set(item.date, item)
    })
    
    // 遍历日期范围
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      
      if (dataMap.has(dateStr)) {
        // 使用现有数据
        result.push(dataMap.get(dateStr)!)
      } else {
        // 生成占位数据
        const placeholderData = this.generatePlaceholderWeatherData(dateStr, today)
        result.push(placeholderData)
      }
    }
    
    return result
  }

  // 生成占位天气数据
  private static generatePlaceholderWeatherData(date: string, today: string): WeatherData {
    const isPast = date < today
    const isToday = date === today
    const isFuture = date > today
    
    // 根据日期类型生成不同的描述
    let description = '数据缺失'
    if (isPast) {
      description = '历史数据缺失'
    } else if (isToday) {
      description = '实时数据缺失'
    } else if (isFuture) {
      description = '预报数据缺失'
    }
    
    return {
      date,
      temperature: { min: 0, max: 0, current: 0 }, // 不给默认值，保持0
      humidity: 0, // 不给默认值
      windSpeed: 0,
      windDirection: '未知',
      precipitation: 0,
      cloudCover: 0,
      description,
      icon: '❓', // 统一使用❓图标
      isPlaceholder: true // 标记为占位数据
    }
  }



  // 根据角度计算风向
  private static getWindDirection(angle: number): string {
    if (angle >= 337.5 || angle < 22.5) return '北风'
    if (angle >= 22.5 && angle < 67.5) return '东北风'
    if (angle >= 67.5 && angle < 112.5) return '东风'
    if (angle >= 112.5 && angle < 157.5) return '东南风'
    if (angle >= 157.5 && angle < 202.5) return '南风'
    if (angle >= 202.5 && angle < 247.5) return '西南风'
    if (angle >= 247.5 && angle < 292.5) return '西风'
    if (angle >= 292.5 && angle < 337.5) return '西北风'
    return '北风'
  }

  // 获取当前位置（增强版，带超时和错误处理）
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持定位'))
        return
      }

      const options = {
        enableHighAccuracy: false, // 降低精度要求，提高成功率
        timeout: 10000, // 10秒超时
        maximumAge: 300000 // 5分钟内的缓存位置
      }

      const success = (position: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = position.coords
        console.log(`定位成功: ${latitude}, ${longitude}, 精度: ${accuracy}米`)
        
        // 检查坐标合理性（中国大致范围）
        if (latitude < 3 || latitude > 54 || longitude < 73 || longitude > 135) {
          console.warn('定位坐标超出中国范围，可能定位错误')
          reject(new Error('定位坐标异常，可能不在中国境内'))
          return
        }
        
        resolve({ latitude, longitude })
      }

      const error = (err: GeolocationPositionError) => {
        let message = '定位失败'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = '定位权限被拒绝，请在浏览器设置中允许定位'
            break
          case err.POSITION_UNAVAILABLE:
            message = '定位信息不可用，请检查网络连接'
            break
          case err.TIMEOUT:
            message = '定位超时，请重试'
            break
        }
        console.error('定位错误:', message, err)
        reject(new Error(message))
      }

      navigator.geolocation.getCurrentPosition(success, error, options)
    })
  }
}

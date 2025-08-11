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
    latitude: number = 39.9042, // 默认北京坐标
    longitude: number = 116.4074,
    startDate: string,
    endDate: string
  ): Promise<WeatherData[]> {
    try {
      const response = await axios.get<WeatherApiResponse>(API_BASE_URL, {
        params: {
          latitude,
          longitude,
          start_date: startDate,
          end_date: endDate,
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,cloudcover_mean,weathercode',
          timezone: 'Asia/Shanghai'
        }
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

        result.push({
          date,
          temperature: {
            min: hasT ? Math.round(tmin as number) : 0,
            max: hasT ? Math.round(tmax as number) : 0,
            current: hasT ? Math.round(((tmin as number) + (tmax as number)) / 2) : 0
          },
          humidity: 60,
          windSpeed: Math.round(windSpeed as number),
          windDirection,
          precipitation: Math.round((precip as number) * 100) / 100,
          cloudCover: Math.round(cloud as number),
          description: info.description,
          icon: info.icon
        })
      }

      return result
    } catch (error) {
      console.error('获取天气数据失败:', error)
      throw new Error('获取天气数据失败，请稍后重试')
    }
  }

  // 获取实时天气（用于今天的补充信息）
  static async getCurrentWeather(
    latitude: number = 39.9042,
    longitude: number = 116.4074
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
        temperature: { current: cw.temperature, min: 0, max: 0 },
        windSpeed: cw.windspeed,
        windDirection: this.getWindDirection(cw.winddirection),
        description: info.description,
        icon: info.icon
      }
    } catch (e) {
      console.warn('实时天气获取失败', e)
      return null
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

  // 获取当前位置（简化版，实际项目中可以使用浏览器定位API）
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          },
          () => {
            // 定位失败时使用默认坐标（北京）
            resolve({ latitude: 39.9042, longitude: 116.4074 })
          }
        )
      } else {
        // 不支持定位时使用默认坐标
        resolve({ latitude: 39.9042, longitude: 116.4074 })
      }
    })
  }
}

// 优化的天气服务
import { WeatherApiService } from './weatherApi.ts'
import { cacheService } from './cacheService.js'

class WeatherService {
  constructor() {
    this.defaultTTL = 300000 // 5分钟缓存
    this.forecastTTL = 1800000 // 30分钟缓存（预报数据更新较慢）
  }

  async getCurrentWeather(latitude, longitude, forceRefresh = false) {
    const key = cacheService.generateKey('current_weather', { latitude, longitude })
    
    if (!forceRefresh && cacheService.has(key)) {

      return cacheService.get(key)
    }

    try {

      const data = await WeatherApiService.getCurrentWeather(latitude, longitude)
      if (data) {
        cacheService.set(key, data, this.defaultTTL)
      }
      return data
    } catch (error) {
      console.error('获取当前天气失败:', error)
      // 如果有缓存数据，即使过期也返回
      const cachedData = cacheService.get(key)
      if (cachedData) {

        return cachedData
      }
      throw error
    }
  }

  async getForecast(latitude, longitude, days = 7, forceRefresh = false) {
    const key = cacheService.generateKey('forecast', { latitude, longitude, days })
    
    if (!forceRefresh && cacheService.has(key)) {

      return cacheService.get(key)
    }

    try {

      const data = await WeatherApiService.getRecentWeather(latitude, longitude, days)
      if (data) {
        cacheService.set(key, data, this.forecastTTL)
      }
      return data
    } catch (error) {
      console.error('获取预报数据失败:', error)
      const cachedData = cacheService.get(key)
      if (cachedData) {

        return cachedData
      }
      throw error
    }
  }

  async getHistoricalWeather(latitude, longitude, startDate, endDate, forceRefresh = false) {
    const key = cacheService.generateKey('historical', { latitude, longitude, startDate, endDate })
    
    if (!forceRefresh && cacheService.has(key)) {

      return cacheService.get(key)
    }

    try {

      const data = await WeatherApiService.getHistoricalWeather(latitude, longitude, startDate, endDate)
      if (data) {
        cacheService.set(key, data, this.forecastTTL) // 历史数据缓存时间长一些
      }
      return data
    } catch (error) {
      console.error('获取历史天气失败:', error)
      const cachedData = cacheService.get(key)
      if (cachedData) {

        return cachedData
      }
      throw error
    }
  }

  async getWeatherForDateRange(latitude, longitude, startDate, endDate, forceRefresh = false) {
    const key = cacheService.generateKey('date_range', { latitude, longitude, startDate, endDate })
    
    if (!forceRefresh && cacheService.has(key)) {

      return cacheService.get(key)
    }

    try {

      const data = await WeatherApiService.getEnhancedWeatherData(latitude, longitude, startDate, endDate)
      if (data) {
        cacheService.set(key, data, this.forecastTTL)
      }
      return data
    } catch (error) {
      console.error('获取日期范围天气失败:', error)
      const cachedData = cacheService.get(key)
      if (cachedData) {

        return cachedData
      }
      throw error
    }
  }

  clearWeatherCache() {
    cacheService.invalidateByType('current_weather')
    cacheService.invalidateByType('forecast')
    cacheService.invalidateByType('historical')
    cacheService.invalidateByType('date_range')

  }

  async refreshWeatherData(type, ...args) {
    switch (type) {
      case 'current':
        return this.getCurrentWeather(...args, true)
      case 'forecast':
        return this.getForecast(...args, true)
      case 'historical':
        return this.getHistoricalWeather(...args, true)
      case 'dateRange':
        return this.getWeatherForDateRange(...args, true)
      default:
        throw new Error(`未知的天气数据类型: ${type}`)
    }
  }
}

export const weatherService = new WeatherService()
export default weatherService
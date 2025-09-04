// 缓存功能测试工具
import { cacheService } from '../services/cacheService.js'
import { weatherService } from '../services/weatherService.js'
import { diaryService } from '../services/diaryService.js'
import { globalCacheManager } from '../services/globalCacheManager.js'

export class CacheTestUtils {
  // 测试基础缓存功能
  static testBasicCache() {
    console.log('=== 测试基础缓存功能 ===')
    
    // 测试设置和获取
    cacheService.set('test_key', { data: 'test_value' }, 5000)
    const result = cacheService.get('test_key')
    console.log('缓存设置和获取:', result)
    
    // 测试过期
    cacheService.set('expire_key', { data: 'expire_value' }, 1)
    setTimeout(() => {
      const expiredResult = cacheService.get('expire_key')
      console.log('过期缓存测试:', expiredResult === null ? '✓ 正确过期' : '✗ 过期失败')
    }, 10)
    
    // 测试缓存键生成
    const key1 = cacheService.generateKey('weather', { lat: 22.5, lon: 114.0 })
    const key2 = cacheService.generateKey('weather', { lon: 114.0, lat: 22.5 })
    console.log('缓存键一致性:', key1 === key2 ? '✓ 一致' : '✗ 不一致')
    
    console.log('基础缓存测试完成\n')
  }
  
  // 测试天气服务缓存
  static async testWeatherCache(latitude = 22.5429, longitude = 114.0596) {
    console.log('=== 测试天气服务缓存 ===')
    
    try {
      // 第一次请求（应该发起网络请求）
      console.time('首次天气请求')
      const weather1 = await weatherService.getCurrentWeather(latitude, longitude)
      console.timeEnd('首次天气请求')
      console.log('首次天气数据:', weather1?.current_weather?.temperature)
      
      // 第二次请求（应该使用缓存）
      console.time('缓存天气请求')
      const weather2 = await weatherService.getCurrentWeather(latitude, longitude)
      console.timeEnd('缓存天气请求')
      console.log('缓存天气数据:', weather2?.current_weather?.temperature)
      
      // 强制刷新请求
      console.time('强制刷新请求')
      const weather3 = await weatherService.getCurrentWeather(latitude, longitude, true)
      console.timeEnd('强制刷新请求')
      console.log('强制刷新数据:', weather3?.current_weather?.temperature)
      
    } catch (error) {
      console.error('天气缓存测试失败:', error)
    }
    
    console.log('天气服务缓存测试完成\n')
  }
  
  // 测试日记服务缓存
  static async testDiaryCache() {
    console.log('=== 测试日记服务缓存 ===')
    
    try {
      const testDate = new Date().toISOString().split('T')[0]
      
      // 第一次请求
      console.time('首次日记请求')
      const diary1 = await diaryService.getDiaryByDate(testDate)
      console.timeEnd('首次日记请求')
      console.log('首次日记数据:', diary1 ? '有数据' : '无数据')
      
      // 第二次请求（应该使用缓存）
      console.time('缓存日记请求')
      const diary2 = await diaryService.getDiaryByDate(testDate)
      console.timeEnd('缓存日记请求')
      console.log('缓存日记数据:', diary2 ? '有数据' : '无数据')
      
    } catch (error) {
      console.error('日记缓存测试失败:', error)
    }
    
    console.log('日记服务缓存测试完成\n')
  }
  
  // 测试全局缓存管理器
  static testGlobalCacheManager() {
    console.log('=== 测试全局缓存管理器 ===')
    
    // 获取缓存统计
    const stats = globalCacheManager.getCacheStats()
    console.log('缓存统计:', stats)
    
    // 测试智能清理
    globalCacheManager.smartCleanup()
    console.log('智能清理完成')
    
    console.log('全局缓存管理器测试完成\n')
  }
  
  // 运行所有测试
  static async runAllTests(latitude = 22.5429, longitude = 114.0596) {
    console.log('🚀 开始缓存系统测试...\n')
    
    this.testBasicCache()
    await this.testWeatherCache(latitude, longitude)
    await this.testDiaryCache()
    this.testGlobalCacheManager()
    
    console.log('✅ 所有缓存测试完成!')
  }
  
  // 性能对比测试
  static async performanceTest(latitude = 22.5429, longitude = 114.0596) {
    console.log('=== 性能对比测试 ===')
    
    try {
      // 清空缓存
      cacheService.clear()
      
      // 测试无缓存情况
      const times = []
      for (let i = 0; i < 3; i++) {
        const start = performance.now()
        await weatherService.getCurrentWeather(latitude, longitude, true) // 强制刷新
        const end = performance.now()
        times.push(end - start)
        await new Promise(resolve => setTimeout(resolve, 100)) // 避免请求过快
      }
      
      const avgTimeNoCache = times.reduce((a, b) => a + b, 0) / times.length
      console.log(`无缓存平均响应时间: ${avgTimeNoCache.toFixed(2)}ms`)
      
      // 测试有缓存情况
      const cachedTimes = []
      for (let i = 0; i < 5; i++) {
        const start = performance.now()
        await weatherService.getCurrentWeather(latitude, longitude) // 使用缓存
        const end = performance.now()
        cachedTimes.push(end - start)
      }
      
      const avgTimeCached = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length
      console.log(`有缓存平均响应时间: ${avgTimeCached.toFixed(2)}ms`)
      
      const improvement = ((avgTimeNoCache - avgTimeCached) / avgTimeNoCache * 100).toFixed(1)
      console.log(`性能提升: ${improvement}%`)
      
    } catch (error) {
      console.error('性能测试失败:', error)
    }
    
    console.log('性能对比测试完成\n')
  }
}

// 在浏览器控制台中可用的全局测试函数
if (typeof window !== 'undefined') {
  window.testCache = CacheTestUtils.runAllTests.bind(CacheTestUtils)
  window.testCachePerformance = CacheTestUtils.performanceTest.bind(CacheTestUtils)
  window.cacheStats = () => globalCacheManager.getCacheStats()
  window.clearCache = () => globalCacheManager.clearAllCache()
}
// 简化的缓存服务
class CacheService {
  constructor() {
    this.cache = new Map()
    this.ttlMap = new Map()
    this.maxSize = 1000
    
    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 60000) // 每分钟清理一次
  }

  generateKey(type, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {})
    return `${type}:${JSON.stringify(sortedParams)}`
  }

  set(key, data, ttl = 300000) { // 默认5分钟TTL
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    if (ttl > 0) {
      this.ttlMap.set(key, Date.now() + ttl)
    }
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    const ttl = this.ttlMap.get(key)
    if (ttl && Date.now() > ttl) {
      this.delete(key)
      return null
    }

    return item.data
  }

  delete(key) {
    this.cache.delete(key)
    this.ttlMap.delete(key)
  }

  clear() {
    this.cache.clear()
    this.ttlMap.clear()
  }

  cleanup() {
    const now = Date.now()
    for (const [key, expiry] of this.ttlMap.entries()) {
      if (now > expiry) {
        this.delete(key)
      }
    }
  }

  has(key) {
    return this.cache.has(key) && this.get(key) !== null
  }

  keys() {
    return Array.from(this.cache.keys())
  }

  invalidateByType(type) {
    const keysToDelete = this.keys().filter(key => key.startsWith(`${type}:`))
    keysToDelete.forEach(key => this.delete(key))
  }

  evictOldest() {
    const oldestKey = this.cache.keys().next().value
    if (oldestKey) {
      this.delete(oldestKey)
    }
  }
}

export const cacheService = new CacheService()
export default cacheService
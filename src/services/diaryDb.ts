export interface DiaryEntry {
  id: string
  date: string
  content: string
  weather: {
    temperature: {
      current: number
      min: number
      max: number
    }
    description: string
    icon: string
    precipitation: number
    windSpeed: number
    windDirection: string
    cloudCover: number
  }
  createdAt: number
  updatedAt: number
}

class DiaryDatabase {
  private dbName = '天气小鸭日记'
  private dbVersion = 1
  private storeName = '日记'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('无法打开日记数据库'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 创建日记存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('date', 'date', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  async saveDiary(date: string, content: string, weather: any): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const now = Date.now()
      const entry: DiaryEntry = {
        id: `diary_${date}`,
        date,
        content,
        weather: {
          temperature: weather.temperature,
          description: weather.description,
          icon: weather.icon,
          precipitation: weather.precipitation,
          windSpeed: weather.windSpeed,
          windDirection: weather.windDirection,
          cloudCover: weather.cloudCover
        },
        createdAt: now,
        updatedAt: now
      }

      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('保存日记失败'))
    })
  }

  async getDiary(date: string): Promise<DiaryEntry | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(`diary_${date}`)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => reject(new Error('读取日记失败'))
    })
  }

  async deleteDiary(date: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(`diary_${date}`)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('删除日记失败'))
    })
  }

  async getAllDiaries(): Promise<DiaryEntry[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const diaries = request.result || []
        // 按日期排序
        diaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(diaries)
      }
      request.onerror = () => reject(new Error('读取所有日记失败'))
    })
  }

  async hasDiary(date: string): Promise<boolean> {
    const diary = await this.getDiary(date)
    return !!diary
  }

  async clearAll(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('清空日记失败'))
    })
  }
}

// 导出单例实例
export const diaryDb = new DiaryDatabase()

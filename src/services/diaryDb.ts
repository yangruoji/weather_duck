import { supabase } from '../config/supabase'

export interface DiaryEntry {
  id: string
  date: string
  content: string
  image?: string
  images?: string[]
  mood?: string
  city?: string
  video?: string
  weather?: any
  createdAt?: number
  updatedAt?: number
}

interface CleanWeather {
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

const TABLE = 'weather_diaries'

function toString(value: any, defaultValue: string = ''): string {
  return value != null ? String(value) : defaultValue
}

function toNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

export class DiaryDatabase {
  private db: IDBDatabase | null = null
  private readonly dbName = 'WeatherDiaryDB'
  private readonly dbVersion = 1
  private readonly storeName = 'diaries'
  private isRemote = false

  constructor() {
    this.isRemote = !!supabase
  }

  private async initIDB(): Promise<void> {
    if (this.isRemote || this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(new Error('无法打开数据库'))
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('date', 'date', { unique: true })
        }
      }
    })
  }

  private cleanWeather(weather: any): CleanWeather | undefined {
    if (!weather) return undefined
    
    return {
      temperature: {
        current: toNumber(weather.temperature?.current),
        min: toNumber(weather.temperature?.min),
        max: toNumber(weather.temperature?.max)
      },
      description: toString(weather.description),
      icon: toString(weather.icon),
      precipitation: toNumber(weather.precipitation),
      windSpeed: toNumber(weather.windSpeed),
      windDirection: toString(weather.windDirection),
      cloudCover: toNumber(weather.cloudCover)
    }
  }

  private mapRowToDiary(row: any): DiaryEntry {
    if (!row) {
      throw new Error('数据行为空')
    }
    const createdAtMs = row?.created_at ? Date.parse(row.created_at) : toNumber(row?.createdAt, Date.now())
    const updatedAtMs = row?.updated_at ? Date.parse(row.updated_at) : toNumber(row?.updatedAt, Date.now())
    return {
      id: toString(row.id),
      date: toString(row.date),
      content: toString(row.content),
      weather: row.weather as CleanWeather,
      image: toString(row.image, ''),
      images: Array.isArray(row.images) ? row.images as string[] : [],
      mood: toString(row.mood, ''),
      city: toString(row.city, ''),
      video: toString(row.video, ''),
      createdAt: createdAtMs || Date.now(),
      updatedAt: updatedAtMs || Date.now()
    }
  }

  async saveDiary(
    date: string,
    content: string,
    weather?: any,
    image?: string,
    images?: string[],
    mood?: string,
    city?: string,
    video?: string
  ): Promise<DiaryEntry> {
    const id = `diary_${date}`
    const now = Date.now()
    const cleanWeather = this.cleanWeather(weather)

    if (this.isRemote && supabase) {
      const existing = await this.getDiary(date)
      
      // 处理图片数组
      const finalImages = images && images.length > 0 ? images : []
      if (image && image.trim()) {
        finalImages.unshift(image)
      }

      const diaryData = {
        id,
        date,
        content,
        weather_data: cleanWeather,
        images: finalImages,
        mood: mood || null,
        city: city || null,
        video: video || null,
        created_at: existing?.createdAt ? new Date(existing.createdAt).toISOString() : new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
      }

      const { data, error } = existing
        ? await supabase.from(TABLE).update(diaryData).eq('date', date).select().maybeSingle()
        : await supabase.from(TABLE).insert(diaryData).select().single()

      if (error) throw error
      if (!data) {
        throw new Error('Supabase操作未返回数据')
      }
      return this.mapRowToDiary(data)
    }

    // IndexedDB fallback
    if (!this.db) await this.initIDB()
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const diaryData = {
        id,
        date,
        content,
        weather: cleanWeather,
        image: image || '',
        images: images || [],
        mood: mood || '',
        city: city || '',
        video: video || '',
        createdAt: now,
        updatedAt: now
      }

      const request = store.put(diaryData)
      
      request.onsuccess = () => resolve(diaryData as DiaryEntry)
      request.onerror = () => reject(new Error('保存日记失败'))
    })
  }

  async getDiary(date: string): Promise<DiaryEntry | null> {
    const id = `diary_${date}`

    if (this.isRemote && supabase) {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('date', date)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return this.mapRowToDiary(data)
    }

    if (!this.db) await this.initIDB()
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)
      
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? this.mapRowToDiary(result) : null)
      }
      request.onerror = () => reject(new Error('获取日记失败'))
    })
  }

  async deleteDiary(date: string): Promise<void> {
    const id = `diary_${date}`

    if (this.isRemote && supabase) {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('date', date)

      if (error) throw error
      return
    }

    if (!this.db) await this.initIDB()
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('删除日记失败'))
    })
  }

  async getAllDiaries(): Promise<DiaryEntry[]> {
    if (this.isRemote && supabase) {
      const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false })
      if (error) throw error
      return (data || []).map((row) => this.mapRowToDiary(row))
    }

    if (!this.db) await this.initIDB()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const results = request.result || []
        const diaries = results.map(row => this.mapRowToDiary(row))
        diaries.sort((a, b) => b.date.localeCompare(a.date))
        resolve(diaries)
      }
      request.onerror = () => reject(new Error('获取所有日记失败'))
    })
  }

  async hasDiary(date: string): Promise<boolean> {
    const diary = await this.getDiary(date)
    return !!diary
  }

  async clearAll(): Promise<void> {
    if (this.isRemote && supabase) {
      const { error } = await supabase.from(TABLE).delete().neq('id', '')
      if (error) throw error
      return
    }

    if (!this.db) await this.initIDB()
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('清空数据库失败'))
    })
  }
}

export const diaryDb = new DiaryDatabase()
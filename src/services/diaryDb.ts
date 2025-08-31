import { supabase } from './supabaseClient'

export interface DiaryEntry {
  id: string
  date: string
  content: string
  image?: string
  images?: string[]
  mood?: string
  city?: string
  video?: string
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

type CleanWeather = DiaryEntry['weather']

function toNumber(n: any, def = 0): number {
  const v = Number(n)
  return Number.isFinite(v) ? v : def
}
function toString(s: any, def = ''): string {
  return typeof s === 'string' ? s : String(s ?? def)
}

function cleanWeatherObj(weather: any): CleanWeather {
  return {
    temperature: {
      current: toNumber(weather?.temperature?.current),
      min: toNumber(weather?.temperature?.min),
      max: toNumber(weather?.temperature?.max),
    },
    description: toString(weather?.description),
    icon: toString(weather?.icon),
    precipitation: toNumber(weather?.precipitation),
    windSpeed: toNumber(weather?.windSpeed),
    windDirection: toString(weather?.windDirection),
    cloudCover: toNumber(weather?.cloudCover),
  }
}

function randomId(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len)
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string; ext: string } {
  // data:[mime];base64,XXXX
  const [head, base64] = dataUrl.split(',')
  const match = /^data:(.+);base64$/i.exec(head || '')
  const mime = match ? match[1] : 'application/octet-stream'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'bin'
  return { blob, mime, ext }
}

const TABLE = 'diaries'
const BUCKET = 'diary-images'

class DiaryDatabase {
  // ========== Supabase 路径（优先） ==========
  private get isRemote() {
    return !!supabase
  }

  private async uploadIfDataUrl(id: string, src: string, index: number): Promise<string> {
    if (!this.isRemote) return src
    if (!src || !src.startsWith('data:')) return src

    const { blob, mime, ext } = dataUrlToBlob(src)
    const filePath = `${id}/${Date.now()}_${index}_${randomId()}.${ext}`
    const { error: upErr } = await supabase!.storage.from(BUCKET).upload(filePath, blob, {
      contentType: mime,
      cacheControl: '3600',
      upsert: false,
    })
    if (upErr) throw upErr
    const { data } = supabase!.storage.from(BUCKET).getPublicUrl(filePath)
    return data.publicUrl
  }

  private async ensureImagesUploaded(id: string, imgs?: string[]): Promise<string[]> {
    const list = imgs ?? []
    const out: string[] = []
    for (let i = 0; i < list.length; i++) {
      out.push(await this.uploadIfDataUrl(id, list[i], i))
    }
    return out
  }

  private mapRowToDiary(row: any): DiaryEntry {
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
      updatedAt: updatedAtMs || Date.now(),
    }
  }

  // ========== IndexedDB 回退实现 ==========
  private dbName = '天气小鸭日记'
  private dbVersion = 1
  private storeName = '日记'
  private db: IDBDatabase | null = null

  private async initIDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      request.onerror = () => reject(new Error('无法打开日记数据库'))
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('date', 'date', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  // ========== 对外 API（自动选择 Supabase 或 IndexedDB） ==========
  async saveDiary(date: string, content: string, weather: any, image?: string, images?: string[], mood?: string, city?: string, video?: string): Promise<void> {
    const id = `diary_${date}`
    const now = Date.now()
    const cleanWeather = cleanWeatherObj(weather)

    if (this.isRemote) {
      // 读取现有记录（用于保留未变更的图片）
      let existing: DiaryEntry | null = null
      try {
        existing = await this.getDiary(date)
      } catch {}

      // 处理图片：如果未传 images 则保留旧值；直接将 dataURL 存入数据库（不使用对象存储）
      const savedImages = images === undefined ? (existing?.images ?? []) : [...images]

      let cover = image === undefined ? (existing?.image ?? (savedImages[0] || '')) : image

      const row = {
        id,
        date,
        content: toString(content),
        weather: cleanWeather as any,
        image: cover || '',
        images: savedImages,
        mood: mood === undefined ? (existing?.mood ?? '') : mood,
        city: city === undefined ? (existing?.city ?? '') : city,
        video: video === undefined ? (existing?.video ?? '') : video,
        created_at: existing?.createdAt ? new Date(existing.createdAt).toISOString() : new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      }

      const { error } = await supabase!.from(TABLE).upsert(row, { onConflict: 'id' })
      if (error) throw error
      return
    }

    // 回退：IndexedDB
    if (!this.db) await this.initIDB()
    // 保留已有图片与创建时间（当未提供新图时）
    let existing: DiaryEntry | null = null
    try {
      existing = await this.getDiary(date)
    } catch {}
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }
      const tx = this.db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const entry: DiaryEntry = {
        id,
        date,
        content: toString(content),
        weather: cleanWeather,
        image: image === undefined ? (existing?.image ?? '') : image,
        images: images === undefined ? (existing?.images ?? []) : [...images],
        mood: mood === undefined ? (existing?.mood ?? '') : mood,
        city: city === undefined ? (existing?.city ?? '') : city,
        video: video === undefined ? (existing?.video ?? '') : video,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const req = store.put(entry)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(new Error('保存日记失败'))
    })
  }

  async getDiary(date: string): Promise<DiaryEntry | null> {
    const id = `diary_${date}`
    if (this.isRemote) {
      const { data, error } = await supabase!.from(TABLE).select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? this.mapRowToDiary(data) : null
    }

    if (!this.db) await this.initIDB()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }
      const tx = this.db.transaction([this.storeName], 'readonly')
      const store = tx.objectStore(this.storeName)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(new Error('读取日记失败'))
    })
  }

  async deleteDiary(date: string): Promise<void> {
    const id = `diary_${date}`
    if (this.isRemote) {
      const { error } = await supabase!.from(TABLE).delete().eq('id', id)
      if (error) throw error
      // 简化：暂不清理已上传的图片文件
      return
    }

    if (!this.db) await this.initIDB()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }
      const tx = this.db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(new Error('删除日记失败'))
    })
  }

  async getAllDiaries(): Promise<DiaryEntry[]> {
    if (this.isRemote) {
      const { data, error } = await supabase!.from(TABLE).select('*').order('date', { ascending: false })
      if (error) throw error
      return (data || []).map((row) => this.mapRowToDiary(row))
    }

    if (!this.db) await this.initIDB()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }
      const tx = this.db.transaction([this.storeName], 'readonly')
      const store = tx.objectStore(this.storeName)
      const req = store.getAll()
      req.onsuccess = () => {
        const diaries = (req.result || []) as DiaryEntry[]
        diaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(diaries)
      }
      req.onerror = () => reject(new Error('读取所有日记失败'))
    })
  }

  async hasDiary(date: string): Promise<boolean> {
    const diary = await this.getDiary(date)
    return !!diary
  }

  async clearAll(): Promise<void> {
    if (this.isRemote) {
      const { error } = await supabase!.from(TABLE).delete().neq('id', '')
      if (error) throw error
      return
    }

    if (!this.db) await this.initIDB()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }
      const tx = this.db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(new Error('清空日记失败'))
    })
  }
}

// 导出单例实例
export const diaryDb = new DiaryDatabase()
import { supabase, STORAGE_BUCKETS } from '../config/supabase'

/**
 * Supabase存储服务 - 优化版本
 * 支持批量上传、用户隔离、更好的错误处理
 */
export class SupabaseStorageService {
  
  /**
   * 上传图片文件 - 支持用户隔离和进度回调
   */
  static async uploadImage(
    file: File, 
    fileName?: string, 
    userId?: string,
    _onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // 如果提供了用户ID，则在路径中包含用户文件夹
      const filePath = userId ? `${userId}/${finalFileName}` : finalFileName
      
      const { data, error } = await supabase!.storage
        .from(STORAGE_BUCKETS.IMAGES)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('图片上传失败:', error)
        throw error
      }

      // 获取公共URL
      const { data: urlData } = supabase!.storage
        .from(STORAGE_BUCKETS.IMAGES)
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (error) {
      console.error('上传图片时发生错�?', error)
      throw error
    }
  }

  /**
   * 批量上传图片 - 支持进度回调
   */
  static async uploadImages(
    files: File[], 
    userId?: string,
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ): Promise<string[]> {
    try {
      const successUrls: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const url = await this.uploadImage(
            file, 
            undefined, 
            userId,
            (progress) => onProgress?.(i, progress, file.name)
          )
          successUrls.push(url)
        } catch (error) {
          console.error(`上传图片 ${file.name} 失败:`, error)
          // 继续上传其他文件
        }
      }
      
      return successUrls
    } catch (error) {
      console.error('批量上传图片失败:', error)
      throw error
    }
  }

  /**
   * 上传视频文件 - 支持用户隔离和进度回调
   */
  static async uploadVideo(
    file: File, 
    fileName?: string, 
    userId?: string,
    _onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // 如果提供了用户ID，则在路径中包含用户文件夹
      const filePath = userId ? `${userId}/${finalFileName}` : finalFileName
      
      const { data, error } = await supabase!.storage
        .from(STORAGE_BUCKETS.VIDEOS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('视频上传失败:', error)
        throw error
      }

      // 获取公共URL
      const { data: urlData } = supabase!.storage
        .from(STORAGE_BUCKETS.VIDEOS)
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (error) {
      console.error('上传视频时发生错�?', error)
      throw error
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(url: string): Promise<boolean> {
    try {
      // 从URL中提取文件路径和桶名
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      // 判断是图片还是视�?
      const isImage = url.includes(STORAGE_BUCKETS.IMAGES)
      const bucket = isImage ? STORAGE_BUCKETS.IMAGES : STORAGE_BUCKETS.VIDEOS
      
      const { error } = await supabase!.storage
        .from(bucket)
        .remove([fileName])

      if (error) {
        console.error('删除文件失败:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('删除文件时发生错�?', error)
      return false
    }
  }

  /**
   * 批量上传视频 - 支持进度回调
   */
  static async uploadVideos(
    files: File[], 
    userId?: string,
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ): Promise<string[]> {
    try {
      const successUrls: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const url = await this.uploadVideo(
            file, 
            undefined, 
            userId,
            (progress) => onProgress?.(i, progress, file.name)
          )
          successUrls.push(url)
        } catch (error) {
          console.error(`上传视频 ${file.name} 失败:`, error)
          // 继续上传其他文件
        }
      }
      
      return successUrls
    } catch (error) {
      console.error('批量上传视频失败:', error)
      throw error
    }
  }

  /**
   * 批量删除文件
   */
  static async deleteFiles(urls: string[]): Promise<boolean> {
    try {
      const deletePromises = urls.map(url => this.deleteFile(url))
      await Promise.all(deletePromises)
      return true
    } catch (error) {
      console.error('批量删除文件失败:', error)
      return false
    }
  }
}

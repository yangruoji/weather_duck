# Supabase 存储优化使用指南

## 概述

本指南说明如何正确配置和使用优化后的 Supabase 存储系统，确保图片和视频文件正确上传到 Storage，而数据库只存储文件 URL。

## 数据库表结构

### weather_diaries 表结构
```sql
CREATE TABLE weather_diaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weather_data JSONB,
  content TEXT,
  mood VARCHAR(50),
  city VARCHAR(100),
  images TEXT[],  -- 存储图片URL数组
  videos TEXT[],  -- 存储视频URL数组
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**重要说明**：
- `images` 字段存储的是图片 URL 字符串数组，不是 base64 数据
- `videos` 字段存储的是视频 URL 字符串数组，不是 base64 数据
- 实际文件存储在 Supabase Storage 的对应桶中
- 支持多个视频上传和存储（最多5个）

## Storage 桶配置

### 1. 创建存储桶

在 Supabase Dashboard 中创建以下存储桶：

```sql
-- 在 Supabase SQL 编辑器中执行
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('diary-images', 'diary-images', true),
  ('diary-videos', 'diary-videos', true)
ON CONFLICT (id) DO NOTHING;
```

### 2. 设置存储策略

```sql
-- 图片桶策略
CREATE POLICY "Users can upload their own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'diary-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'diary-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'diary-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 视频桶策略（类似图片桶）
CREATE POLICY "Users can upload their own videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'diary-videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'diary-videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'diary-videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 文件上传流程

### 1. 组件使用

使用优化后的 `OptimizedWeatherDiaryEdit.vue` 组件：

```vue
<template>
  <OptimizedWeatherDiaryEdit 
    :visible="showDialog"
    :weather="selectedWeather"
    @update:visible="showDialog = $event"
    @saved="handleDiarySaved"
  />
</template>
```

### 2. 上传流程

组件内部的上传流程：

1. **选择文件**：用户选择图片或视频文件
2. **预览文件**：显示文件预览和基本信息
3. **上传文件**：
   - 图片上传到 `diary-images` 桶
   - 视频上传到 `diary-videos` 桶
   - 显示上传进度
4. **保存日记**：将文件 URL 保存到数据库
5. **完成**：显示保存成功状态

### 3. 进度显示

上传过程中会显示：
- 总体进度条
- 每个文件的详细进度
- 当前操作状态（上传图片/视频/保存数据）

## 文件存储结构

### 存储路径规则

```
diary-images/
├── user-123/
│   ├── 1693497600000-abc123.jpg
│   ├── 1693497601000-def456.png
│   └── ...
├── user-456/
│   └── ...

diary-videos/
├── user-123/
│   ├── 1693497600000-xyz789.mp4
│   └── ...
├── user-456/
│   └── ...
```

### URL 格式

上传成功后的 URL 格式：
```
https://your-project.supabase.co/storage/v1/object/public/diary-images/user-123/1693497600000-abc123.jpg
https://your-project.supabase.co/storage/v1/object/public/diary-videos/user-123/1693497600000-xyz789.mp4
```

## 数据库迁移

### 执行迁移脚本

```bash
# 在 Supabase SQL 编辑器中执行
\i src/migrations/optimize_weather_diaries.sql
```

### 数据迁移（如果需要）

如果现有数据使用 base64 存储，需要迁移：

```sql
-- 备份现有数据
CREATE TABLE weather_diaries_backup AS SELECT * FROM weather_diaries;

-- 清理 base64 数据（可选，如果要完全迁移到 Storage）
UPDATE weather_diaries 
SET images = NULL, video = NULL 
WHERE images IS NOT NULL OR video IS NOT NULL;
```

## 性能优化

### 1. 文件大小限制

```typescript
// 在上传前检查文件大小
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

if (file.size > MAX_IMAGE_SIZE) {
  throw new Error('图片文件不能超过 5MB');
}
```

### 2. 文件类型验证

```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/mov'];

if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
  throw new Error('不支持的图片格式');
}
```

### 3. 批量上传优化

```typescript
// 并发上传，但限制并发数
const CONCURRENT_UPLOADS = 3;
const chunks = chunkArray(files, CONCURRENT_UPLOADS);

for (const chunk of chunks) {
  await Promise.all(chunk.map(file => uploadFile(file)));
}
```

## 错误处理

### 常见错误及解决方案

1. **上传失败**
   ```typescript
   try {
     const url = await SupabaseStorageService.uploadImage(file);
   } catch (error) {
     if (error.message.includes('File size too large')) {
       // 文件过大处理
     } else if (error.message.includes('Invalid file type')) {
       // 文件类型错误处理
     }
   }
   ```

2. **权限错误**
   - 检查 RLS 策略是否正确配置
   - 确认用户已登录且有权限

3. **网络错误**
   - 实现重试机制
   - 提供离线缓存功能

## 监控和维护

### 1. 存储使用量监控

```sql
-- 查询存储使用情况
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_size
FROM storage.objects 
GROUP BY bucket_id;
```

### 2. 清理无效文件

```sql
-- 查找数据库中不存在的文件引用
SELECT name FROM storage.objects 
WHERE bucket_id = 'diary-images'
AND name NOT IN (
  SELECT unnest(images) FROM weather_diaries 
  WHERE images IS NOT NULL
);
```

### 3. 性能监控

- 监控上传成功率
- 跟踪平均上传时间
- 记录错误日志

## 安全考虑

### 1. 文件验证

- 验证文件类型和大小
- 扫描恶意文件
- 限制上传频率

### 2. 访问控制

- 用户只能访问自己的文件
- 实现细粒度权限控制
- 定期审查访问日志

### 3. 数据备份

- 定期备份存储数据
- 实现跨区域复制
- 测试恢复流程

## 总结

通过这个优化方案：

1. **存储分离**：文件存储在 Storage，数据库只存 URL
2. **性能提升**：减少数据库负载，提高查询速度
3. **用户体验**：实时进度显示，更好的错误处理
4. **安全性**：完善的权限控制和数据隔离
5. **可扩展性**：支持大规模文件存储和管理

这个方案为天气日记应用提供了稳定、高效、安全的文件存储解决方案。
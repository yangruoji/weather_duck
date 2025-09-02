# Supabase 设置指南

## 1. 创建Supabase项目

1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 记录项目URL和API密钥

## 2. 环境变量配置

创建 `.env` 文件并添加以下配置：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. 数据库表结构

应用会自动创建以下表：

### weather_diaries 表
```sql
CREATE TABLE weather_diaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weather_data JSONB,
  content TEXT,
  mood VARCHAR(50),
  city VARCHAR(100),
  images TEXT[],
  video TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. 存储桶

应用会自动创建以下存储桶：

- `diary-images`: 存储日记图片
- `diary-videos`: 存储日记视频

## 5. 权限设置

为了简化开发，当前使用的是开放权限策略。生产环境中建议：

1. 启用用户认证
2. 设置行级安全策略(RLS)
3. 限制存储桶访问权限

## 6. API功能

### 日记CRUD操作
- `SupabaseDiaryService.getDiary(date)` - 获取指定日期的日记
- `SupabaseDiaryService.saveDiary(diary)` - 保存或更新日记
- `SupabaseDiaryService.deleteDiary(date)` - 删除日记
- `SupabaseDiaryService.getDiariesInRange(start, end)` - 获取日期范围内的日记
- `SupabaseDiaryService.searchDiaries(keyword)` - 搜索日记内容

### 文件存储操作
- `SupabaseStorageService.uploadImage(file)` - 上传图片
- `SupabaseStorageService.uploadVideo(file)` - 上传视频
- `SupabaseStorageService.deleteFile(url)` - 删除文件

## 7. 数据迁移

如果需要从IndexedDB迁移数据到Supabase，可以创建迁移脚本：

```typescript
import { diaryDb } from './services/diaryDb'
import { SupabaseDiaryService } from './services/supabaseDiary'

async function migrateData() {
  const localDiaries = await diaryDb.getAllDiaries()
  
  for (const diary of localDiaries) {
    await SupabaseDiaryService.saveDiary({
      date: diary.date,
      weather_data: diary.weather,
      content: diary.content,
      mood: diary.mood,
      city: diary.city,
      images: diary.images,
      video: diary.video
    })
  }
}
```

## 8. 性能优化建议

1. 使用CDN加速文件访问
2. 启用数据库连接池
3. 合理设置缓存策略
4. 使用数据库索引优化查询

## 9. 安全建议

1. 启用RLS（行级安全）
2. 设置适当的存储桶策略
3. 使用JWT认证
4. 定期轮换API密钥
5. 监控异常访问
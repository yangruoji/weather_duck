-- 优化天气日记表结构
-- 确保文件只存储URL，实际文件存储在Supabase Storage中

-- 删除旧表（如果需要重新创建）
-- DROP TABLE IF EXISTS weather_diaries CASCADE;

-- 创建优化的天气日记表
CREATE TABLE IF NOT EXISTS weather_diaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weather_data JSONB,
  content TEXT,
  mood VARCHAR(50),
  city VARCHAR(100),
  images TEXT[], -- 存储图片URL数组（来自Supabase Storage）
  videos TEXT[], -- 存储视频URL数组（来自Supabase Storage）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在但结构不对，修改列类型
DO $$ 
BEGIN
  -- 确保images列是TEXT[]类型而不是JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weather_diaries' 
    AND column_name = 'images' 
    AND data_type != 'ARRAY'
  ) THEN
    ALTER TABLE weather_diaries ALTER COLUMN images TYPE TEXT[] USING 
      CASE 
        WHEN images::text = 'null' OR images IS NULL THEN NULL
        WHEN images::text LIKE '[%]' THEN 
          ARRAY(SELECT json_array_elements_text(images::json))
        ELSE ARRAY[images::text]
      END;
  END IF;
  
  -- 将video列重命名为videos并改为TEXT[]类型
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weather_diaries' 
    AND column_name = 'video'
  ) THEN
    -- 先重命名列
    ALTER TABLE weather_diaries RENAME COLUMN video TO videos;
    -- 然后改变类型为TEXT[]
    ALTER TABLE weather_diaries ALTER COLUMN videos TYPE TEXT[] USING 
      CASE 
        WHEN videos IS NULL OR videos = '' THEN NULL
        ELSE ARRAY[videos]
      END;
  END IF;
  
  -- 如果videos列不存在，创建它
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weather_diaries' 
    AND column_name = 'videos'
  ) THEN
    ALTER TABLE weather_diaries ADD COLUMN videos TEXT[];
  END IF;
END $$;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_weather_diaries_date ON weather_diaries(date);
CREATE INDEX IF NOT EXISTS idx_weather_diaries_city ON weather_diaries(city);
CREATE INDEX IF NOT EXISTS idx_weather_diaries_mood ON weather_diaries(mood);
CREATE INDEX IF NOT EXISTS idx_weather_diaries_created_at ON weather_diaries(created_at);

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_weather_diaries_content_search 
ON weather_diaries USING gin(to_tsvector('english', content));

-- 创建复合索引用于日期范围查询
CREATE INDEX IF NOT EXISTS idx_weather_diaries_date_range 
ON weather_diaries(date, created_at);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_weather_diaries_updated_at ON weather_diaries;
CREATE TRIGGER update_weather_diaries_updated_at
    BEFORE UPDATE ON weather_diaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加约束确保日期格式正确
ALTER TABLE weather_diaries 
ADD CONSTRAINT check_date_format 
CHECK (date::text ~ '^\d{4}-\d{2}-\d{2}$');

-- 添加约束确保图片和视频URL格式正确
ALTER TABLE weather_diaries 
DROP CONSTRAINT IF EXISTS check_images_format,
ADD CONSTRAINT check_images_format 
CHECK (
  images IS NULL OR 
  (array_length(images, 1) IS NULL OR 
   array_length(images, 1) <= 10) -- 最多10张图片
);

ALTER TABLE weather_diaries 
ADD CONSTRAINT check_videos_format 
CHECK (
  videos IS NULL OR 
  (array_length(videos, 1) IS NULL OR 
   array_length(videos, 1) <= 5) -- 最多5个视频
);

-- 创建存储桶策略（需要在Supabase Dashboard中执行）
-- 这些策略确保用户只能访问自己的文件

/*
-- 在Supabase Dashboard的SQL编辑器中执行以下策略：

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('diary-images', 'diary-images', true),
       ('diary-videos', 'diary-videos', true)
ON CONFLICT (id) DO NOTHING;

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

-- 视频桶策略
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
*/

-- 创建视图用于统计查询优化
CREATE OR REPLACE VIEW weather_diary_stats AS
SELECT 
  DATE_TRUNC('month', date) as month,
  COUNT(*) as diary_count,
  COUNT(CASE WHEN images IS NOT NULL AND array_length(images, 1) > 0 THEN 1 END) as diaries_with_images,
  COUNT(CASE WHEN video IS NOT NULL AND video != '' THEN 1 END) as diaries_with_videos,
  array_agg(DISTINCT mood) FILTER (WHERE mood IS NOT NULL) as moods,
  array_agg(DISTINCT city) FILTER (WHERE city IS NOT NULL) as cities
FROM weather_diaries
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- 创建函数用于批量查询优化
CREATE OR REPLACE FUNCTION get_diaries_by_dates(date_list DATE[])
RETURNS TABLE (
  id UUID,
  date DATE,
  weather_data JSONB,
  content TEXT,
  mood VARCHAR(50),
  city VARCHAR(100),
  images TEXT[],
  video TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wd.id,
    wd.date,
    wd.weather_data,
    wd.content,
    wd.mood,
    wd.city,
    wd.images,
    wd.video,
    wd.created_at,
    wd.updated_at
  FROM weather_diaries wd
  WHERE wd.date = ANY(date_list)
  ORDER BY wd.date;
END;
$$ LANGUAGE plpgsql;

-- 创建函数用于全文搜索
CREATE OR REPLACE FUNCTION search_diaries(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  date DATE,
  weather_data JSONB,
  content TEXT,
  mood VARCHAR(50),
  city VARCHAR(100),
  images TEXT[],
  video TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wd.id,
    wd.date,
    wd.weather_data,
    wd.content,
    wd.mood,
    wd.city,
    wd.images,
    wd.video,
    wd.created_at,
    wd.updated_at,
    ts_rank(to_tsvector('english', COALESCE(wd.content, '') || ' ' || COALESCE(wd.city, '') || ' ' || COALESCE(wd.mood, '')), 
            plainto_tsquery('english', search_term)) as rank
  FROM weather_diaries wd
  WHERE to_tsvector('english', COALESCE(wd.content, '') || ' ' || COALESCE(wd.city, '') || ' ' || COALESCE(wd.mood, ''))
        @@ plainto_tsquery('english', search_term)
  ORDER BY rank DESC, wd.date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE weather_diaries IS '天气日记表 - 优化版本，文件存储在Supabase Storage中';
COMMENT ON COLUMN weather_diaries.images IS '图片URL数组，实际文件存储在diary-images桶中';
COMMENT ON COLUMN weather_diaries.videos IS '视频URL数组，实际文件存储在diary-videos桶中';
COMMENT ON COLUMN weather_diaries.weather_data IS 'JSON格式的天气数据';
COMMENT ON FUNCTION get_diaries_by_dates IS '批量查询指定日期的日记，用于日历优化';
COMMENT ON FUNCTION search_diaries IS '全文搜索日记内容，支持排序';
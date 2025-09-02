-- 在Supabase Dashboard的SQL编辑器中执行此脚本

-- 删除现有表（如果存在）
DROP TABLE IF EXISTS weather_diaries;

-- 创建天气日记表
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

-- 创建索引
CREATE INDEX idx_weather_diaries_date ON weather_diaries(date);
CREATE INDEX idx_weather_diaries_city ON weather_diaries(city);
CREATE INDEX idx_weather_diaries_created_at ON weather_diaries(created_at);

-- 启用RLS
ALTER TABLE weather_diaries ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（允许所有操作）
CREATE POLICY "Enable all access for all users" ON weather_diaries FOR ALL USING (true);

-- 验证表创建成功
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weather_diaries' 
ORDER BY ordinal_position;
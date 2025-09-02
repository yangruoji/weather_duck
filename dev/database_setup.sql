-- Weather Duck 数据库表创建脚本
-- 请在 Supabase Dashboard > SQL Editor 中执行此脚本

-- 创建天气日记表
CREATE TABLE IF NOT EXISTS weather_diaries (
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

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weather_diaries_updated_at 
  BEFORE UPDATE ON weather_diaries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_weather_diaries_date ON weather_diaries(date);
CREATE INDEX IF NOT EXISTS idx_weather_diaries_city ON weather_diaries(city);
CREATE INDEX IF NOT EXISTS idx_weather_diaries_mood ON weather_diaries(mood);

-- 启用行级安全策略 (RLS)
ALTER TABLE weather_diaries ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有操作（开发环境用，生产环境需要更严格的权限控制）
CREATE POLICY IF NOT EXISTS "Allow all operations" ON weather_diaries
  FOR ALL USING (true) WITH CHECK (true);

-- 创建存储桶（如果需要文件上传功能）
-- 注意：这些命令需要在 Supabase Dashboard > Storage 中手动创建
-- INSERT INTO storage.buckets (id, name, public) VALUES ('diary-images', 'diary-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('diary-videos', 'diary-videos', true);
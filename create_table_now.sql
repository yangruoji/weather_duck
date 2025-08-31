-- 立即执行此SQL创建数据库表
-- 复制到 Supabase Dashboard > SQL Editor

DROP TABLE IF EXISTS weather_diaries CASCADE;

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

CREATE INDEX idx_weather_diaries_date ON weather_diaries(date);
ALTER TABLE weather_diaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON weather_diaries FOR ALL USING (true);
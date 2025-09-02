-- 快速创建表的最小SQL脚本
-- 复制以下内容到 Supabase Dashboard > SQL Editor 并执行

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

ALTER TABLE weather_diaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON weather_diaries FOR ALL USING (true);
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_weather_diaries_date ON weather_diaries(date);
CREATE INDEX IF NOT EXISTS idx_weather_diaries_city ON weather_diaries(city);
CREATE INDEX IF NOT EXISTS idx_weather_diaries_created_at ON weather_diaries(created_at);

-- 启用RLS
ALTER TABLE weather_diaries ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Enable read access for all users" ON weather_diaries FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON weather_diaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON weather_diaries FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON weather_diaries FOR DELETE USING (true);
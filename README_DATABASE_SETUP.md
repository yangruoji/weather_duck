# 数据库设置说明

## 问题
如果你看到以下错误：
```
Could not find the 'city' column of 'weather_diaries' in the schema cache
```

这意味着Supabase数据库中还没有创建必要的表。

## 解决方案

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目 `weather_duck`
3. 点击左侧菜单的 "SQL Editor"
4. 复制并执行 `setup_database.sql` 文件中的内容

## 验证
执行SQL后，你应该能看到：
- `weather_diaries` 表已创建
- 包含所有必要的列：id, date, weather_data, content, mood, city, images, video
- RLS策略已启用

## 备选方案
如果Supabase有问题，应用会自动回退到本地存储（IndexedDB），数据仍然会被保存在浏览器中。
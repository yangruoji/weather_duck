# 天气小鸭 - Supabase云存储设置指南

## 📋 概述

天气小鸭应用支持两种存储模式：
- **本地存储模式**：使用浏览器IndexedDB，无需配置
- **云存储模式**：使用Supabase云数据库和文件存储

## 🚀 快速开始（本地模式）

应用默认使用本地存储，无需任何配置即可使用所有功能：
- ✅ 记录天气日记
- ✅ 上传图片和视频
- ✅ 数据本地保存
- ✅ 完整的CRUD操作

## ☁️ 升级到云存储模式

### 步骤1：创建Supabase项目

1. 访问 [Supabase官网](https://supabase.com)
2. 注册账号并登录
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - **Name**: weather-duck（或您喜欢的名称）
   - **Database Password**: 设置一个强密码
   - **Region**: 选择离您最近的区域
5. 等待项目创建完成（约2分钟）

### 步骤2：获取配置信息

1. 进入项目仪表板
2. 点击左侧菜单 **Settings** > **API**
3. 复制以下信息：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: 以 `eyJhbGciOiJIUzI1NiI...` 开头的长字符串

### 步骤3：配置环境变量

1. 复制项目根目录的 `.env.example` 文件为 `.env`
2. 编辑 `.env` 文件，填入您的配置：

```env
# 替换为您的实际Supabase信息
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

### 步骤4：重启应用

```bash
# 停止开发服务器（Ctrl+C）
# 重新启动
npm run dev
```

## 🔧 自动初始化

配置完成后，应用会自动：
- ✅ 创建 `weather_diaries` 数据表
- ✅ 创建 `diary-images` 和 `diary-videos` 存储桶
- ✅ 设置行级安全策略（RLS）
- ✅ 迁移现有本地数据（可选）

## 📊 功能对比

| 功能 | 本地存储模式 | 云存储模式 |
|------|-------------|-----------|
| 天气日记 | ✅ | ✅ |
| 图片上传 | ✅ (Base64) | ✅ (云存储) |
| 视频上传 | ✅ (Base64) | ✅ (云存储) |
| 数据同步 | ❌ | ✅ |
| 跨设备访问 | ❌ | ✅ |
| 数据备份 | ❌ | ✅ |
| 存储限制 | 浏览器限制 | 500MB免费 |

## 🛠️ 故障排除

### 问题1：网络连接错误
**现象**：控制台显示 `net::ERR_NAME_NOT_RESOLVED`
**解决**：检查 `.env` 文件中的 `VITE_SUPABASE_URL` 是否正确

### 问题2：认证失败
**现象**：控制台显示 `Invalid API key`
**解决**：检查 `.env` 文件中的 `VITE_SUPABASE_ANON_KEY` 是否正确

### 问题3：数据表不存在
**现象**：控制台显示 `relation "weather_diaries" does not exist`
**解决**：应用会自动创建表，如果失败请检查Supabase项目权限

## 💡 提示

1. **免费额度**：Supabase提供慷慨的免费额度，足够个人使用
2. **数据安全**：所有数据都有行级安全策略保护
3. **自动备份**：Supabase自动备份您的数据
4. **随时切换**：可以随时在本地和云存储模式间切换

## 📞 支持

如果遇到问题，请：
1. 检查浏览器控制台的错误信息
2. 确认Supabase项目状态正常
3. 验证环境变量配置正确
4. 重启开发服务器

---

**天气小鸭团队** 🦆
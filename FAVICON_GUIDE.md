# Favicon 生成指南

## 已创建的文件

1. **favicon.svg** - 现代浏览器使用的SVG格式图标
2. **apple-touch-icon.svg** - Apple设备使用的触摸图标
3. **site.webmanifest** - PWA应用清单文件

## 如何生成其他格式

### 方法1：使用在线工具
推荐使用 [favicon.io](https://favicon.io/) 或 [realfavicongenerator.net](https://realfavicongenerator.net/)

1. 上传 `public/weather_duck_logo.png` 原始文件
2. 生成完整的favicon包
3. 下载并替换public目录中的文件

### 方法2：使用命令行工具

如果你有ImageMagick或其他图像处理工具：

```bash
# 生成16x16的ICO文件
convert weather_duck_logo.png -resize 16x16 favicon.ico

# 生成32x32的PNG文件
convert weather_duck_logo.png -resize 32x32 favicon-32x32.png

# 生成16x16的PNG文件
convert weather_duck_logo.png -resize 16x16 favicon-16x16.png

# 生成180x180的Apple Touch图标
convert weather_duck_logo.png -resize 180x180 apple-touch-icon.png
```

### 方法3：使用Photoshop/GIMP
1. 打开原始logo文件
2. 调整尺寸到所需大小
3. 导出为相应格式

## 建议的完整favicon文件列表

```
public/
├── favicon.ico          # 16x16, 32x32 (传统格式)
├── favicon.svg          # 矢量格式 (已创建)
├── favicon-16x16.png    # 16x16 PNG
├── favicon-32x32.png    # 32x32 PNG
├── apple-touch-icon.png # 180x180 PNG
├── apple-touch-icon.svg # 180x180 SVG (已创建)
└── site.webmanifest     # PWA清单 (已创建)
```

## HTML配置

index.html中已经包含了基本的favicon配置。如果生成了PNG格式的文件，可以添加：

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

## 当前状态

✅ SVG格式favicon已创建并配置
✅ Apple Touch图标已创建
✅ PWA清单文件已创建
✅ HTML配置已更新
⏳ 需要手动生成ICO和PNG格式文件（可选）
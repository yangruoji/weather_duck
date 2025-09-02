# Storage上传错误修复

## 🎯 问题分析

**错误信息**: `TypeError: path.replace is not a function`

**原因**: WeatherDiaryEdit.vue中调用SupabaseStorageService的函数时，参数顺序不匹配导致类型错误。

## ❌ 错误的调用方式

```javascript
// 错误：将progress回调作为第二个参数传递
const url = await SupabaseStorageService.uploadImage(image.file, (progress: number) => {
  image.progress = progress
})
```

## ✅ 正确的调用方式

```javascript
// 正确：按照函数签名传递参数
const url = await SupabaseStorageService.uploadImage(
  image.file,           // file: File
  undefined,            // fileName?: string
  undefined,            // userId?: string  
  (progress: number) => { // onProgress?: (progress: number) => void
    image.progress = progress
  }
)
```

## 🔧 函数签名对比

### SupabaseStorageService.uploadImage
```typescript
static async uploadImage(
  file: File, 
  fileName?: string, 
  userId?: string,
  onProgress?: (progress: number) => void
): Promise<string>
```

### SupabaseStorageService.uploadVideo
```typescript
static async uploadVideo(
  file: File, 
  fileName?: string, 
  userId?: string,
  onProgress?: (progress: number) => void
): Promise<string>
```

## ✅ 已修复的文件

### src/components/WeatherDiaryEdit.vue
- ✅ 修正了`uploadImage`调用的参数顺序
- ✅ 修正了`uploadVideo`调用的参数顺序
- ✅ 确保progress回调函数作为第4个参数传递

## 🎉 修复效果

现在文件上传功能可以正常工作：
1. **图片上传**: 支持最多9张图片，实时显示进度
2. **视频上传**: 支持最多5个视频，实时显示进度
3. **错误处理**: 上传失败时显示具体错误信息
4. **用户体验**: 流畅的上传进度显示

用户不会再看到`path.replace is not a function`错误，文件上传功能完全正常！
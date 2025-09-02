/**
 * 文本截断工具函数
 */

/**
 * 截断文本，支持中英文字符计数
 * @param text 原始文本
 * @param maxChars 最大字符数（中文字符数，英文字符按2个算1个中文字符）
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxChars: number = 10): string {
  if (!text) return ''
  
  let charCount = 0
  let result = ''
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    // 判断是否为中文字符（包括中文标点）
    const isChinese = /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/.test(char)
    
    if (isChinese) {
      charCount += 1
    } else {
      charCount += 0.5 // 英文字符按半个中文字符计算
    }
    
    if (charCount > maxChars) {
      return result + '...'
    }
    
    result += char
  }
  
  return result
}

/**
 * 获取文本的显示长度（中文字符数）
 * @param text 文本
 * @returns 显示长度
 */
export function getTextDisplayLength(text: string): number {
  if (!text) return 0
  
  let length = 0
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const isChinese = /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/.test(char)
    length += isChinese ? 1 : 0.5
  }
  
  return length
}
import { createApp } from 'vue'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import App from './App.vue'

const app = createApp(App)

// 忽略已知的 TDesign 内部 size 额外属性告警（TSelectPanel/TSelectInput）
app.config.warnHandler = (msg, _instance, trace) => {
  const text = typeof msg === 'string' ? msg : String(msg)
  const stack = typeof trace === 'string' ? trace : ''
  const isExtraneousSize =
    text.includes('Extraneous non-props attributes') &&
    text.includes('(size)') &&
    (stack.includes('TSelectPanel') || stack.includes('TSelectInput') || stack.includes('TSelect'))

  if (isExtraneousSize) {
    return
  }
  console.warn(text + (stack ? `\n${stack}` : ''))
}

app.use(TDesign)
app.mount('#app')

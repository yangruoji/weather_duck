import { createClient } from '@supabase/supabase-js'

const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined

// 未配置时返回 null，代码中将自动回退到 IndexedDB
export const supabase = url && anonKey ? createClient(url, anonKey) : null
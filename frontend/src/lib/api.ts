import axios from 'axios'
import { supabase } from './supabase'

const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
const isCapacitor = !!(window as unknown as Record<string, { isNativePlatform?: () => boolean }>).Capacitor?.isNativePlatform?.()
const isProd = import.meta.env.PROD

export function resolveBaseURL(): string {
  // Allow explicit override from settings (works across all platforms)
  const custom = localStorage.getItem('manga-backend-url')
  if (custom) return custom.replace(/\/$/, '') + '/api'

  // Tauri desktop: backend is auto-started on localhost
  if (isTauri) return 'http://127.0.0.1:8000/api'

  // Capacitor mobile: default to production backend
  // User can override via Settings if self-hosting
  if (isCapacitor) return 'https://manga-dl.onrender.com/api'

  // Web: prod hits Render backend directly, dev uses Vite proxy
  return isProd ? 'https://manga-dl.onrender.com/api' : '/api'
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const apiKey = localStorage.getItem('manga-api-key')
  if (apiKey) config.headers['X-API-Key'] = apiKey

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch {
    // Ignore if session can't be fetched
  }

  return config
})

export default api


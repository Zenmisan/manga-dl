import axios from 'axios'

const isTauri = !!(window as any).__TAURI_INTERNALS__
const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.()
const isProd = import.meta.env.PROD

function resolveBaseURL(): string {
  // Allow explicit override from settings (works across all platforms)
  const custom = localStorage.getItem('manga-backend-url')
  if (custom) return custom.replace(/\/$/, '') + '/api'

  // Tauri desktop: backend is auto-started on localhost
  if (isTauri) return 'http://127.0.0.1:8000/api'

  // Capacitor mobile: default to production backend
  // User can override via Settings if self-hosting
  if (isCapacitor) return 'https://manga-dl.onrender.com/api'

  // Web: prod uses deployed backend, dev uses Vite proxy
  return isProd ? 'https://manga-dl.onrender.com/api' : '/api'
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('manga-api-key')
  if (apiKey) config.headers['X-API-Key'] = apiKey
  return config
})

export default api

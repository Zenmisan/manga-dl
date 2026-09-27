import axios from 'axios'
import { supabase } from './supabase'

import { Capacitor } from '@capacitor/core'

const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
const isCapacitor = Capacitor.isNativePlatform()
const isProd = import.meta.env.PROD

export function normalizeApiUrl(url: string): string {
  let clean = url.trim().replace(/\/+$/, '')
  if (!clean) return ''
  if (!clean.endsWith('/api')) {
    clean += '/api'
  }
  return clean
}

export function resolveBaseURL(): string {
  // Allow explicit override from settings (works across all platforms)
  const custom = localStorage.getItem('manga-backend-url')
  if (custom && custom.trim()) return normalizeApiUrl(custom)

  // Tauri desktop: backend is auto-started on localhost
  if (isTauri) return 'http://127.0.0.1:8000/api'

  const configuredBackend = import.meta.env.VITE_BACKEND_URL
    ? normalizeApiUrl(import.meta.env.VITE_BACKEND_URL)
    : 'https://manga-dl.onrender.com/api'

  // Capacitor mobile: default to configured backend
  if (isCapacitor) return configuredBackend

  // Web: prod hits backend directly, dev uses Vite proxy
  return isProd ? configuredBackend : '/api'
}

// Fallback URL used when primary backend fails (network error / timeout)
// Set VITE_BACKUP_BACKEND_URL in .env to enable automatic failover
const BACKUP_URL = import.meta.env.VITE_BACKUP_BACKEND_URL
  ? normalizeApiUrl(import.meta.env.VITE_BACKUP_BACKEND_URL)
  : null

// Session-local state: once failover activates, all requests use backup
let usingBackup = false

function getActiveBase(): string {
  if (usingBackup && BACKUP_URL) return BACKUP_URL
  return resolveBaseURL()
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  // Apply active base (may have switched to backup)
  config.baseURL = getActiveBase()

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

// On network failure, retry once against backup URL if available
api.interceptors.response.use(
  res => res,
  async (error) => {
    const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error')
    if (isNetworkError && BACKUP_URL && !usingBackup && !error.config?._retried) {
      usingBackup = true
      console.info('[api] Primary backend unreachable — switching to backup:', BACKUP_URL)
      const retryConfig = { ...error.config, baseURL: BACKUP_URL, _retried: true }
      return api.request(retryConfig)
    }
    return Promise.reject(error)
  }
)

export default api

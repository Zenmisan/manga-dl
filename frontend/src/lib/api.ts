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

  // Backup server has no API key — only attach key when on primary
  if (!usingBackup) {
    const apiKey = localStorage.getItem('manga-api-key') || import.meta.env.VITE_API_KEY
    if (apiKey) config.headers['X-API-Key'] = apiKey
  }

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

// On network failure or server error, retry once against backup URL if available
api.interceptors.response.use(
  res => res,
  async (error) => {
    const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error')
    const isServerError = error.response?.status >= 500
    if ((isNetworkError || isServerError) && BACKUP_URL && !usingBackup && !error.config?._retried) {
      usingBackup = true
      console.info('[api] Primary backend failed — switching to backup:', BACKUP_URL)
      const retryConfig = { ...error.config, baseURL: BACKUP_URL, _retried: true }
      return api.request(retryConfig)
    }
    return Promise.reject(error)
  }
)

// Probe primary backend on startup; switch to backup immediately if unhealthy.
// Strips /api suffix to hit the root /health endpoint.
export async function initBackendFailover(): Promise<void> {
  if (!BACKUP_URL) return
  try {
    const apiBase = resolveBaseURL()
    const rootBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    try {
      const res = await fetch(`${rootBase}/health`, { signal: ctrl.signal })
      if (!res.ok) throw new Error(`status ${res.status}`)
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    usingBackup = true
    console.info('[api] Primary health check failed — using backup:', BACKUP_URL, err)
  }
}

export default api

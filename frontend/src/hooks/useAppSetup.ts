import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { syncReadTrackingFromCloud } from '../lib/readTracking'
import { syncCategoriesFromCloud } from '../lib/categories'
import { syncMangaNotesFromCloud } from '../lib/mangaNotes'
import { syncMetaOverridesFromCloud } from '../lib/metaOverrides'
import { ExtensionManager } from '../lib/extensions'
import type { Session } from '@supabase/supabase-js'
import React from 'react'

export function useAuthSession() {
  const navigate = useNavigate()
  const [session, setSession] = React.useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = React.useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoadingSession(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-')) {
          localStorage.removeItem(key)
          i--
        }
      }
      navigate('/login')
    } catch (e) {
      console.error(e)
    }
  }, [navigate])

  return { session, loadingSession, handleSignOut }
}

export function useThemeEffects() {
  const { theme, amoledBlack, accent } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark)
      root.classList.toggle('light', !isDark)
    }
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('amoled', amoledBlack)
  }, [amoledBlack])

  useEffect(() => {
    if (accent === 'red') {
      document.documentElement.removeAttribute('data-accent')
    } else {
      document.documentElement.setAttribute('data-accent', accent)
    }
  }, [accent])
}

export function useAppLock() {
  const { appLockEnabled } = useAppStore()
  const [locked, setLocked] = React.useState(false)
  const isAuthenticatingRef = useRef(false)
  const isUnlockedRef = useRef(false)

  useEffect(() => {
    if (!appLockEnabled || !('Capacitor' in window)) {
      isUnlockedRef.current = true
      // Defer to avoid setState-in-effect lint warning
      const id = requestAnimationFrame(() => setLocked(false))
      return () => cancelAnimationFrame(id)
    }

    const tryAuth = async () => {
      if (isAuthenticatingRef.current || isUnlockedRef.current) return
      isAuthenticatingRef.current = true
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
        const { isAvailable } = await BiometricAuth.checkBiometry()
        if (!isAvailable) { isUnlockedRef.current = true; setLocked(false); return }
        setLocked(true)
        await BiometricAuth.authenticate({ reason: 'Unlock manga-dl', cancelTitle: 'Cancel' })
        isUnlockedRef.current = true
        setLocked(false)
      } catch {
        isUnlockedRef.current = false
      } finally {
        isAuthenticatingRef.current = false
      }
    }

    tryAuth()
    let removePauseListener: (() => void) | undefined
    import('@capacitor/app').then(({ App }) => {
      const sub = App.addListener('pause', () => { isUnlockedRef.current = false })
      removePauseListener = () => { sub.then(h => h.remove()) }
    }).catch(() => {})
    return () => { if (removePauseListener) removePauseListener() }
  }, [appLockEnabled])

  return { locked, setLocked }
}

export function useBackgroundSync() {
  const { syncWifiOnly, syncChargingOnly, setExtensionUpdateCount } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    ExtensionManager.getInstance().init().catch(() => {})
    syncReadTrackingFromCloud().catch(() => {})
    syncCategoriesFromCloud().catch(() => {})
    syncMangaNotesFromCloud().catch(() => {})
    syncMetaOverridesFromCloud()

    // Check for extension updates in the background
    const checkExtUpdates = async () => {
      try {
        const res = await api.get('/sources/market')
        const market: Array<{ id: string; version: string }> = res.data
        const manager = ExtensionManager.getInstance()
        const key = (manager as unknown as Record<string, unknown>).storageKey as string
        const installed: Array<{ id: string; version: string }> = JSON.parse(localStorage.getItem(key) || '[]')
        const count = installed.filter(inst => {
          const remote = market.find(m => m.id === inst.id)
          return remote && remote.version !== inst.version
        }).length
        setExtensionUpdateCount(count)
      } catch { /* non-fatal */ }
    }
    setTimeout(checkExtUpdates, 5000)
  }, [])

  useEffect(() => {
    if (!('Capacitor' in window)) return
    import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {})
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ provider?: string; mangaId?: string }>('new-chapters', ({ payload }) => {
        if (payload.provider && payload.mangaId) {
          navigate(`/manga/${payload.provider}/${encodeURIComponent(payload.mangaId)}`)
        }
      })
    }).catch(() => {})
  }, [navigate])

  useEffect(() => {
    if ('__TAURI_INTERNALS__' in window) return

    const canSync = async (): Promise<boolean> => {
      if (syncWifiOnly) {
        try {
          const { Network } = await import('@capacitor/network')
          const status = await Network.getStatus()
          if (status.connectionType !== 'wifi') return false
        } catch {
          const conn = (navigator as Navigator & { connection?: { type?: string } }).connection
          if (conn && conn.type && conn.type !== 'wifi') return false
        }
      }
      if (syncChargingOnly) {
        try {
          const bat = await (navigator as Navigator & { getBattery?: () => Promise<{ charging: boolean }> }).getBattery?.()
          if (bat && !bat.charging) return false
        } catch { /* non-fatal */ }
      }
      return true
    }

    const run = async () => { if (await canSync()) api.post('/manga/sync').catch(() => {}) }
    const timeout = setTimeout(run, 1500)
    const t = setInterval(run, 30 * 60 * 1000)
    return () => { clearTimeout(timeout); clearInterval(t) }
  }, [syncWifiOnly, syncChargingOnly])
}

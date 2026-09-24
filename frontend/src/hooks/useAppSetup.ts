import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../components/common/Toast'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { syncReadTrackingFromCloud } from '../lib/readTracking'
import { syncCategoriesFromCloud } from '../lib/categories'
import { syncMangaNotesFromCloud } from '../lib/mangaNotes'
import { syncMetaOverridesFromCloud } from '../lib/metaOverrides'
import { ExtensionManager } from '../lib/extensions'
import { signOutGoogle } from '../lib/googleAuth'
import type { Session } from '@supabase/supabase-js'
import React from 'react'

/** Copy guest (anon) localStorage data into the newly-signed-in user's scope, then push to cloud. */
async function migrateGuestDataToAccount(userId: string) {
  try {
    const ALREADY_KEY = `manga-dl-migrated:${userId}`
    if (localStorage.getItem(ALREADY_KEY)) return  // already migrated for this user
    localStorage.setItem(ALREADY_KEY, '1')

    // 1. Migrate library subscriptions: anon → userId
    const anonSubsKey = 'manga-dl-local-subs:anon'
    const userSubsKey = `manga-dl-local-subs:${userId}`
    const anonMetaKey = 'manga-dl-local-sub-meta:anon'
    const userMetaKey = `manga-dl-local-sub-meta:${userId}`

    const anonSubs: string[] = JSON.parse(localStorage.getItem(anonSubsKey) || '[]')
    if (anonSubs.length > 0) {
      const userSubs: string[] = JSON.parse(localStorage.getItem(userSubsKey) || '[]')
      const merged = [...new Set([...userSubs, ...anonSubs])]
      localStorage.setItem(userSubsKey, JSON.stringify(merged))

      const anonMeta: Record<string, unknown> = JSON.parse(localStorage.getItem(anonMetaKey) || '{}')
      const userMeta: Record<string, unknown> = JSON.parse(localStorage.getItem(userMetaKey) || '{}')
      localStorage.setItem(userMetaKey, JSON.stringify({ ...anonMeta, ...userMeta }))

      // Push subscriptions to backend
      for (const key of anonSubs) {
        const [provider, ...rest] = key.split(':')
        const mangaId = rest.join(':')
        const meta = anonMeta[key] as { title?: string; cover_url?: string | null } | undefined
        api.post('/manga/subscriptions', {
          provider_id: provider,
          manga_id: mangaId,
          title: meta?.title || '',
          cover_url: meta?.cover_url || null,
        }).catch(() => {})
      }
    }

    // 2. Push local read tracking to cloud (it's not user-scoped so it's already accessible)
    await syncReadTrackingFromCloud()
  } catch { /* non-fatal */ }
}

export function useAuthSession() {
  const navigate = useNavigate()
  const [session, setSession] = React.useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = React.useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setLoadingSession(false)
      if (event === 'SIGNED_IN' && s?.user?.id) {
        migrateGuestDataToAccount(s.user.id)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await signOutGoogle()
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

export function useAndroidBackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  useEffect(() => { locationRef.current = location }, [location])
  const lastBackPressRef = useRef(0)
  const { show } = useToast()

  useEffect(() => {
    if (!('Capacitor' in window)) return

    let removeListener: (() => void) | undefined
    import('@capacitor/app').then(({ App }) => {
      const sub = App.addListener('backButton', () => {
        const path = locationRef.current.pathname
        const isRoot = path === '/r' || path === '/' || path === '/login'

        if (isRoot) {
          const now = Date.now()
          if (now - lastBackPressRef.current < 2000) {
            App.exitApp()
          } else {
            lastBackPressRef.current = now
            show('Press back again to exit', 'info', 2000)
          }
        } else {
          navigate(-1)
        }
      })
      removeListener = () => { sub.then(h => h.remove()) }
    }).catch(() => {})

    return () => { if (removeListener) removeListener() }
  }, [navigate, show])
}


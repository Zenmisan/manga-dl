import React, { useEffect, useRef, useCallback, lazy, Suspense, lazy, Suspense } from 'react'
import { useAppStore } from './lib/store'
import {
  Library, Search, Globe, BarChart2, Clock, Bell,
  Download, Settings, Loader2, Sparkles, PanelLeftClose, PanelLeftOpen, LogOut,
} from 'lucide-react'
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from './lib/utils'
import api from './lib/api'
import { syncReadTrackingFromCloud } from './lib/readTracking'
import { syncCategoriesFromCloud } from './lib/categories'
import { syncMangaNotesFromCloud } from './lib/mangaNotes'
import { syncMetaOverridesFromCloud } from './lib/metaOverrides'
import { ExtensionManager } from './lib/extensions'
import LandingPage from './pages/Landing'
import MorePage from './pages/More'
import Dashboard from './pages/Dashboard'
import SplashScreen from './components/SplashScreen'
import { Titlebar } from './components/Titlebar'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'

import Dashboard from './pages/Dashboard'
import SearchPage from './pages/Search'
import DownloadsPage from './pages/Downloads'
import SettingsLayout from './pages/Settings'
import SettingsGeneral from './pages/Settings/General'
import SettingsReader from './pages/Settings/Reader'
import SettingsLibrary from './pages/Settings/Library'
import SettingsTrackers from './pages/Settings/Trackers'
import SettingsSystem from './pages/Settings/System'
import StatsPage from './pages/Stats'
import MangaDetail from './pages/MangaDetail'
import Reader from './pages/Reader'
import SourcesPage from './pages/Sources'
import DownloadHub from './pages/DownloadHub'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import TermsPage from './pages/Terms'
import HelpPage from './pages/Help'
import HistoryPage from './pages/History'
import UpdatesPage from './pages/Updates'
import OnboardingPage from './pages/Onboarding'
import ProfilePage from './pages/Profile'

function useGlobalNotifications() {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!('Notification' in window)) return

    const notificationsEnabled = localStorage.getItem('notifications-enabled') === 'true'
    if (!notificationsEnabled) return

    let destroyed = false

    const connect = async () => {
      const apiBase = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
        ? 'http://127.0.0.1:8000/api'
        : window.location.origin + '/api'
      const apiKey = localStorage.getItem('manga-api-key') || ''
      const protocol = apiBase.startsWith('https') ? 'wss' : 'ws'
      const wsBase = apiBase.replace(/^https?/, protocol).replace('/api', '') + '/api/downloads/ws'
      const params = new URLSearchParams()
      if (apiKey) params.set('api_key', apiKey)
      const { supabase } = await import('./lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) params.set('token', session.access_token)
      if (destroyed) return
      const ws = new WebSocket(`${wsBase}?${params.toString()}`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'queued' && Notification.permission === 'granted') {
            new Notification('New chapter queued', {
              body: `${data.download.manga_title} — ${data.download.chapter_title}`,
              icon: '/icon.png',
              silent: true,
            })
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onclose = () => {
        // Reconnect after 10s if connection drops
        setTimeout(connect, 10_000)
      }
    }

    connect().catch(console.error)
    return () => {
      destroyed = true
      wsRef.current?.close()
    }
  }, [])
}

// ── Nav config ───────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { icon: Library,   label: 'Library',   path: '/r' },
  { icon: Search,    label: 'Search',    path: '/search' },
  { icon: Globe,     label: 'Sources',   path: '/sources' },
  { icon: Bell,      label: 'Updates',   path: '/updates' },
  { icon: Clock,     label: 'History',   path: '/history' },
  { icon: BarChart2, label: 'Stats',     path: '/stats' },
  { icon: Download,  label: 'Downloads', path: '/downloads' },
  { icon: Settings,  label: 'Settings',  path: '/settings' },
]

// ── Sidebar ──────────────────────────────────────────────────
function Sidebar({ session, onSignOut, isTauri }: {
  session: Session | null
  onSignOut: () => void
  isTauri: boolean
}) {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('manga-dl-sidebar-collapsed') === 'true'
  })

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('manga-dl-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 border-r border-white/10 sticky z-50 bg-[#080808]/90 backdrop-blur-2xl transition-all duration-300',
        isCollapsed ? 'w-[68px]' : 'w-[232px]',
        isTauri ? 'top-8 h-[calc(100vh-2rem)]' : 'top-0 h-screen'
      )}
    >
      {/* Stitch Kinetic Logo & Version Badge */}
      <div className={cn('flex items-center py-5 px-3.5 border-b border-white/5 relative', isCollapsed ? 'justify-center' : 'justify-between')}>
        <Link to="/r" className={cn('flex items-center gap-3.5 group overflow-hidden', isCollapsed && 'justify-center')}>
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center p-1.5 overflow-hidden shrink-0 group-hover:border-red-500/40 transition-colors">
            <img src="/Manga-dl1.png" alt="manga-dl" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-black text-lg text-white uppercase tracking-wider font-mono leading-none">manga-dl</span>
            </div>
          )}
        </Link>

        <button
          onClick={toggleCollapse}
          className={cn(
            'p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all shrink-0',
            isCollapsed && 'mt-2'
          )}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2.5 flex-1 overflow-y-auto pt-3">
        {SIDEBAR_ITEMS.map((item) => {
          const active = location.pathname === item.path ||
            (item.path === '/settings' && location.pathname.startsWith('/settings'))
          return (
            <Link
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-xl text-xs font-extrabold transition-all',
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5',
                active
                  ? 'bg-red-600/10 border border-red-500/20 text-red-500 shadow-[0_0_12px_rgba(220,38,38,0.15)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {!isTauri && !isCollapsed && (
          <div className="mt-auto pt-3 px-1 pb-1">
            <Link
              to="/download"
              className="group relative flex flex-col gap-1.5 p-3 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-600/10 to-transparent transition-all overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-500">
                  <Sparkles className="w-3 h-3" />
                  Desktop App
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-xs font-black text-white group-hover:text-red-400 transition-colors">
                Native Windows App
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom — Help, GitHub, User Profile & Sign Out */}
      <div className="p-2.5 space-y-2 border-t border-white/10 bg-white/[0.02]">
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 text-[11px] font-bold text-zinc-500">
            <Link to="/help" className="hover:text-zinc-300 transition-colors">Help</Link>
            <a href="https://github.com/Zenmisan/manga-dl" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
          </div>
        )}

        {session ? (
          <div className={cn('pt-1', isCollapsed ? 'flex flex-col items-center gap-2' : 'space-y-1')}>
            <Link
              to={`/profile/${session.user.id}`}
              title={isCollapsed ? session.user.email?.split('@')[0] : undefined}
              className={cn(
                'flex items-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all text-xs font-bold',
                isCollapsed ? 'p-2 justify-center' : 'gap-2.5 px-3 py-2'
              )}
            >
              <span className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                {session.user.email?.[0]?.toUpperCase() ?? '?'}
              </span>
              {!isCollapsed && <span className="truncate">{session.user.email?.split('@')[0]}</span>}
            </Link>
            <button
              onClick={onSignOut}
              title={isCollapsed ? 'Sign out' : undefined}
              className={cn(
                'rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all',
                isCollapsed ? 'p-2 flex items-center justify-center' : 'w-full text-left px-3 py-1.5'
              )}
            >
              {isCollapsed ? <LogOut className="w-4 h-4 text-red-400" /> : 'Sign out'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 pt-1">
            <Link
              to="/login"
              title={isCollapsed ? 'Sign In' : undefined}
              className={cn(
                'rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center',
                isCollapsed ? 'p-2' : 'w-full text-center py-2'
              )}
            >
              {isCollapsed ? <Sparkles className="w-4 h-4" /> : 'Sign In'}
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}

// ── Bottom Nav ───────────────────────────────────────────────
function BottomNav() {
  const location = useLocation()

  const navItems = [
    { icon: Library, label: 'Library', path: '/r' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Clock, label: 'History', path: '/history' },
    { icon: Bell, label: 'Updates', path: '/updates' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background: `color-mix(in srgb, var(--bg) 88%, transparent)`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const active = location.pathname === item.path ||
          (item.path === '/settings' && location.pathname.startsWith('/settings'))
        return (
          <Link
            key={item.label}
            to={item.path}
            className="flex flex-col items-center gap-0.5 flex-1 py-1"
            style={{ color: active ? 'var(--accent-light)' : 'var(--muted3)' }}
          >
            <item.icon className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-black">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// ── App ──────────────────────────────────────────────────────
function App() {
  const location = useLocation()
  if (location.pathname === '/sitemap.xml' || location.pathname === '/robots.txt') {
    return <RawStaticViewer path={location.pathname} />
  }

  const navigate = useNavigate()
  const { theme, amoledBlack, accent, syncWifiOnly, syncChargingOnly, appLockEnabled } = useAppStore()
  const [locked, setLocked] = React.useState(false)
  const [session, setSession] = React.useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = React.useState(true)
  const [showSplash, setShowSplash] = React.useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    if (sessionStorage.getItem('splash-shown')) return false
    sessionStorage.setItem('splash-shown', '1')
    return true
  })
  const handleSplashDone = useCallback(() => setShowSplash(false), [])

  useEffect(() => {
    syncReadTrackingFromCloud().catch(() => {})
    syncCategoriesFromCloud().catch(() => {})
    syncMangaNotesFromCloud().catch(() => {})
    syncMetaOverridesFromCloud()
    ExtensionManager.getInstance().init().catch(() => {})
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setLoadingSession(false)
      if (event === 'SIGNED_OUT') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-')) {
            localStorage.removeItem(key)
            i--
          }
        }
        navigate('/')
        window.location.reload()
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (!('Capacitor' in window)) return
    import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {})
    }).catch(() => {})
  }, [])
  useGlobalNotifications()

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    import('@tauri-apps/api/event').then(({ listen }) => {
      const unlisten = listen<{ provider?: string; mangaId?: string; count?: number }>('new-chapters', ({ payload }) => {
        if (payload.provider && payload.mangaId) {
          navigate(`/manga/${payload.provider}/${encodeURIComponent(payload.mangaId)}`)
        }
      })
      return () => { unlisten.then(fn => fn()) }
    }).catch(() => {})
  }, [navigate])

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

  const isAuthenticatingRef = useRef(false)
  const isUnlockedRef = useRef(false)

  useEffect(() => {
    if (!appLockEnabled) { setLocked(false); isUnlockedRef.current = true; return }
    if (!('Capacitor' in window)) return

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

  if (locked) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 z-[9999]" style={{ background: 'var(--bg)' }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--muted3)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--muted3)' }}>App Locked</p>
        <button
          onClick={async () => {
            try {
              const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
              await BiometricAuth.authenticate({ reason: 'Unlock manga-dl', cancelTitle: 'Cancel' })
              setLocked(false)
            } catch { /* non-fatal */ }
          }}
          className="btn-secondary px-6 py-3 rounded-2xl"
        >
          Unlock
        </button>
      </div>
    )
  }

  if (loadingSession) {
    return <div className="min-h-screen" style={{ background: 'var(--bg)' }} />
  }

  const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  const isCapacitor = !!(window as unknown as Record<string, { isNativePlatform?: () => boolean }>).Capacitor?.isNativePlatform?.()
  const isNative = isTauri || isCapacitor

  if (location.pathname === '/' && (isNative || session)) {
    return <Navigate to="/r" replace />
  }

  const appRoute = !['/', '/login', '/register', '/terms', '/onboarding'].includes(location.pathname)
  if (appRoute && !localStorage.getItem('onboarded') && !isNative) {
    return <Navigate to={`/onboarding?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  const noShell = ['/', '/login', '/register', '/terms', '/onboarding'].includes(location.pathname)
  const isReader = location.pathname.startsWith('/read/')

  if (noShell) {
    return (
      <div className="flex flex-col min-h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        {isTauri && <Titlebar />}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="sync">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
            >
              <Suspense fallback={<PageLoader />}>
                <Routes location={location}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  if (showSplash) return <SplashScreen onDone={handleSplashDone} />

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {isTauri && <Titlebar />}

      <Sidebar session={session} onSignOut={handleSignOut} isTauri={isTauri} />

      {/* Main content */}
      <main className={cn('flex-1 min-w-0', !isReader && 'pb-[76px] md:pb-0')}>
        <AnimatePresence mode="sync">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="h-full"
          >
            <Routes location={location}>
              <Route path="/r" element={<Dashboard />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="/download" element={<DownloadHub />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="general" replace />} />
                <Route path="general" element={<SettingsGeneral />} />
                <Route path="reader" element={<SettingsReader />} />
                <Route path="library" element={<SettingsLibrary />} />
                <Route path="trackers" element={<SettingsTrackers />} />
                <Route path="system" element={<SettingsSystem />} />
              </Route>
              <Route path="/manga/:provider/*" element={<MangaDetail />} />
              <Route path="/read/:mangaTitle/:filename" element={<Reader />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/updates" element={<UpdatesPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav — hidden in reader */}
      {!isReader && <BottomNav />}
    </div>
  )
}

export default App

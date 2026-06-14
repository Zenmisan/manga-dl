import React, { useEffect, useRef } from 'react'
import { useAppStore } from './lib/store'
import { Library, ExternalLink, Globe, BarChart2, HelpCircle, Clock, Bell, LogIn, MoreHorizontal } from 'lucide-react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from './lib/utils'
import api from './lib/api'
import { syncReadTrackingFromCloud } from './lib/readTracking'
import { syncCategoriesFromCloud } from './lib/categories'
import { syncMangaNotesFromCloud } from './lib/mangaNotes'
import LandingPage from './pages/Landing'
import MorePage from './pages/More'
import SplashScreen from './components/SplashScreen'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'

import Dashboard from './pages/Dashboard'
import SearchPage from './pages/Search'
import DownloadsPage from './pages/Downloads'
import SettingsPage from './pages/Settings'
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

    const apiBase = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
      ? 'http://127.0.0.1:8000/api'
      : window.location.origin + '/api'
    const apiKey = localStorage.getItem('manga-api-key') || ''
    const protocol = apiBase.startsWith('https') ? 'wss' : 'ws'
    const wsUrl = apiBase.replace(/^https?/, protocol).replace('/api', '') + `/api/downloads/ws?api_key=${apiKey}`

    const connect = () => {
      const ws = new WebSocket(wsUrl)
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

    connect()
    return () => wsRef.current?.close()
  }, [])
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, amoledBlack, syncWifiOnly, syncChargingOnly, appLockEnabled } = useAppStore()
  const [locked, setLocked] = React.useState(false)
  const [session, setSession] = React.useState<Session | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => localStorage.getItem('sidebar-collapsed') === 'true')
  const [showSplash, setShowSplash] = React.useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    if (sessionStorage.getItem('splash-shown')) return false
    sessionStorage.setItem('splash-shown', '1')
    return true
  })

  // Sync cloud data on app start
  useEffect(() => {
    syncReadTrackingFromCloud().catch(() => {})
    syncCategoriesFromCloud().catch(() => {})
    syncMangaNotesFromCloud().catch(() => {})
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Hide native Capacitor splash screen after web app is ready
  useEffect(() => {
    if (!('Capacitor' in window)) return
    import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {})
    }).catch(() => {})
  }, [])
  useGlobalNotifications()

  // T10: Handle new-chapters event from Tauri background sync → navigate to manga
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

  // Biometric app lock (Android native only)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!appLockEnabled) { setLocked(false); return }
    if (!('Capacitor' in window)) return

    const tryAuth = async () => {
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
        const { isAvailable } = await BiometricAuth.checkBiometry()
        if (!isAvailable) return
        setLocked(true)
        await BiometricAuth.authenticate({ reason: 'Unlock manga-dl', cancelTitle: 'Cancel' })
        setLocked(false)
      } catch {
        // Auth failed or cancelled — keep locked
      }
    }

    tryAuth()

    const onResume = () => tryAuth()
    import('@capacitor/app').then(({ App }) => {
      App.addListener('resume', onResume)
    }).catch(() => {})

    const onVisible = () => { if (document.visibilityState === 'visible') tryAuth() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [appLockEnabled])

  // Auto-sync subscribed manga on web/Android (Tauri handles it via background Rust task)
  useEffect(() => {
    if ('__TAURI_INTERNALS__' in window) return

    const canSync = async (): Promise<boolean> => {
      if (syncWifiOnly) {
        try {
          const { Network } = await import('@capacitor/network')
          const status = await Network.getStatus()
          if (status.connectionType !== 'wifi') return false
        } catch {
          // Not native — use navigator.connection if available
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

    const run = async () => {
      if (await canSync()) api.post('/manga/sync').catch(() => {})
    }
    run()
    const t = setInterval(run, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [syncWifiOnly, syncChargingOnly])

  const navItems = [
    { icon: Library, label: 'Library', path: '/r' },
    { icon: Bell, label: 'Updates', path: '/updates' },
    { icon: Clock, label: 'History', path: '/history' },
    { icon: Globe, label: 'Browse', path: '/sources' },
    { icon: MoreHorizontal, label: 'More', path: '/more' },
  ]

  const sidebarExtra = [
    { icon: Clock, label: 'History', path: '/history' },
    { icon: BarChart2, label: 'Stats', path: '/stats' },
    { icon: ExternalLink, label: 'Get App', path: '/download' },
  ]

  if (locked) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 z-[9999]">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <p className="text-white/40 font-bold text-sm uppercase tracking-widest">App Locked</p>
        <button
          onClick={async () => {
            try {
              const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
              await BiometricAuth.authenticate({ reason: 'Unlock manga-dl', cancelTitle: 'Cancel' })
              setLocked(false)
            } catch { /* non-fatal */ }
          }}
          className="px-6 py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all"
        >
          Unlock
        </button>
      </div>
    )
  }

  const noShell = ['/', '/login', '/register', '/terms', '/onboarding'].includes(location.pathname)

  if (noShell) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-red-500/30">
      {/* Desktop Sidebar */}
      <aside className={cn("hidden md:flex flex-col sticky top-0 h-screen border-r border-white/5 bg-black/20 backdrop-blur-2xl transition-all duration-200", sidebarCollapsed ? "w-16" : "w-72")}>
        <div className={cn("flex items-center", sidebarCollapsed ? "p-3 justify-center" : "p-8")}>
          {sidebarCollapsed ? (
            <button
              onClick={() => { setSidebarCollapsed(false); localStorage.setItem('sidebar-collapsed', 'false') }}
              className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-red-600/20 hover:rotate-6 transition-transform"
              title="Expand sidebar"
            >M</button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <Link to="/r" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-red-600/20 group-hover:rotate-6 transition-transform">M</div>
                <span className="font-bold text-xl tracking-tight">manga-dl</span>
              </Link>
              <button
                onClick={() => { setSidebarCollapsed(true); localStorage.setItem('sidebar-collapsed', 'true') }}
                className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all"
                title="Collapse sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 space-y-2", sidebarCollapsed ? "px-2" : "px-4")}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn("nav-link flex-row", isActive && "active", sidebarCollapsed && "justify-center px-0")}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-red-500" : "opacity-70")} />
                {!sidebarCollapsed && <span className="font-semibold text-sm">{item.label}</span>}
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 bg-red-600/5 rounded-xl -z-10 blur-xl"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className={cn("pb-2 space-y-1 border-t border-white/5 pt-4", sidebarCollapsed ? "px-2" : "px-4")}>
          {sidebarExtra.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn("nav-link flex-row", isActive && "active", sidebarCollapsed && "justify-center px-0")}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-red-500" : "opacity-70")} />
                {!sidebarCollapsed && <span className="font-semibold text-sm">{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {session ? (
          <div className={cn("pb-2", sidebarCollapsed ? "px-2" : "px-6")}>
            {sidebarCollapsed ? (
              <div className="w-10 h-10 rounded-lg bg-red-600/15 border border-red-500/20 flex items-center justify-center text-xs font-black text-red-400 mx-auto" title={session.user.email}>
                {session.user.email?.[0]?.toUpperCase() ?? '?'}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[.04] border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-red-600/15 border border-red-500/20 flex items-center justify-center text-xs font-black text-red-400 flex-shrink-0">
                  {session.user.email?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white/50 truncate">{session.user.email}</p>
                </div>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-[10px] font-black uppercase tracking-wider text-white/25 hover:text-red-400 transition-colors flex-shrink-0 px-2 py-1"
                >
                  Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={cn("pb-2", sidebarCollapsed ? "px-2" : "px-6")}>
            <Link
              to="/login"
              title={sidebarCollapsed ? "Sign In" : undefined}
              className={cn("flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 transition-all text-red-400 hover:text-red-300", sidebarCollapsed && "px-0")}
            >
              <LogIn className="w-3.5 h-3.5" />
              {!sidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">Sign In</span>}
            </Link>
          </div>
        )}

        <div className={cn("space-y-2", sidebarCollapsed ? "p-2" : "p-6")}>
          <Link
            to="/help"
            title={sidebarCollapsed ? "Help" : undefined}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white", sidebarCollapsed && "justify-center px-0")}
          >
            <HelpCircle className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Help</span>}
          </Link>
          <a
            href="https://github.com/zenmisan/manga-dl"
            target="_blank"
            rel="noreferrer"
            title={sidebarCollapsed ? "GitHub" : undefined}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white", sidebarCollapsed && "justify-center px-0")}
          >
            <ExternalLink className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-xs font-bold uppercase tracking-wider">v1.0.0</span>}
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative pb-24 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
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
              <Route path="/settings" element={<SettingsPage />} />
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-md border-t border-white/5">
        <div className="flex items-center justify-around glass-panel p-1.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn("nav-link flex-1 py-3", isActive && "active")}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-red-500" : "opacity-70")} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default App

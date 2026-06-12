import { useEffect, useRef } from 'react'
import { Search, Library, Download, Settings, ExternalLink, Globe, BarChart2, HelpCircle, Clock, Bell } from 'lucide-react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from './lib/utils'

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

function useGlobalNotifications() {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!('Notification' in window)) return

    const notificationsEnabled = localStorage.getItem('notifications-enabled') === 'true'
    if (!notificationsEnabled) return

    const apiBase = (window as any).__TAURI_INTERNALS__
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
  useGlobalNotifications()

  const navItems = [
    { icon: Library, label: 'Library', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Bell, label: 'Updates', path: '/updates' },
    { icon: Globe, label: 'Extensions', path: '/sources' },
    { icon: Download, label: 'Downloads', path: '/downloads' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  const sidebarExtra = [
    { icon: Clock, label: 'History', path: '/history' },
    { icon: BarChart2, label: 'Stats', path: '/stats' },
    { icon: Download, label: 'Get App', path: '/download' },
  ]

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-red-500/30">
      {/* Desktop Sidebar */}
      <aside className="w-72 hidden md:flex flex-col sticky top-0 h-screen border-r border-white/5 bg-black/20 backdrop-blur-2xl">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-red-600/20 group-hover:rotate-6 transition-transform">
              M
            </div>
            <span className="font-bold text-xl tracking-tight">manga-dl</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn("nav-link flex-row", isActive && "active")}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-red-500" : "opacity-70")} />
                <span className="font-semibold text-sm">{item.label}</span>
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

        <div className="px-4 pb-2 space-y-1 border-t border-white/5 pt-4">
          {sidebarExtra.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn("nav-link flex-row", isActive && "active")}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-red-500" : "opacity-70")} />
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="p-6 space-y-2">
          <Link
            to="/help"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white"
            title="Icon legend & help"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Help</span>
          </Link>
          <a
            href="https://github.com/zenmisan/manga-dl"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">v1.0.0</span>
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
              <Route path="/" element={<Dashboard />} />
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

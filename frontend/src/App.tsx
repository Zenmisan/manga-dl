import { Search, Library, Download, Settings, ExternalLink } from 'lucide-react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from './lib/utils'

import Dashboard from './pages/Dashboard'
import SearchPage from './pages/Search'
import DownloadsPage from './pages/Downloads'
import SettingsPage from './pages/Settings'

function App() {
  const location = useLocation()

  const navItems = [
    { icon: Library, label: 'Library', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Download, label: 'Downloads', path: '/downloads' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  return (
    <div className="flex min-h-screen bg-[#0a0a0c] text-[#f5f5f7]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#27272a] bg-[#16161a] hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-red-600/20">
              M
            </div>
            <span className="font-bold text-xl tracking-tight">manga-dl</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
                  isActive ? "bg-red-600/10 text-red-500" : "hover:bg-[#27272a] text-gray-400 hover:text-gray-200"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-red-500" : "group-hover:text-gray-200")} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 border border-red-600/20 rounded-xl"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#27272a]">
          <a
            href="https://github.com/zenmi/manga-dl"
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="text-sm font-medium">Source Code</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App

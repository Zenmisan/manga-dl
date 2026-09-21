import { useNavigate } from 'react-router-dom'
import {
  Download, Settings, BarChart2, Tag, HelpCircle, Clock,
  EyeOff, ChevronRight, Info, ExternalLink, User, LogOut,
} from 'lucide-react'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { usePageTitle } from '../lib/usePageTitle'

interface NavRow {
  icon: React.ElementType
  label: string
  path: string
  badge?: string | number
  color?: string
}

export default function MorePage() {
  usePageTitle('More')
  const navigate = useNavigate()
  const { incognitoMode, setIncognitoMode } = useAppStore()
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data?.session?.user?.email ?? null)
      setUserId(data?.session?.user?.id ?? null)
    }).catch(() => {})
  }, [])

  const rows: NavRow[] = [
    { icon: User,        label: 'My Profile',      path: userId ? `/profile/${userId}` : '/login', color: 'text-red-500 dark:text-red-400' },
    { icon: Download,    label: 'Download Queue',  path: '/downloads',   color: 'text-emerald-600 dark:text-emerald-400' },
    { icon: Clock,       label: 'History',          path: '/history',     color: 'text-blue-500 dark:text-blue-400' },
    { icon: BarChart2,   label: 'Statistics',       path: '/stats',       color: 'text-violet-500 dark:text-violet-400' },
    { icon: Tag,         label: 'Categories',       path: '/settings/library', color: 'text-amber-500 dark:text-amber-400' },
    { icon: Settings,    label: 'Settings',         path: '/settings/profile', color: 'text-zinc-500 dark:text-zinc-400' },
    { icon: HelpCircle,  label: 'Help',             path: '/help',        color: 'text-zinc-500 dark:text-zinc-400' },
    { icon: Info,        label: 'System Status',    path: '/settings/system', color: 'text-zinc-500 dark:text-zinc-400' },
  ]

  const isAdmin = email === 'zenmisan@gmail.com'
  const filteredRows = rows.filter(row => {
    if (row.path === '/downloads' && !isAdmin) return false
    if (row.path === '/settings/library' && !isAdmin) return false
    return true
  })

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-xl mx-auto min-h-full">
      <div>
        <h1 className="page-title mb-10">
          More
        </h1>

        {/* Account section */}
        {email && userId ? (
          <div 
            onClick={() => navigate(`/profile/${userId}`)}
            className="flex items-center gap-4 p-4 glass-panel border-black/5 dark:border-white/10 hover:border-red-500/30 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] cursor-pointer transition-all mb-8 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center font-black text-red-500 dark:text-red-400 text-xl group-hover:scale-105 transition-transform">
              {email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm truncate text-zinc-900 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">{email}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest mt-0.5">Tap to View Profile</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${userId}`) }}
                className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-red-500 transition-all cursor-pointer"
              >
                Profile
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); supabase.auth.signOut() }}
                title="Sign Out"
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-black/5 dark:border-white/5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 glass-panel border-black/5 dark:border-white/5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-zinc-400 dark:text-white/30">
              <Info className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-zinc-800 dark:text-white/80">Not signed in</p>
              <p className="text-[10px] text-zinc-500 dark:text-white/40 font-bold uppercase tracking-widest mt-0.5">Sign in to sync your library</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-zinc-800 dark:text-white/80 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-3 py-2 bg-red-600/15 border border-red-600/20 hover:bg-red-600/25 rounded-xl text-red-500 dark:text-red-400 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* Quick toggles */}
        <section className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-500 dark:text-white/40 mb-3 px-1">Quick Toggles</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 glass-panel border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <EyeOff className="w-5 h-5 text-zinc-500 dark:text-white/40" />
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">Incognito Mode</p>
                  <p className="text-[10px] text-zinc-500 dark:text-white/50 font-medium mt-0.5">Hides reading activity</p>
                </div>
              </div>
              <button
                onClick={() => setIncognitoMode(!incognitoMode)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer ${incognitoMode ? 'bg-red-600' : 'bg-black/10 dark:bg-white/10'}`}
                role="switch"
                aria-checked={incognitoMode}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${incognitoMode ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Nav links */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-500 dark:text-white/40 mb-3 px-1">Navigation</p>
          <div className="space-y-1">
            {filteredRows.map((row) => (
              <button
                key={row.label}
                onClick={() => navigate(row.path)}
                className="w-full flex items-center gap-4 p-4 glass-panel border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[.02] dark:hover:bg-white/[.06] transition-all group text-left cursor-pointer"
              >
                <row.icon className={`w-5 h-5 ${row.color ?? 'text-zinc-500 dark:text-white/40'}`} />
                <span className="flex-1 font-bold text-sm text-zinc-800 dark:text-white/80 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">{row.label}</span>
                {row.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-500 dark:text-red-400 text-[10px] font-black">{row.badge}</span>
                )}
                <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-white/20 group-hover:text-zinc-600 dark:group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </section>

        {/* GitHub link / Footer */}
        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex justify-center">
          <a
            href="https://github.com/zenmisan/manga-dl"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-zinc-400 dark:text-white/30 hover:text-zinc-600 dark:hover:text-white/60 transition-colors text-xs font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            Open Source · v1.0.0
          </a>
        </div>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Download, Settings, BarChart2, Tag, HelpCircle, Clock,
  EyeOff, ChevronRight, Info, ExternalLink, RefreshCw, Sparkles,
} from 'lucide-react'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { checkForUpdate, openUpdateUrl, type ReleaseInfo } from '../lib/updates'

interface NavRow {
  icon: React.ElementType
  label: string
  path: string
  badge?: string | number
  color?: string
}

const ROWS: NavRow[] = [
  { icon: Download,    label: 'Download Queue',  path: '/downloads',   color: 'text-emerald-400' },
  { icon: Clock,       label: 'History',          path: '/history',     color: 'text-blue-400' },
  { icon: BarChart2,   label: 'Statistics',       path: '/stats',       color: 'text-violet-400' },
  { icon: Tag,         label: 'Categories',       path: '/settings/library', color: 'text-amber-400' },
  { icon: Settings,    label: 'Settings',         path: '/settings/general', color: 'text-white/60' },
  { icon: HelpCircle,  label: 'Help',             path: '/help',        color: 'text-white/60' },
  { icon: Info,        label: 'System Status',    path: '/settings/system', color: 'text-white/60' },
]

export default function MorePage() {
  const navigate = useNavigate()
  const { incognitoMode, setIncognitoMode } = useAppStore()
  const [email, setEmail] = useState<string | null>(null)
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateChecked, setUpdateChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user.email ?? null)
    })
  }, [])

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    const info = await checkForUpdate()
    setCheckingUpdate(false)
    setUpdateChecked(true)
    if (info?.isNewer) setUpdateInfo(info)
  }

  const handleInstallUpdate = async () => {
    if (!updateInfo) return
    await openUpdateUrl(updateInfo)
  }

  const isAdmin = email === 'zenmisan@gmail.com'
  const filteredRows = ROWS.filter(row => {
    if (row.path === '/downloads' && !isAdmin) return false
    if (row.path === '/settings/library' && !isAdmin) return false
    return true
  })

  return (
    <div className="p-6 md:p-12 max-w-xl mx-auto min-h-full">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-10 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent uppercase">
          More
        </h1>

        {/* Account section */}
        {email ? (
          <div className="flex items-center gap-4 p-4 glass-panel border-white/5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/20 flex items-center justify-center font-black text-red-400 text-lg">
              {email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{email}</p>
              <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-0.5">Signed in</p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-[10px] font-black uppercase tracking-widest text-white/25 hover:text-red-400 transition-colors px-3 py-2 rounded-lg border border-white/5 hover:border-red-500/20"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 glass-panel border-white/5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
              <Info className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-white/60">Not signed in</p>
              <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest mt-0.5">Sign in to sync your library</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-red-600/15 border border-red-600/20 hover:bg-red-600/25 rounded-xl text-red-400 text-xs font-black uppercase tracking-widest transition-all"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Quick toggles */}
        <section className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/25 mb-3 px-1">Quick Toggles</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 glass-panel border-white/5">
              <div className="flex items-center gap-3">
                <EyeOff className="w-5 h-5 text-white/40" />
                <div>
                  <p className="font-bold text-sm">Incognito Mode</p>
                  <p className="text-[10px] text-white/30 font-medium mt-0.5">Hides reading activity</p>
                </div>
              </div>
              <button
                onClick={() => setIncognitoMode(!incognitoMode)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${incognitoMode ? 'bg-red-600' : 'bg-white/10'}`}
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
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/25 mb-3 px-1">Navigation</p>
          <div className="space-y-1">
            {filteredRows.map((row, i) => (
              <motion.button
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(row.path)}
                className="w-full flex items-center gap-4 p-4 glass-panel border-white/5 hover:border-white/10 hover:bg-white/[.06] transition-all group text-left"
              >
                <row.icon className={`w-5 h-5 ${row.color ?? 'text-white/40'}`} />
                <span className="flex-1 font-bold text-sm text-white/80 group-hover:text-white transition-colors">{row.label}</span>
                {row.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[10px] font-black">{row.badge}</span>
                )}
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
              </motion.button>
            ))}
          </div>
        </section>

        {/* Update section */}
        <div className="mt-8 pt-6 border-t border-white/5">
          {updateInfo ? (
            <div className="p-4 rounded-2xl bg-red-600/10 border border-red-500/20 mb-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-red-300">Update available — v{updateInfo.version}</p>
                  {updateInfo.notes && (
                    <p className="text-xs text-white/40 mt-1 line-clamp-2">{updateInfo.notes.split('\n')[0]}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleInstallUpdate}
                className="mt-3 w-full py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Download & Install
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <a
              href="https://github.com/zenmisan/manga-dl"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-white/20 hover:text-white/50 transition-colors text-xs font-bold"
            >
              <ExternalLink className="w-4 h-4" />
              Open Source · v1.0.0
            </a>
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/25 hover:text-white/60 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${checkingUpdate ? 'animate-spin' : ''}`} />
              {checkingUpdate ? 'Checking…' : updateChecked && !updateInfo ? 'Up to date' : 'Check for updates'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

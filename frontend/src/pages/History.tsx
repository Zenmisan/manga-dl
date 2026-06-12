import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Play, Trash2, ChevronLeft, Loader2, EyeOff } from 'lucide-react'
import { useAppStore } from '../lib/store'

interface HistoryEntry {
  provider: string
  manga_id: string
  chapter_id: string
  manga_title: string
  chapter_title: string
  last_page: number
  updated_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { incognitoMode } = useAppStore()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true)
        api.get('/users/history')
          .then(res => setHistory(res.data))
          .catch(() => {})
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [])

  const handleClearAll = async () => {
    if (!confirm('Clear all reading history?')) return
    setClearing(true)
    try {
      await api.delete('/users/history')
      setHistory([])
    } catch {}
    setClearing(false)
  }

  const resumeChapter = (entry: HistoryEntry) => {
    const param = encodeURIComponent(`${entry.provider}|${entry.manga_id}|${entry.chapter_id}|${entry.manga_title}|${entry.chapter_title}`)
    navigate(`/read/online/${param}`)
  }

  if (incognitoMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-12 text-center gap-4">
        <EyeOff className="w-12 h-12 text-white/10" />
        <h2 className="text-xl font-bold text-white/40">Incognito mode is on</h2>
        <p className="text-white/20 text-sm">History is not recorded while incognito.</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto min-h-full">
      <header className="mb-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 text-sm font-bold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
              History
            </h1>
            <p className="text-white/40 font-medium">Your reading activity across devices</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/20 hover:border-red-500/20 hover:text-red-400 text-white/40 transition-all text-xs font-bold uppercase tracking-wider"
            >
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear All
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : !authed ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Clock className="w-12 h-12 text-white/10" />
          <p className="text-white/40 font-bold">Sign in to see your reading history</p>
          <button onClick={() => navigate('/login')} className="btn-primary mt-2">
            Sign In
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Clock className="w-12 h-12 text-white/10" />
          <p className="text-white/30 font-bold uppercase tracking-widest text-xs">No reading history yet</p>
          <p className="text-white/20 text-sm">Chapters you read online will appear here</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <motion.div
                key={`${entry.provider}-${entry.manga_id}-${entry.chapter_id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-red-500/10 border border-red-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white/90 truncate text-sm group-hover:text-red-400 transition-colors">
                    {entry.manga_title}
                  </p>
                  <p className="text-[11px] text-white/30 font-medium truncate">
                    {entry.chapter_title}
                    {entry.last_page > 1 && (
                      <span className="ml-2 text-white/20">· page {entry.last_page}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest hidden sm:block">
                    {entry.updated_at ? timeAgo(entry.updated_at) : ''}
                  </span>
                  <button
                    onClick={() => resumeChapter(entry)}
                    title="Resume reading"
                    className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}

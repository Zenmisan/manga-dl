import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useMangaUpdates } from '../lib/queries'
import { motion } from 'framer-motion'
import { Bell, Play, Download, Loader2, RefreshCw, ChevronLeft } from 'lucide-react'
import { cn } from '../lib/utils'
import { buildSmartReadUrl } from '../lib/smartUrl'

interface UpdateEntry {
  manga_title: string
  manga_id: string
  provider: string
  cover_url: string | null
  chapter_id: string
  chapter_title: string
  chapter_number: number
  published_at: string | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export default function UpdatesPage() {
  const navigate = useNavigate()
  const { data: rawUpdates = [], isLoading: loading, isFetching: refreshing, refetch } = useMangaUpdates()
  const updates = rawUpdates as UpdateEntry[]
  const [downloading, setDownloading] = useState<Set<string>>(new Set())

  const handleDownload = async (entry: UpdateEntry) => {
    const key = `${entry.provider}-${entry.chapter_id}`
    if (downloading.has(key)) return
    setDownloading(prev => new Set(prev).add(key))
    try {
      await api.post('/downloads/queue', {
        provider_id: entry.provider,
        manga_id: entry.manga_id,
        chapter_id: entry.chapter_id,
      })
    } catch { /* non-fatal */ }
    setTimeout(() => setDownloading(prev => {
      const next = new Set(prev); next.delete(key); return next
    }), 2000)
  }

  const handleReadOnline = (entry: UpdateEntry) => {
    const targetUrl = buildSmartReadUrl(entry.provider, entry.manga_id, entry.chapter_id, entry.manga_title, entry.chapter_title)
    navigate(targetUrl)
  }

  // Group by manga title
  const grouped = updates.reduce<Record<string, UpdateEntry[]>>((acc, u) => {
    if (!acc[u.manga_title]) acc[u.manga_title] = []
    acc[u.manga_title].push(u)
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-5xl mx-auto min-h-full">
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
              Updates
            </h1>
            <p className="text-white/40 font-medium">Latest chapters from your library</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Bell className="w-12 h-12 text-white/10" />
          <p className="text-white/30 font-bold uppercase tracking-widest text-xs">No updates yet</p>
          <p className="text-white/20 text-sm">Subscribe to manga to see new chapters here</p>
          <button onClick={() => navigate('/search')} className="btn-primary mt-2">
            Find Manga
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([title, chapters], gi) => (
            <motion.section
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04 }}
            >
              <button
                onClick={() => {
                  const ch = chapters[0]
                  navigate(`/manga/${ch.provider}/${ch.manga_id}`)
                }}
                className="flex items-center gap-3 mb-4 group"
              >
                {chapters[0].cover_url ? (
                  <img
                    src={`${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(chapters[0].cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`}
                    alt={title}
                    className="w-10 h-14 object-cover rounded-lg shrink-0 border border-white/5"
                  />
                ) : (
                  <div className="w-10 h-14 bg-white/5 rounded-lg border border-white/5 shrink-0" />
                )}
                <div className="text-left">
                  <h2 className="font-bold text-white/90 group-hover:text-red-400 transition-colors text-sm md:text-base">
                    {title}
                  </h2>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                    {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-0 md:ml-14">
                {chapters.map((ch) => {
                  const key = `${ch.provider}-${ch.chapter_id}`
                  return (
                    <div
                      key={ch.chapter_id}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white/80 text-sm truncate group-hover:text-white transition-colors">
                          {ch.chapter_title}
                        </p>
                        {ch.published_at && (
                          <p className="text-[10px] text-white/20 font-medium mt-0.5">
                            {timeAgo(ch.published_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleReadOnline(ch)}
                          title="Read online"
                          className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white transition-all"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(ch)}
                          title="Download"
                          className={cn(
                            'p-2 rounded-lg border transition-all',
                            downloading.has(key)
                              ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-red-600 hover:border-red-600 hover:text-white'
                          )}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  )
}

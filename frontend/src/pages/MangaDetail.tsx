import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { FastAverageColor } from 'fast-average-color'
import {
  ChevronLeft,
  Download,
  Clock,
  User,
  Tag,
  Info,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Bell,
  BellOff,
  ListPlus,
  Play,
  ArrowUpDown,
  Search as SearchIcon,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react'
import { markRead, markUnread, markAllRead, getReadChapters, isRead } from '../lib/readTracking'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

interface Chapter {
  id: string
  title: string
  number: number
  published_at: string | null
}

interface MangaDetail {
  id: string
  title: string
  cover_url: string | null
  description: string | null
  status: string | null
  genres: string[]
  authors: string[]
  provider: string
  url: string
  chapters: Chapter[]
}

export default function MangaDetail() {
  const { provider, '*': mangaId } = useParams()
  const navigate = useNavigate()
  const [manga, setManga] = useState<MangaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string[]>([])
  const [showQueueLink, setShowQueueLink] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [chapterSort, setChapterSort] = useState<'default' | 'newest' | 'oldest' | 'num-asc' | 'num-desc'>('default')
  const [chapterSearch, setChapterSearch] = useState('')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [scanlatorFilter, setScanlatorFilter] = useState<string>('all')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(
    JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')[`${provider}:${provider}`] || []
  ))
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set())
  const [malSyncing, setMalSyncing] = useState(false)
  const malToken = localStorage.getItem('mal-token')
  const [themeColor, setThemeColor] = useState<string>('rgba(220, 38, 38, 0.5)')
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const fetchManga = async () => {
      try {
        const res = await api.get(`/manga/${provider}/${mangaId}`)
        setManga(res.data)
        if (provider && mangaId) {
          setReadChapters(getReadChapters(provider, mangaId))
          // load bookmarks for this manga
          try {
            const bm = JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')
            setBookmarks(new Set(bm[`${provider}:${mangaId}`] || []))
          } catch {}
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchManga()
  }, [provider, mangaId])

  useEffect(() => {
    if (!provider || !mangaId) return
    api.get(`/manga/subscription/${provider}/${mangaId}`)
      .then(res => setSubscribed(res.data.subscribed))
      .catch(() => {})
  }, [provider, mangaId])

  const handleMALSync = async () => {
    if (!malToken || malSyncing || !manga) return
    setMalSyncing(true)
    try {
      const searchRes = await api.post('/auth/mal/search', { access_token: malToken, query: manga.title })
      const results = searchRes.data.results
      if (!results?.length) { alert('No MAL match found for this title.'); return }
      const malId = results[0].id
      await api.post('/auth/mal/track', {
        access_token: malToken,
        manga_id: malId,
        status: 'reading',
        chapters_read: 0,
      })
      alert(`Marked "${manga.title}" as Reading on MAL!`)
    } catch (err) {
      console.error(err)
      alert('MAL sync failed.')
    } finally {
      setMalSyncing(false)
    }
  }

  const handleSubscribe = async () => {
    if (subscribing) return
    setSubscribing(true)
    try {
      const res = await api.post(`/manga/subscribe/${provider}/${mangaId}`)
      setSubscribed(res.data.subscribed)
    } catch (err) {
      console.error(err)
    } finally {
      setSubscribing(false)
    }
  }

  useEffect(() => {
    if (manga?.cover_url && imgRef.current) {
      const fac = new FastAverageColor()
      fac.getColorAsync(imgRef.current, { algorithm: 'dominant' })
        .then(color => {
          setThemeColor(color.rgba)
        })
        .catch(e => console.log('Color extraction failed:', e))
    }
  }, [manga?.cover_url])

  const handleDownload = async (chapterId: string) => {
    if (downloading.includes(chapterId)) return
    setDownloading(prev => [...prev, chapterId])
    try {
      await api.post('/downloads/queue', {
        provider_id: provider,
        manga_id: mangaId,
        chapter_id: chapterId
      })
      setShowQueueLink(true)
    } catch (err) {
      console.error(err)
    } finally {
      // Keep in "downloading" state for a bit for feedback
      setTimeout(() => {
        setDownloading(prev => prev.filter(id => id !== chapterId))
      }, 1000)
    }
  }

  const handleBulkDownload = async () => {
    if (!manga || bulkLoading) return
    setBulkLoading(true)
    
    // Enqueue in order (oldest to newest usually)
    const chaptersToDownload = [...manga.chapters].reverse()
    
    for (const chapter of chaptersToDownload) {
      try {
        await api.post('/downloads/queue', {
          provider_id: provider,
          manga_id: mangaId,
          chapter_id: chapter.id
        })
        // 100ms delay to let the UI react and not spam the server too hard
        await new Promise(r => setTimeout(r, 100))
      } catch (err) {
        console.error(`Error queuing ${chapter.title}:`, err)
      }
    }
    
    setBulkLoading(false)
    setShowQueueLink(true)
  }

  const displayedChapters = useMemo(() => {
    if (!manga) return []
    let list = [...manga.chapters]
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase()
      list = list.filter(c => c.title.toLowerCase().includes(q) || String(c.number).includes(q))
    }
    switch (chapterSort) {
      case 'newest': list.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')); break
      case 'oldest': list.sort((a, b) => (a.published_at || '').localeCompare(b.published_at || '')); break
      case 'num-asc': list.sort((a, b) => a.number - b.number); break
      case 'num-desc': list.sort((a, b) => b.number - a.number); break
    }
    return list
  }, [manga, chapterSort, chapterSearch])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    )
  }

  if (!manga) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Manga not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 btn-secondary">Go Back</button>
      </div>
    )
  }

  return (
    <div 
      className="min-h-full pb-20 transition-colors duration-1000"
      style={{ '--theme-color': themeColor } as React.CSSProperties}
    >
      {/* Hero Header */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110 transition-all duration-1000"
          style={{ backgroundImage: manga.cover_url ? `url(${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''})` : undefined, backgroundColor: themeColor }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-6 md:p-12 h-full flex items-end">
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-8 left-6 p-3 glass-panel hover:bg-white/10 transition-all text-white shadow-xl z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <AnimatePresence>
            {showQueueLink && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => navigate('/downloads')}
                className="absolute top-8 right-6 flex items-center gap-2 px-5 py-3 glass-panel transition-all shadow-xl z-10 font-bold text-sm"
                style={{ backgroundColor: 'var(--theme-color)', color: '#fff', opacity: 0.9 }}
              >
                <ExternalLink className="w-4 h-4" />
                View Queue
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-20 md:-mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Cover Art */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-48 md:w-64 shrink-0 mx-auto md:mx-0"
          >
            <div 
              className="aspect-[3/4.5] glass-panel p-2 shadow-2xl transition-shadow duration-1000"
              style={{ boxShadow: `0 25px 50px -12px ${themeColor}` }}
            >
              <img
                ref={imgRef}
                src={manga.cover_url ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}` : ''}
                alt={manga.title}
                crossOrigin="anonymous"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </motion.div>

          {/* Info Content */}
          <div className="flex-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span 
                  className="px-3 py-1 text-xs font-black uppercase tracking-[0.2em] border rounded-lg transition-colors duration-1000"
                  style={{ backgroundColor: 'var(--theme-color)', color: '#fff', borderColor: 'var(--theme-color)', opacity: 0.8 }}
                >
                  {manga.provider}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    manga.status === 'ongoing' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-sky-400'
                  )} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                    {manga.status || 'unknown'}
                  </span>
                </div>
              </div>
              <h1 className="text-3xl md:text-6xl font-black tracking-tighter leading-tight mb-4 text-white">
                {manga.title}
              </h1>
              
              <div className="flex flex-wrap gap-4 text-white/40 mb-8">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{manga.authors.join(', ') || 'Unknown Author'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">{manga.genres.slice(0, 3).join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{manga.chapters.length} Chapters</span>
                </div>
              </div>

              <div className="glass-panel p-6 border-white/5 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Synopsis
                </h3>
                <p className="text-white/60 leading-relaxed line-clamp-4 md:line-clamp-none text-sm md:text-base font-medium">
                  {manga.description || 'No description available for this series.'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Chapters Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-16"
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4">
                Chapters
                <span className="text-sm font-mono bg-white/5 px-2 py-1 rounded-lg text-white/20">
                  {displayedChapters.length}{displayedChapters.length !== manga.chapters.length ? `/${manga.chapters.length}` : ''}
                </span>
              </h2>
              <div className="flex gap-2">
              {malToken && (
                <button
                  onClick={handleMALSync}
                  disabled={malSyncing}
                  title="Mark as Reading on MAL"
                  className="p-2.5 rounded-xl transition-all border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  {malSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                title={subscribed ? 'Unsubscribe from new chapters' : 'Subscribe to auto-download new chapters'}
                className={cn(
                  "p-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2 disabled:opacity-50",
                  subscribed
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                {subscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : subscribed ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleBulkDownload}
                disabled={bulkLoading}
                className="btn-secondary py-2 text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download All
                  </>
                )}
              </button>
            </div>
            </div>

            {/* Sort + Search bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Search chapters..."
                  value={chapterSearch}
                  onChange={e => setChapterSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 text-white placeholder:text-white/20"
                />
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
                <select
                  value={chapterSort}
                  onChange={e => setChapterSort(e.target.value as typeof chapterSort)}
                  className="bg-transparent text-xs font-bold text-white/60 focus:outline-none py-2 cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="num-desc">Highest #</option>
                  <option value="num-asc">Lowest #</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedChapters.map((chapter) => (
              <div 
                key={chapter.id}
                className="group flex items-center justify-between p-4 glass-card hover:bg-white/5 transition-all border-white/5"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white/90 truncate group-hover:text-red-400 transition-colors">
                    {chapter.title}
                  </h4>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                    {chapter.published_at || 'Recently updated'}
                  </p>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const param = encodeURIComponent(`${provider}|${manga.id}|${chapter.id}|${manga.title}|${chapter.title}`)
                      navigate(`/read/online/${param}`)
                    }}
                    className="p-3 rounded-xl transition-all border bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white hover:border-violet-500 shadow-lg"
                    title="Read Online"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(chapter.id)}
                    disabled={downloading.includes(chapter.id)}
                    className={cn(
                      "p-3 rounded-xl transition-all border shadow-lg",
                      downloading.includes(chapter.id)
                        ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400 cursor-default"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-red-600 hover:border-red-600 hover:shadow-red-600/20"
                    )}
                  >
                    {downloading.includes(chapter.id) ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

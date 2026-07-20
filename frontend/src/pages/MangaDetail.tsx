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
  Star,
  MessageSquare,
  Pencil,
} from 'lucide-react'
import { markRead, markUnread, markAllRead, getReadChapters } from '../lib/readTracking'
import { buildSmartReadUrl } from '../lib/smartUrl'
import { ExtensionManager } from '../lib/extensions'
import { getMangaNote, setMangaNote, setMangaRating } from '../lib/mangaNotes'
import { setMangaOverride, getMangaOverride } from '../lib/metaOverrides'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'

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
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const isAdmin = userEmail === 'zenmisan@gmail.com'
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [chapterSort, setChapterSort] = useState<'default' | 'newest' | 'oldest' | 'num-asc' | 'num-desc'>('default')
  const [chapterSearch, setChapterSearch] = useState('')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [scanlatorFilter, setScanlatorFilter] = useState<string>('all')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(
    JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')[`${provider}:${mangaId}`] || []
  ))
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set())
  const [malSyncing, setMalSyncing] = useState(false)
  const [userNote, setUserNote] = useState('')
  const [userRating, setUserRating] = useState(0)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const malToken = localStorage.getItem('mal-token')
  const [themeColor, setThemeColor] = useState<string>('rgba(220, 38, 38, 0.5)')
  const [swipedChapterId, setSwipedChapterId] = useState<string | null>(null)
  const swipeStartX = useRef<number>(0)
  const imgRef = useRef<HTMLImageElement>(null)

  // Per-manga notification toggle
  const notifKey = `manga-dl-notif-${provider}-${mangaId}`
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem(notifKey) !== 'false')
  const toggleNotif = () => {
    const next = !notifEnabled
    setNotifEnabled(next)
    localStorage.setItem(notifKey, String(next))
  }

  // Manual metadata edit
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaDraft, setMetaDraft] = useState({ title: '', cover_url: '', description: '' })
  const openMetaEdit = () => {
    setMetaDraft({ title: manga?.title ?? '', cover_url: manga?.cover_url ?? '', description: manga?.description ?? '' })
    setEditingMeta(true)
  }
  const saveMetaEdit = () => {
    if (!manga) return
    setManga({ ...manga, title: metaDraft.title || manga.title, cover_url: metaDraft.cover_url || manga.cover_url, description: metaDraft.description || manga.description })
    if (provider && mangaId) {
      setMangaOverride(provider, mangaId, {
        title: metaDraft.title || undefined,
        cover_url: metaDraft.cover_url || undefined,
        description: metaDraft.description || undefined,
      })
    }
    setEditingMeta(false)
  }

  // Tracker linking
  const TRACKER_LINKS_KEY = 'manga-dl-tracker-links'
  const trackerKey = `${provider}:${mangaId}`
  const getTrackerLinks = () => {
    try { return JSON.parse(localStorage.getItem(TRACKER_LINKS_KEY) || '{}') } catch { return {} }
  }
  const [trackerLinks, setTrackerLinksState] = useState<Record<string, { id: number; title: string; score?: number; status?: string; progress?: number }>>(() => getTrackerLinks()[trackerKey] || {})
  const [showTrackerModal, setShowTrackerModal] = useState<'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null>(null)
  const [trackerSearch, setTrackerSearch] = useState('')
  const [trackerResults, setTrackerResults] = useState<{ id: number; title: string; cover?: string; year?: number; score?: number; status?: string; progress?: number }[]>([])
  const [trackerSearching, setTrackerSearching] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState<'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null>(null)
  const [syncStatus, setSyncStatus] = useState('CURRENT')
  const [syncScore, setSyncScore] = useState(0)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncStartDate, setSyncStartDate] = useState('')
  const [syncEndDate, setSyncEndDate] = useState('')
  const [syncing, setSyncing] = useState(false)

  const openSyncModal = (tracker: typeof showSyncModal) => {
    const link = trackerLinks[tracker!]
    setSyncStatus(link?.status || 'CURRENT')
    setSyncScore(link?.score || 0)
    setSyncProgress(link?.progress || 0)
    setSyncStartDate('')
    setSyncEndDate('')
    setShowSyncModal(tracker)
  }

  const handleTrackerSync = async () => {
    if (!showSyncModal) return
    const link = trackerLinks[showSyncModal]
    if (!link) return
    setSyncing(true)
    try {
      if (showSyncModal === 'anilist') {
        const token = localStorage.getItem('anilist-token')
        if (!token) { alert('Log in to AniList first'); setSyncing(false); return }
        await api.post('/auth/anilist/track', {
          access_token: token,
          media_id: link.id,
          status: syncStatus,
          score: syncScore,
          progress: syncProgress,
          start_date: syncStartDate || undefined,
          finish_date: syncEndDate || undefined,
        })
      } else if (showSyncModal === 'mal') {
        const token = localStorage.getItem('mal-token')
        if (!token) { alert('Log in to MAL first'); setSyncing(false); return }
        await api.post('/auth/mal/track', {
          access_token: token,
          manga_id: link.id,
          status: syncStatus.toLowerCase().replace('current', 'reading'),
          chapters_read: syncProgress,
          score: syncScore,
          start_date: syncStartDate || undefined,
          finish_date: syncEndDate || undefined,
        })
      }
      saveTrackerLink(showSyncModal, { ...link, status: syncStatus, score: syncScore, progress: syncProgress })
      setShowSyncModal(null)
    } catch {
      alert('Sync failed. Check your login or try again.')
    }
    setSyncing(false)
  }

  const saveTrackerLink = (tracker: string, entry: { id: number; title: string; score?: number; status?: string; progress?: number }) => {
    const all = getTrackerLinks()
    all[trackerKey] = { ...(all[trackerKey] || {}), [tracker]: entry }
    localStorage.setItem(TRACKER_LINKS_KEY, JSON.stringify(all))
    setTrackerLinksState(all[trackerKey])
  }

  const removeTrackerLink = (tracker: string) => {
    const all = getTrackerLinks()
    if (all[trackerKey]) { delete all[trackerKey][tracker]; if (Object.keys(all[trackerKey]).length === 0) delete all[trackerKey] }
    localStorage.setItem(TRACKER_LINKS_KEY, JSON.stringify(all))
    setTrackerLinksState(all[trackerKey] || {})
  }

  const searchTracker = async (query: string, tracker: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi') => {
    setTrackerSearching(true)
    setTrackerResults([])
    try {
      if (tracker === 'anilist') {
        const body = { query: `query($q:String){Page(perPage:5){media(search:$q,type:MANGA){id title{romaji}coverImage{medium}startDate{year}averageScore}}}`, variables: { q: query } }
        const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const d = await r.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrackerResults((d.data?.Page?.media ?? []).map((m: any) => ({ id: m.id, title: m.title.romaji, cover: m.coverImage?.medium, year: m.startDate?.year, score: m.averageScore })))
      } else if (tracker === 'mal') {
        const token = localStorage.getItem('mal-token')
        if (!token) { alert('Log in to MAL first in Settings.'); return }
        const r = await api.post('/auth/mal/search', { access_token: token, query })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrackerResults((r.data?.results ?? []).map((m: any) => ({ id: m.id, title: m.title, cover: m.cover_url, year: m.year })))
      } else if (tracker === 'mangaupdates') {
        const token = localStorage.getItem('mangaupdates-token')
        if (!token) { alert('Add MangaUpdates API token in Settings.'); return }
        const r = await fetch(`https://api.mangaupdates.com/v1/series/search`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ search: query, perpage: 5 }),
        })
        const d = await r.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrackerResults((d.results ?? []).map((m: any) => ({ id: m.record?.series_id, title: m.record?.title, cover: m.record?.image?.url?.original, year: m.record?.year })))
      } else if (tracker === 'shikimori') {
        const r = await fetch(`https://shikimori.one/api/mangas?search=${encodeURIComponent(query)}&limit=5`, {
          headers: { 'User-Agent': 'manga-dl/1.0' }
        })
        const d = await r.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrackerResults((d ?? []).map((m: any) => ({ id: m.id, title: m.name, cover: m.image?.preview ? `https://shikimori.one${m.image.preview}` : undefined, year: m.aired_on?.split('-')[0] })))
      } else if (tracker === 'bangumi') {
        const r = await fetch(`https://api.bgm.tv/v0/search/subjects?type=1&limit=5`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: query }),
        })
        const d = await r.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrackerResults((d.data ?? []).map((m: any) => ({ id: m.id, title: m.name_cn || m.name, cover: m.images?.common, year: m.date?.split('-')[0] })))
      }
    } catch { /* silent */ }
    setTrackerSearching(false)
  }

  const linkTracker = async (tracker: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi', result: { id: number; title: string; score?: number; status?: string; progress?: number }) => {
    if (tracker === 'anilist') {
      try {
        const token = localStorage.getItem('anilist-token')
        if (token) {
          const body = { query: `query($id:Int){Media(id:$id,type:MANGA){mediaListEntry{status score progress}}}`, variables: { id: result.id } }
          const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
          const d = await r.json()
          const entry = d.data?.Media?.mediaListEntry
          if (entry) { result.status = entry.status; result.score = entry.score; result.progress = entry.progress }
        }
      } catch { /* non-fatal */ }
    }
    saveTrackerLink(tracker, result)
    setShowTrackerModal(null)
  }

  useEffect(() => {
    if (!('Capacitor' in window)) return
    import('@capacitor/core').then(({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return
      import('@capacitor/app').then(({ App }) => {
        const handle = App.addListener('backButton', () => navigate(-1))
        return () => { handle.then((h: { remove(): void }) => h.remove()) }
      }).catch(() => {})
    }).catch(() => {})
  }, [navigate])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email || null)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const fetchManga = async () => {
      try {
        const ext = provider ? ExtensionManager.getInstance().extensions.get(provider) : null
        if (!ext) throw new Error(`No extension loaded for provider: ${provider}`)
        const mangaData = await ext.getMangaDetail(mangaId ?? '') as MangaDetail
        
        if (provider && mangaId) {
          const override = getMangaOverride(provider, mangaId)
          if (override.title) mangaData.title = override.title
          if (override.cover_url) mangaData.cover_url = override.cover_url
          if (override.description) mangaData.description = override.description
        }

        setManga(mangaData)
        if (provider && mangaId) {
          setReadChapters(getReadChapters(provider, mangaId))
          try {
            const bm = JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')
            setBookmarks(new Set(bm[`${provider}:${mangaId}`] || []))
          } catch { /* non-fatal */ }
          const savedNote = getMangaNote(provider, mangaId)
          setUserNote(savedNote.note)
          setUserRating(savedNote.rating)
          setNoteDraft(savedNote.note)
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
        chapters_read: readChapters.size,
      })
      alert(`Marked "${manga.title}" as Reading on MAL (${readChapters.size} chapters read)!`)
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
      const meta = manga ? {
        title: manga.title,
        cover_url: manga.cover_url ?? null,
        description: manga.description ?? null,
        status: manga.status ?? null,
        genres: manga.genres ?? [],
        authors: manga.authors ?? [],
        url: manga.url ?? '',
      } : {}
      const res = await api.post(`/manga/subscribe/${provider}/${mangaId}`, meta)
      setSubscribed(res.data.subscribed)
    } catch (err) {
      console.error(err)
    } finally {
      setSubscribing(false)
    }
  }

  useEffect(() => {
    if (!manga?.cover_url) return
    const fac = new FastAverageColor()
    const proxyUrl = `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`
    fac.getColorAsync(proxyUrl, { algorithm: 'dominant', crossOrigin: 'anonymous' })
      .then(color => setThemeColor(color.rgba))
      .catch(() => {})
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

  const toggleBookmark = (chapterId: string) => {
    const key = `${provider}:${mangaId}`
    const next = new Set(bookmarks)
    if (next.has(chapterId)) next.delete(chapterId); else next.add(chapterId)
    setBookmarks(next)
    try {
      const bm = JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')
      bm[key] = [...next]
      localStorage.setItem('manga-dl-bookmarks', JSON.stringify(bm))
    } catch { /* non-fatal */ }
  }

  const toggleReadChapter = (chapterId: string) => {
    if (!provider || !mangaId) return
    if (readChapters.has(chapterId)) {
      markUnread(provider, mangaId, chapterId)
      setReadChapters(prev => { const s = new Set(prev); s.delete(chapterId); return s })
    } else {
      markRead(provider, mangaId, chapterId)
      setReadChapters(prev => new Set([...prev, chapterId]))
    }
  }

  const scanlators = useMemo(() => {
    if (!manga) return []
    const set = new Set<string>()
    manga.chapters.forEach(c => {
      const match = c.title.match(/\[([^\]]+)\]/)
      if (match) set.add(match[1])
    })
    return [...set]
  }, [manga])

  const resumeTarget = useMemo(() => {
    if (!manga?.chapters.length) return null
    const sorted = [...manga.chapters].sort((a, b) => a.number - b.number)
    const firstUnread = sorted.find(c => !readChapters.has(c.id))
    const hasRead = readChapters.size > 0
    const target = firstUnread ?? sorted[0]
    return { chapter: target, label: hasRead && firstUnread ? 'Resume' : 'Start' }
  }, [manga, readChapters])

  const displayedChapters = useMemo(() => {
    if (!manga) return []
    let list = [...manga.chapters]
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase()
      list = list.filter(c => c.title.toLowerCase().includes(q) || String(c.number).includes(q))
    }
    if (scanlatorFilter !== 'all') {
      list = list.filter(c => c.title.includes(`[${scanlatorFilter}]`))
    }
    if (readFilter === 'unread') list = list.filter(c => !readChapters.has(c.id))
    if (readFilter === 'read') list = list.filter(c => readChapters.has(c.id))
    switch (chapterSort) {
      case 'newest': list.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')); break
      case 'oldest': list.sort((a, b) => (a.published_at || '').localeCompare(b.published_at || '')); break
      case 'num-asc': list.sort((a, b) => a.number - b.number); break
      case 'num-desc': list.sort((a, b) => b.number - a.number); break
    }
    return list
  }, [manga, chapterSort, chapterSearch, readFilter, scanlatorFilter, readChapters])

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
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column: Cover & Details */}
          <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto no-scrollbar">
            <div className="flex flex-col md:flex-row lg:flex-col gap-8 md:gap-12">
              {/* Cover Art */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-48 md:w-64 shrink-0 mx-auto md:mx-0 lg:mx-auto"
              >
            <div 
              className="aspect-[3/4.5] glass-panel p-2 shadow-2xl transition-shadow duration-1000"
              style={{ boxShadow: `0 25px 50px -12px ${themeColor}` }}
            >
              <img
                ref={imgRef}
                src={manga.cover_url ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}` : ''}
                alt={manga.title}
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
              <div className="flex items-start gap-3 mb-4">
                <h1 className="text-3xl md:text-6xl font-black tracking-tighter leading-tight text-white flex-1">
                  {manga.title}
                </h1>
                <button
                  onClick={openMetaEdit}
                  title="Edit metadata"
                  className="mt-2 p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              
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

              <div className="glass-panel p-6 border-white/5 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Synopsis
                </h3>
                <p className="text-white/60 leading-relaxed line-clamp-4 md:line-clamp-none text-sm md:text-base font-medium">
                  {manga.description || 'No description available for this series.'}
                </p>
              </div>

              {/* Personal rating + notes */}
              <div className="glass-panel p-6 border-white/5 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/20 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    My Rating & Notes
                  </h3>
                  <button
                    onClick={() => { setNoteEditing(e => !e); setNoteDraft(userNote) }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>

                {/* Star rating */}
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => {
                        const newRating = star === userRating ? 0 : star
                        setUserRating(newRating)
                        if (provider && mangaId) setMangaRating(provider, mangaId, newRating)
                      }}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "w-6 h-6 transition-colors",
                          star <= userRating ? "text-amber-400 fill-amber-400" : "text-white/20"
                        )}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="ml-2 text-sm font-bold text-amber-400 self-center">{userRating}/5</span>
                  )}
                </div>

                {/* Note */}
                {noteEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Write a personal note about this manga..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (provider && mangaId) { setMangaNote(provider, mangaId, noteDraft); setUserNote(noteDraft) }
                          setNoteEditing(false)
                        }}
                        className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                      >Save</button>
                      <button
                        onClick={() => { setNoteEditing(false); setNoteDraft(userNote) }}
                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                      >Cancel</button>
                    </div>
                  </div>
                ) : userNote ? (
                  <p className="text-sm text-white/50 italic leading-relaxed">&ldquo;{userNote}&rdquo;</p>
                ) : (
                  <p className="text-xs text-white/20 italic">No personal notes yet — click the icon to add one.</p>
                )}
              </div>
            </motion.div>

            {/* Tracker Links */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="p-6 glass-card border-white/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <ListPlus className="w-3.5 h-3.5" />
                Tracker Links
              </h3>
              <div className="space-y-2">
                {(['anilist', 'mal', 'mangaupdates', 'shikimori', 'bangumi'] as const).map(tracker => {
                  const link = trackerLinks[tracker]
                  return (
                    <div key={tracker} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                          tracker === 'anilist' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          tracker === 'mal' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          tracker === 'mangaupdates' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          tracker === 'shikimori' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}>
                          {tracker === 'anilist' ? 'AniList' : tracker === 'mal' ? 'MAL' : tracker === 'mangaupdates' ? 'MU' : tracker === 'shikimori' ? 'Shiki' : 'BGM'}
                        </span>
                        {link ? (
                          <>
                            <span className="text-xs font-bold text-white/70 truncate">{link.title}</span>
                            {link.score != null && link.score > 0 && <span className="text-[10px] text-amber-400 shrink-0">★ {link.score}</span>}
                            {link.status && <span className="text-[10px] text-white/30 uppercase shrink-0">{link.status}</span>}
                            {link.progress != null && <span className="text-[10px] text-white/20 shrink-0">Ch.{link.progress}</span>}
                          </>
                        ) : (
                          <span className="text-xs text-white/20">Not linked</span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {link ? (
                          <>
                            {(tracker === 'anilist' || tracker === 'mal') && (
                              <button
                                onClick={() => openSyncModal(tracker)}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400/60 hover:text-emerald-400 transition-colors"
                              >
                                Sync
                              </button>
                            )}
                            <button onClick={() => removeTrackerLink(tracker)} className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors">
                              Unlink
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setShowTrackerModal(tracker); setTrackerSearch(manga.title); setTrackerResults([]); setTimeout(() => searchTracker(manga.title, tracker), 100) }}
                            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/30 hover:border-white/20 hover:text-white/60 transition-all"
                          >
                            Link
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tracker Search Modal */}
        <AnimatePresence>
          {showTrackerModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowTrackerModal(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel w-full max-w-md p-6 border-white/10"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="font-bold text-lg mb-4">
                  Link to {showTrackerModal === 'anilist' ? 'AniList' : 'MAL'}
                </h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={trackerSearch}
                    onChange={e => setTrackerSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchTracker(trackerSearch, showTrackerModal)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                    placeholder="Search manga title..."
                  />
                  <button
                    onClick={() => searchTracker(trackerSearch, showTrackerModal)}
                    disabled={trackerSearching}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {trackerSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {trackerResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => linkTracker(showTrackerModal, result)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-left border border-transparent hover:border-white/10"
                    >
                      {result.cover && <img src={result.cover} alt="" className="w-10 h-14 object-cover rounded-lg shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{result.title}</p>
                        {result.year && <p className="text-[10px] text-white/30">{result.year}</p>}
                        {result.score && <p className="text-[10px] text-amber-400">★ {result.score}</p>}
                      </div>
                    </button>
                  ))}
                  {!trackerSearching && trackerResults.length === 0 && trackerSearch && (
                    <p className="text-xs text-white/20 text-center py-6">No results. Try a different title.</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column: Chapters */}
      <div className="flex-1 lg:mt-0">
        {/* Chapters Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 lg:mt-0"
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
              {isAdmin && (
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
              )}
              {isAdmin && subscribed && (
                <button
                  onClick={toggleNotif}
                  title={notifEnabled ? 'Mute notifications for this manga' : 'Unmute notifications for this manga'}
                  className={cn(
                    "p-2.5 rounded-xl transition-all border text-xs font-bold disabled:opacity-50",
                    notifEnabled
                      ? "bg-white/5 border-white/10 text-white/40 hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-400"
                      : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  )}
                >
                  {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
              )}
              {isAdmin && (
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
              )}
            </div>
            </div>

            {/* Sort + Search + Filter bar */}
            <div className="flex flex-col gap-3">
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
                  <select value={chapterSort} onChange={e => setChapterSort(e.target.value as typeof chapterSort)}
                    className="select-styled text-xs">
                    <option value="default">Default</option>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="num-desc">Highest #</option>
                    <option value="num-asc">Lowest #</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {/* Read filter */}
                {(['all','unread','read'] as const).map(f => (
                  <button key={f} onClick={() => setReadFilter(f)}
                    className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                      readFilter === f ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/30 hover:border-white/10"
                    )}
                  >{f}</button>
                ))}
                {/* Scanlator filter */}
                {scanlators.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-2">
                    <Filter className="w-3 h-3 text-white/30" />
                    <select value={scanlatorFilter} onChange={e => setScanlatorFilter(e.target.value)}
                      className="select-styled text-[10px]">
                      <option value="all">All Groups</option>
                      {scanlators.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {/* Bulk mark all read */}
                <button
                  onClick={() => {
                    if (!manga || !provider || !mangaId) return
                    markAllRead(provider, mangaId, manga.chapters.map(c => c.id))
                    setReadChapters(new Set(manga.chapters.map(c => c.id)))
                  }}
                  className="ml-auto px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 text-white/30 hover:text-emerald-400 hover:border-emerald-500/30 transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3 h-3" /> Mark All Read
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedChapters.map((chapter) => {
              const isChRead = readChapters.has(chapter.id)
              const isBookmarked = bookmarks.has(chapter.id)
              const isSwiped = swipedChapterId === chapter.id
              return (
              <div key={chapter.id} className="relative overflow-hidden rounded-2xl">
                {/* Swipe action tray (revealed behind row) */}
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 px-2 bg-neutral-900">
                  <button onClick={() => { toggleBookmark(chapter.id); setSwipedChapterId(null) }}
                    className={cn("p-2.5 rounded-xl transition-all", isBookmarked ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/40 hover:text-amber-400")}
                    title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                  >{isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}</button>
                  <button onClick={() => { toggleReadChapter(chapter.id); setSwipedChapterId(null) }}
                    className={cn("p-2.5 rounded-xl transition-all", isChRead ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/40 hover:text-emerald-400")}
                    title={isChRead ? "Mark unread" : "Mark read"}
                  >{isChRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  {isAdmin && (
                    <button onClick={() => { handleDownload(chapter.id); setSwipedChapterId(null) }}
                      disabled={downloading.includes(chapter.id)}
                      className="p-2.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all"
                      title="Download"
                    >{downloading.includes(chapter.id) ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}</button>
                  )}
                </div>

                {/* Chapter row (slides left on swipe) */}
                <div
                  className={cn(
                    "group flex items-center justify-between p-4 glass-card hover:bg-white/5 transition-all border-white/5 relative z-10",
                    isChRead && "opacity-50 hover:opacity-100",
                    isSwiped ? (isAdmin ? "-translate-x-[140px]" : "-translate-x-[90px]") : "translate-x-0",
                    "transition-transform duration-200"
                  )}
                  onPointerDown={(e) => { swipeStartX.current = e.clientX }}
                  onPointerUp={(e) => {
                    const delta = e.clientX - swipeStartX.current
                    if (delta < -50) setSwipedChapterId(chapter.id)
                    else if (delta > 20) setSwipedChapterId(null)
                  }}
                  onClick={() => { if (isSwiped) setSwipedChapterId(null) }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isBookmarked && <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <h4 className={cn("font-bold truncate transition-colors", isChRead ? "text-white/40 group-hover:text-white/70" : "text-white/90 group-hover:text-red-400")}>
                        {chapter.title}
                      </h4>
                    </div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                      {chapter.published_at || 'Recently updated'}
                      {isChRead && <span className="text-emerald-500/60 ml-2">· Read</span>}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); toggleBookmark(chapter.id) }}
                      className={cn("p-2 rounded-lg transition-all border",
                        isBookmarked ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "border-transparent text-white/20 hover:text-amber-400 opacity-0 group-hover:opacity-100"
                      )} title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                    >
                      {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleReadChapter(chapter.id) }}
                      className={cn("p-2 rounded-lg transition-all border opacity-0 group-hover:opacity-100",
                        isChRead ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "border-transparent text-white/20 hover:text-emerald-400"
                      )} title={isChRead ? "Mark unread" : "Mark read"}
                    >
                      {isChRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const targetUrl = buildSmartReadUrl(provider || '', manga.id, chapter.id, manga.title, chapter.title)
                        navigate(targetUrl)
                      }}
                      className="p-3 rounded-xl transition-all border bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white hover:border-violet-500 shadow-lg"
                      title="Read Online"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(chapter.id) }}
                        disabled={downloading.includes(chapter.id)}
                        className={cn(
                          "p-3 rounded-xl transition-all border shadow-lg",
                          downloading.includes(chapter.id)
                            ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400 cursor-default"
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-red-600 hover:border-red-600 hover:shadow-red-600/20"
                        )}
                      >
                        {downloading.includes(chapter.id) ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  </div>

      {/* Tracker Sync Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSyncModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm glass-panel p-6 space-y-4"
            >
              <h3 className="font-black text-lg flex items-center gap-2">
                <ListPlus className="w-4 h-4" />
                Sync to {showSyncModal === 'anilist' ? 'AniList' : 'MAL'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Status</label>
                  <select value={syncStatus} onChange={e => setSyncStatus(e.target.value)} className="select-styled w-full">
                    <option value="CURRENT">Reading</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PAUSED">On Hold</option>
                    <option value="DROPPED">Dropped</option>
                    <option value="PLANNING">Plan to Read</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Score (0–10)</label>
                    <input type="number" min={0} max={10} value={syncScore} onChange={e => setSyncScore(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Chapters Read</label>
                    <input type="number" min={0} value={syncProgress} onChange={e => setSyncProgress(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Start Date</label>
                    <input type="date" value={syncStartDate} onChange={e => setSyncStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Finish Date</label>
                    <input type="date" value={syncEndDate} onChange={e => setSyncEndDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleTrackerSync} disabled={syncing} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {syncing ? 'Syncing…' : 'Sync'}
                </button>
                <button onClick={() => setShowSyncModal(null)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white font-bold text-sm transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metadata Edit Modal */}
      <AnimatePresence>
        {editingMeta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingMeta(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg glass-panel p-6 space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-lg flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit Metadata</h3>
                <button onClick={() => setEditingMeta(false)} className="text-white/30 hover:text-white text-lg">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Title</label>
                  <input
                    value={metaDraft.title}
                    onChange={e => setMetaDraft(d => ({ ...d, title: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Cover URL</label>
                  <input
                    value={metaDraft.cover_url}
                    onChange={e => setMetaDraft(d => ({ ...d, cover_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Description</label>
                  <textarea
                    value={metaDraft.description}
                    onChange={e => setMetaDraft(d => ({ ...d, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveMetaEdit} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all">Save</button>
                <button onClick={() => setEditingMeta(false)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white font-bold text-sm transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Resume/Start FAB */}
      {resumeTarget && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          onClick={() => {
            const ch = resumeTarget.chapter
            const targetUrl = buildSmartReadUrl(provider || '', manga!.id, ch.id, manga!.title, ch.title)
            navigate(targetUrl)
          }}
          className="fixed bottom-28 right-5 md:bottom-8 md:right-8 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-600/30 hover:-translate-y-0.5 transition-all"
          style={{ boxShadow: '0 8px 30px rgba(220,38,38,.4)' }}
        >
          <Play className="w-4 h-4 fill-current" />
          {resumeTarget.label}
        </motion.button>
      )}
    </div>
  )
}

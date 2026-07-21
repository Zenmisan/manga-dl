import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { FastAverageColor } from 'fast-average-color'
import { markRead, markUnread, markAllRead, getReadChapters } from '../lib/readTracking'
import { ExtensionManager } from '../lib/extensions'
import { getMangaNote } from '../lib/mangaNotes'
import { setMangaOverride, getMangaOverride } from '../lib/metaOverrides'
import { supabase } from '../lib/supabase'

export interface Chapter {
  id: string
  title: string
  number: number
  published_at: string | null
}

export interface MangaDetail {
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

const fac = new FastAverageColor()

export function useMangaDetail() {
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

  const searchTracker = async (query: string, tracker: string | null) => {
    if (!query.trim() || !tracker) return
    setTrackerSearching(true)
    try {
      if (tracker === 'anilist') {
        const res = await api.get(`/auth/anilist/search?q=${encodeURIComponent(query)}`)
        setTrackerResults(res.data)
      } else if (tracker === 'mal') {
        const token = localStorage.getItem('mal-token')
        if (!token) { alert('Log in to MyAnimeList first in Settings'); setTrackerSearching(false); return }
        const res = await api.get(`/auth/mal/search?q=${encodeURIComponent(query)}&access_token=${token}`)
        setTrackerResults(res.data)
      }
    } catch {
      setTrackerResults([])
    }
    setTrackerSearching(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (provider && mangaId) {
      setReadChapters(getReadChapters(provider, mangaId))
      const n = getMangaNote(provider, mangaId)
      setUserNote(n.note)
      setUserRating(n.rating)
      setNoteDraft(n.note)
    }
  }, [provider, mangaId])

  useEffect(() => {
    if (!provider || !mangaId) return
    setLoading(true)
    api.get(`/manga/detail/${provider}/${mangaId}`)
      .then((res) => {
        const override = getMangaOverride(provider, mangaId)
        const data = override ? { ...res.data, title: override.title || res.data.title, cover_url: override.cover_url || res.data.cover_url, description: override.description || res.data.description } : res.data
        setManga(data)
        setLoading(false)
      })
      .catch(() => {
        const mgr = ExtensionManager.getInstance()
        const ext = provider ? mgr.extensions.get(provider) : undefined
        if (ext) {
          (ext.getMangaDetail(mangaId!) as Promise<{ id: string; title: string; cover_url: string | null; description: string | null; status: string | null; genres?: string[]; authors?: string[]; url?: string; chapters?: Array<{ id: string; name?: string; chapter_number?: number }> }>)
            .then((details) => {
              const chList = details.chapters || []
              const combined: MangaDetail = {
                id: details.id,
                title: details.title,
                cover_url: details.cover_url,
                description: details.description,
                status: details.status,
                genres: details.genres || [],
                authors: details.authors || [],
                provider: provider!,
                url: details.url || '',
                chapters: chList.map((c: { id: string; name?: string; chapter_number?: number }) => ({ id: c.id, title: c.name || c.id, number: c.chapter_number || 0, published_at: null })),
              }
              const override = getMangaOverride(provider!, mangaId!)
              setManga(override ? { ...combined, title: override.title || combined.title, cover_url: override.cover_url || combined.cover_url, description: override.description || combined.description } : combined)
              setLoading(false)
            }).catch(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
  }, [provider, mangaId])

  useEffect(() => {
    if (!manga?.cover_url) return
    const proxyUrl = `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = proxyUrl
    img.onload = () => {
      fac.getColorAsync(img, { algorithm: 'dominant' })
        .then((color) => {
          const rgba = color.rgba.replace(/[\d.]+\)$/, '0.4)')
          setThemeColor(rgba)
        })
        .catch(() => {})
    }
  }, [manga?.cover_url])

  useEffect(() => {
    if (!manga || !provider) return
    api.get('/subscriptions')
      .then(res => {
        const exists = res.data.some((s: { provider_id: string; manga_id: string }) =>
          s.provider_id === provider && s.manga_id === manga.id
        )
        setSubscribed(exists)
      })
      .catch(() => {})
  }, [manga, provider])

  const handleSubscribe = async () => {
    if (!manga || !provider) return
    setSubscribing(true)
    try {
      if (subscribed) {
        await api.delete(`/subscriptions/${provider}/${manga.id}`)
        setSubscribed(false)
      } else {
        await api.post('/subscriptions', {
          provider_id: provider,
          manga_id: manga.id,
          manga_title: manga.title,
          cover_url: manga.cover_url,
        })
        setSubscribed(true)
      }
    } catch {
      alert('Failed to update subscription status.')
    } finally {
      setSubscribing(false)
    }
  }

  const handleDownload = async (chapter: Chapter) => {
    if (!manga || !provider) return
    setDownloading((prev) => [...prev, chapter.id])
    setShowQueueLink(true)
    try {
      await api.post('/downloads/queue', {
        provider_id: provider,
        manga_id: manga.id,
        chapter_id: chapter.id,
      })
    } catch {
      alert('Failed to queue download')
    } finally {
      setTimeout(() => {
        setDownloading((prev) => prev.filter((id) => id !== chapter.id))
      }, 1000)
    }
  }

  const handleBulkDownload = async () => {
    if (!manga || !provider) return
    setBulkLoading(true)
    setShowQueueLink(true)
    try {
      await api.post('/downloads/bulk', {
        provider_id: provider,
        manga_id: manga.id,
      })
    } catch {
      alert('Failed to queue bulk downloads')
    } finally {
      setBulkLoading(false)
    }
  }

  const toggleBookmark = (chId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(bookmarks)
    if (next.has(chId)) next.delete(chId)
    else next.add(chId)
    setBookmarks(next)
    const key = `${provider}:${mangaId}`
    const all = JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')
    all[key] = Array.from(next)
    localStorage.setItem('manga-dl-bookmarks', JSON.stringify(all))
  }

  const toggleReadStatus = (chId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!provider || !mangaId) return
    if (readChapters.has(chId)) {
      markUnread(provider, mangaId, chId)
      setReadChapters(prev => { const n = new Set(prev); n.delete(chId); return n })
    } else {
      markRead(provider, mangaId, chId)
      setReadChapters(prev => new Set(prev).add(chId))
    }
  }

  const handleMarkAllRead = () => {
    if (!provider || !mangaId || !manga) return
    const allIds = manga.chapters.map(c => c.id)
    markAllRead(provider, mangaId, allIds)
    setReadChapters(new Set(allIds))
  }

  const handleMALSync = async () => {
    if (!manga || !malToken) return
    setMalSyncing(true)
    try {
      const searchRes = await api.get(`/auth/mal/search?q=${encodeURIComponent(manga.title)}&access_token=${malToken}`)
      if (searchRes.data && searchRes.data.length > 0) {
        const malId = searchRes.data[0].id
        await api.post('/auth/mal/track', {
          access_token: malToken,
          manga_id: malId,
          status: 'reading',
          chapters_read: readChapters.size,
        })
        alert(`Synced "${manga.title}" to MyAnimeList (Reading, ${readChapters.size} chapters)!`)
      } else {
        alert(`Could not find "${manga.title}" on MyAnimeList.`)
      }
    } catch {
      alert('MAL Sync failed. Check your credentials in Settings.')
    }
    setMalSyncing(false)
  }

  const scanlators = useMemo(() => {
    if (!manga) return []
    const set = new Set<string>()
    for (const c of manga.chapters) {
      const match = c.title?.match(/\[(.*?)\]|\((.*?)\)/)
      if (match) set.add(match[1] || match[2])
    }
    return Array.from(set)
  }, [manga])

  const displayedChapters = useMemo(() => {
    if (!manga) return []
    let list = [...manga.chapters]
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase()
      list = list.filter(c => c.title.toLowerCase().includes(q) || String(c.number).includes(q))
    }
    if (scanlatorFilter !== 'all') {
      list = list.filter(c => c.title.includes(`[${scanlatorFilter}]`) || c.title.includes(`(${scanlatorFilter})`))
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

  const resumeTarget = useMemo(() => {
    if (!manga || manga.chapters.length === 0) return null
    const sorted = [...manga.chapters].sort((a, b) => a.number - b.number)
    const firstUnread = sorted.find(c => !readChapters.has(c.id))
    if (firstUnread) {
      return { chapter: firstUnread, label: `Resume Ch. ${firstUnread.number}` }
    }
    const last = sorted[sorted.length - 1]
    return { chapter: last, label: `Re-read Ch. ${last.number}` }
  }, [manga, readChapters])

  return {
    provider, mangaId, navigate, manga, loading, downloading, showQueueLink,
    bulkLoading, isAdmin, subscribed, subscribing, handleSubscribe,
    handleDownload, handleBulkDownload, chapterSort, setChapterSort,
    chapterSearch, setChapterSearch, readFilter, setReadFilter,
    scanlatorFilter, setScanlatorFilter, bookmarks, toggleBookmark,
    readChapters, toggleReadStatus, handleMarkAllRead, malSyncing, handleMALSync,
    userNote, setUserNote, userRating, setUserRating, noteEditing, setNoteEditing,
    noteDraft, setNoteDraft, malToken, themeColor, swipedChapterId, setSwipedChapterId,
    swipeStartX, imgRef, notifEnabled, toggleNotif, editingMeta, setEditingMeta,
    metaDraft, setMetaDraft, openMetaEdit, saveMetaEdit, trackerLinks, showTrackerModal,
    setShowTrackerModal, trackerSearch, setTrackerSearch, trackerResults, setTrackerResults, trackerSearching,
    searchTracker, showSyncModal, setShowSyncModal, syncStatus, setSyncStatus,
    syncScore, setSyncScore, syncProgress, setSyncProgress, syncStartDate, setSyncStartDate,
    syncEndDate, setSyncEndDate, syncing, openSyncModal, handleTrackerSync,
    saveTrackerLink, removeTrackerLink, scanlators, displayedChapters, resumeTarget,
  }
}

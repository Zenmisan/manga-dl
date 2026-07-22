import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { FastAverageColor } from 'fast-average-color'
import { getReadChapters } from '../lib/readTracking'
import { ExtensionManager } from '../lib/extensions'
import { getMangaNote } from '../lib/mangaNotes'
import { setMangaOverride, getMangaOverride } from '../lib/metaOverrides'
import { supabase } from '../lib/supabase'
import { useMangaTracker } from './useMangaTracker'
import { useMangaChaptersFilter } from './useMangaChaptersFilter'

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

  // Tracker linking sub-hook
  const tracker = useMangaTracker(provider, mangaId)

  // Chapter filtering & sorting sub-hook
  const chapterFilter = useMangaChaptersFilter(provider, mangaId, manga, readChapters, setReadChapters)

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
      .catch(async () => {
        const mgr = ExtensionManager.getInstance()
        const ext = provider ? await mgr.getExtension(provider) : undefined
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
                chapters: chList.map((c: { id: string; name?: string; title?: string; chapter_number?: number }) => ({
                  id: c.id,
                  title: c.title || c.name || (c.chapter_number ? `Chapter ${c.chapter_number}` : 'Chapter 1'),
                  number: c.chapter_number || 0,
                  published_at: null
                })),
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

  return {
    provider, mangaId, navigate, manga, loading, downloading, showQueueLink,
    bulkLoading, isAdmin, subscribed, subscribing, handleSubscribe,
    handleDownload, handleBulkDownload, chapterSort: chapterFilter.chapterSort, setChapterSort: chapterFilter.setChapterSort,
    chapterSearch: chapterFilter.chapterSearch, setChapterSearch: chapterFilter.setChapterSearch, readFilter: chapterFilter.readFilter, setReadFilter: chapterFilter.setReadFilter,
    scanlatorFilter: chapterFilter.scanlatorFilter, setScanlatorFilter: chapterFilter.setScanlatorFilter, bookmarks: chapterFilter.bookmarks, toggleBookmark: chapterFilter.toggleBookmark,
    readChapters, toggleReadStatus: chapterFilter.toggleReadStatus, handleMarkAllRead: chapterFilter.handleMarkAllRead, malSyncing, handleMALSync,
    userNote, setUserNote, userRating, setUserRating, noteEditing, setNoteEditing,
    noteDraft, setNoteDraft, malToken, themeColor, swipedChapterId, setSwipedChapterId,
    swipeStartX, imgRef, notifEnabled, toggleNotif, editingMeta, setEditingMeta,
    metaDraft, setMetaDraft, openMetaEdit, saveMetaEdit, trackerLinks: tracker.trackerLinks, showTrackerModal: tracker.showTrackerModal,
    setShowTrackerModal: tracker.setShowTrackerModal, trackerSearch: tracker.trackerSearch, setTrackerSearch: tracker.setTrackerSearch, trackerResults: tracker.trackerResults, setTrackerResults: tracker.setTrackerResults, trackerSearching: tracker.trackerSearching,
    searchTracker: tracker.searchTracker, showSyncModal: tracker.showSyncModal, setShowSyncModal: tracker.setShowSyncModal, syncStatus: tracker.syncStatus, setSyncStatus: tracker.setSyncStatus,
    syncScore: tracker.syncScore, setSyncScore: tracker.setSyncScore, syncProgress: tracker.syncProgress, setSyncProgress: tracker.setSyncProgress, syncStartDate: tracker.syncStartDate, setSyncStartDate: tracker.setSyncStartDate,
    syncEndDate: tracker.syncEndDate, setSyncEndDate: tracker.setSyncEndDate, syncing: tracker.syncing, openSyncModal: tracker.openSyncModal, handleTrackerSync: tracker.handleTrackerSync,
    saveTrackerLink: tracker.saveTrackerLink, removeTrackerLink: tracker.removeTrackerLink, scanlators: chapterFilter.scanlators, displayedChapters: chapterFilter.displayedChapters, resumeTarget: chapterFilter.resumeTarget,
  }
}

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useToast } from '../components/common/Toast'
import { FastAverageColor } from 'fast-average-color'
import { getReadChapters } from '../lib/readTracking'
import { ExtensionManager, NOVEL_EXTENSION_IDS } from '../lib/extensions'
import { clientDownloader } from '../lib/clientDownloader'
import { getMangaNote } from '../lib/mangaNotes'
import { setMangaOverride, getMangaOverride } from '../lib/metaOverrides'
import { supabase } from '../lib/supabase'
import { useMangaTracker } from './useMangaTracker'
import { useMangaChaptersFilter } from './useMangaChaptersFilter'

import { resolveSmartManga } from '../lib/smartUrl'

export interface Chapter {
  id: string
  title: string
  number: number
  published_at: string | null
  scanlator?: string
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
  type?: 'manga' | 'novel'
}

const fac = new FastAverageColor()

export function useMangaDetail() {
  const { provider: rawProvider, '*': rawMangaId } = useParams()
  const navigate = useNavigate()

  let provider = rawProvider
  let mangaId = rawMangaId

  if (rawProvider && !rawMangaId) {
    const resolved = resolveSmartManga(rawProvider)
    if (resolved) {
      provider = resolved.provider
      mangaId = resolved.mangaId
    }
  } else if (rawProvider === 'detail' && rawMangaId) {
    const resolved = resolveSmartManga(rawMangaId)
    if (resolved) {
      provider = resolved.provider
      mangaId = resolved.mangaId
    }
  }
  const { show: toast } = useToast()
  const [manga, setManga] = useState<MangaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string[]>(() => clientDownloader.getActiveOrQueuedChapterIds())
  const [showQueueLink, setShowQueueLink] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    return clientDownloader.subscribe(() => {
      setDownloading(clientDownloader.getActiveOrQueuedChapterIds())
    })
  }, [])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

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
      void setMangaOverride(provider, mangaId, {
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
      setUserId(session?.user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null)
      setUserId(session?.user?.id ?? null)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (provider && mangaId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReadChapters(getReadChapters(provider, mangaId))
      const n = getMangaNote(provider, mangaId)
       
      setUserNote(n.note)
       
      setUserRating(n.rating)
       
      setNoteDraft(n.note)
    }
  }, [provider, mangaId])

  useEffect(() => {
    if (!provider || !mangaId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    let isMounted = true

    async function loadDetail() {
      const mgr = ExtensionManager.getInstance()
      const ext = provider ? await mgr.getExtension(provider) : undefined
      if (ext) {
        try {
          const details = await (ext.getMangaDetail(mangaId!) as Promise<{ id: string; title: string; cover_url: string | null; description: string | null; status: string | null; genres?: string[]; authors?: string[]; url?: string; chapters?: Array<{ id: string; name?: string; title?: string; chapter_number?: number }> }>)
          if (!isMounted) return
          const chList = details.chapters || []
          const isNovel = ext.type === 'novel' || (provider ? NOVEL_EXTENSION_IDS.has(provider) : false)
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
            type: isNovel ? 'novel' : 'manga',
            chapters: chList.map((c: { id: string; name?: string; title?: string; chapter_number?: number; number?: number; published_at?: string | null }) => ({
              id: c.id,
              title: c.title || c.name || (c.chapter_number ? `Chapter ${c.chapter_number}` : (c.number ? `Chapter ${c.number}` : 'Chapter 1')),
              number: c.number ?? c.chapter_number ?? 0,
              published_at: c.published_at || null
            })),
          }
          const override = getMangaOverride(provider!, mangaId!)
          setManga(override ? { ...combined, title: override.title || combined.title, cover_url: override.cover_url || combined.cover_url, description: override.description || combined.description, type: combined.type } : combined)
          setLoading(false)
          return
        } catch (err) {
          console.warn('[useMangaDetail] Extension fetch failed, trying backend API:', err)
        }
      }

      // Fallback to backend API if extension not found or extension failed
      try {
        const res = await api.get(`/manga/detail/${provider}/${mangaId}`)
        if (!isMounted) return
        const isNovel = provider ? NOVEL_EXTENSION_IDS.has(provider) : false
        const override = getMangaOverride(provider!, mangaId!)
        const data = override
          ? { ...res.data, title: override.title || res.data.title, cover_url: override.cover_url || res.data.cover_url, description: override.description || res.data.description, type: isNovel ? 'novel' : (res.data.type || 'manga') }
          : { ...res.data, type: isNovel ? 'novel' : (res.data.type || 'manga') }
        setManga(data)
      } catch {
        // Suppress 404 error
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDetail()

    return () => {
      isMounted = false
    }
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
    const key = `${provider}:${manga.id}`
    const scopedSubsKey = `manga-dl-local-subs:${userId ?? 'anon'}`
    const rawLocal = localStorage.getItem(scopedSubsKey)
    const localList: string[] = rawLocal ? JSON.parse(rawLocal) : []
    const isLocalSub = localList.includes(key)

    api.get('/manga/subscriptions')
      .then(res => {
        const exists = res.data.some((s: { provider_id: string; manga_id: string }) =>
          s.provider_id === provider && s.manga_id === manga.id
        )
        setSubscribed(exists || isLocalSub)
      })
      .catch(() => {
        setSubscribed(isLocalSub)
      })
  }, [manga, provider, userId])

  const handleSubscribe = async () => {
    if (!manga || !provider) return
    setSubscribing(true)
    const key = `${provider}:${manga.id}`
    const scopedSubsKey = `manga-dl-local-subs:${userId ?? 'anon'}`
    const scopedMetaKey = `manga-dl-local-sub-meta:${userId ?? 'anon'}`
    const rawLocal = localStorage.getItem(scopedSubsKey)
    let localList: string[] = rawLocal ? JSON.parse(rawLocal) : []

    try {
      if (subscribed) {
        localList = localList.filter(k => k !== key)
        localStorage.setItem(scopedSubsKey, JSON.stringify(localList))
        const metaStore: Record<string, unknown> = JSON.parse(localStorage.getItem(scopedMetaKey) || '{}')
        delete metaStore[key]
        localStorage.setItem(scopedMetaKey, JSON.stringify(metaStore))
        setSubscribed(false)
        await api.delete(`/manga/subscriptions/${provider}/${manga.id}`).catch(() => {})
      } else {
        if (!localList.includes(key)) localList.push(key)
        localStorage.setItem(scopedSubsKey, JSON.stringify(localList))
        const metaStore: Record<string, { title: string; cover_url: string | null; provider: string; mangaId: string }> = JSON.parse(localStorage.getItem(scopedMetaKey) || '{}')
        metaStore[key] = { title: manga.title, cover_url: manga.cover_url || null, provider, mangaId: manga.id }
        localStorage.setItem(scopedMetaKey, JSON.stringify(metaStore))
        setSubscribed(true)
        await api.post('/manga/subscriptions', {
          provider_id: provider,
          manga_id: manga.id,
          title: manga.title,
          cover_url: manga.cover_url,
        }).catch(() => {})
      }
    } finally {
      setSubscribing(false)
    }
  }

  const handleDownload = (chapter: Chapter) => {
    if (!manga || !provider) return
    setShowQueueLink(true)
    clientDownloader.enqueue({
      provider,
      mangaId: manga.id,
      chapterId: chapter.id,
      mangaTitle: manga.title,
      chapterTitle: chapter.title || `Chapter ${chapter.number}`,
      chapterNumber: chapter.number,
    })
    toast(`Queued ${chapter.title || `Chapter ${chapter.number}`} for download`, 'success')
  }

  const handleBulkDownload = () => {
    if (!manga || !provider || !manga.chapters || manga.chapters.length === 0) return
    setBulkLoading(true)
    setShowQueueLink(true)
    try {
      const items = manga.chapters.map((chapter) => ({
        provider,
        mangaId: manga.id,
        chapterId: chapter.id,
        mangaTitle: manga.title,
        chapterTitle: chapter.title || `Chapter ${chapter.number}`,
        chapterNumber: chapter.number,
      }))
      clientDownloader.enqueueBulk(items)
      toast(`Queued ${items.length} chapters for download`, 'success')
    } catch {
      toast('Failed to queue bulk downloads', 'error')
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
        toast(`Synced "${manga.title}" to MyAnimeList (Reading, ${readChapters.size} chapters)!`, 'success')
      } else {
        toast(`Could not find "${manga.title}" on MyAnimeList.`, 'warning')
      }
    } catch {
      toast('MAL Sync failed. Check your credentials in Settings.', 'error')
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

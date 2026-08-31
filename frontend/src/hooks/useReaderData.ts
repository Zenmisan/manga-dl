import { useState, useEffect, useCallback, useRef } from 'react'
import type { Location } from 'react-router-dom'
import { loadLocalMangaIntoSession, type LocalMangaSession } from '../lib/localLibrary'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { markRead } from '../lib/readTracking'
import { saveLocalHistoryEntry } from '../lib/historyTracking'
import { ExtensionManager } from '../lib/extensions'
import { resolveSmartContext } from '../lib/smartUrl'

export interface OnlineParts {
  provider: string
  mangaId: string
  chapterId: string
  mangaTitle?: string
  chapterTitle?: string
}

interface Params {
  mangaTitle: string | undefined
  filename: string | undefined
  location: Location
  readingMode: string
  incognitoMode: boolean
  upscaling: boolean
  setShowControls: (v: boolean) => void
}

export function useReaderData({ mangaTitle, filename, location, readingMode, incognitoMode, upscaling, setShowControls }: Params) {
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [nextChapterId, setNextChapterId] = useState<string | null>(null)
  const [prevChapterId, setPrevChapterId] = useState<string | null>(null)
  const [isWidePage, setIsWidePage] = useState<boolean[]>([])

  const malAutoSyncedRef = useRef(false)
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onlinePartsRef = useRef<OnlineParts | null>(null)
  const chapterListRef = useRef<{ id: string; number?: number; title?: string }[]>([])

  const getImageUrlForChapter = useCallback((targetFilename: string, pageName: string) => {
    if (!pageName) return ''
    if (mangaTitle === 'local' || mangaTitle === 'online' || pageName.startsWith('http://') || pageName.startsWith('https://') || pageName.startsWith('blob:') || pageName.startsWith('data:')) {
      return pageName
    }
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    const url = `${base}/library/image/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(targetFilename)}/${encodeURIComponent(pageName)}?api_key=${apiKey}`
    return upscaling ? `${url}&upscale=true` : url
  }, [mangaTitle, upscaling])

  const getImageUrl = useCallback((pageName: string) => {
    return getImageUrlForChapter(filename || '', pageName)
  }, [getImageUrlForChapter, filename])

  const saveOnlineProgress = useCallback(async (page: number) => {
    if (incognitoMode) return
    const parts = onlinePartsRef.current
    if (parts) {
      saveLocalHistoryEntry({
        provider: parts.provider,
        manga_id: parts.mangaId,
        chapter_id: parts.chapterId,
        manga_title: parts.mangaTitle || parts.mangaId,
        chapter_title: parts.chapterTitle || `Ch. ${parts.chapterId}`,
        last_page: page,
        updated_at: new Date().toISOString(),
      })
      // localStorage fallback for page progress (used when Supabase auth unavailable)
      try {
        localStorage.setItem(
          `manga-dl-pg:${parts.provider}:${parts.mangaId}:${parts.chapterId}`,
          String(page)
        )
      } catch { /* quota */ }

      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      try {
        await api.put('/users/reading-progress', {
          provider: parts.provider,
          manga_id: parts.mangaId,
          chapter_id: parts.chapterId,
          last_page: page,
          manga_title: parts.mangaTitle,
          chapter_title: parts.chapterTitle,
        })
      } catch { /* silent */ }
    } else if (filename) {
      const title = localTitle || filename
      saveLocalHistoryEntry({
        provider: 'local',
        manga_id: filename,
        chapter_id: filename,
        manga_title: title,
        chapter_title: 'Local Upload',
        last_page: page,
        updated_at: new Date().toISOString(),
      })
      markRead('local', filename, filename)
    }
  }, [incognitoMode, filename, localTitle])

  // MAL + AniList auto-sync on last page
  useEffect(() => {
    if (pages.length === 0 || currentPage !== pages.length || mangaTitle === 'local' || malAutoSyncedRef.current) return
    malAutoSyncedRef.current = true
    const parts = onlinePartsRef.current
    const chapterNumMatch = filename?.match(/(\d+)/)
    const chapterNum = chapterNumMatch ? parseInt(chapterNumMatch[1], 10) : 0

    const autoSync = async () => {
      const malToken = localStorage.getItem('mal-token')
      if (malToken) {
        try {
          let malId: number | null = null
          if (parts) {
            const links = JSON.parse(localStorage.getItem('manga-dl-tracker-links') || '{}')
            malId = links[`${parts.provider}:${parts.mangaId}`]?.mal?.id ?? null
          }
          if (!malId) {
            const searchRes = await api.post('/auth/mal/search', { access_token: malToken, query: mangaTitle })
            malId = searchRes.data?.results?.[0]?.id ?? null
          }
          if (malId) {
            await api.post('/auth/mal/track', { access_token: malToken, manga_id: malId, status: 'reading', chapters_read: chapterNum })
          }
        } catch { /* silent */ }
      }
      const anilistToken = localStorage.getItem('anilist-token')
      if (anilistToken && parts) {
        try {
          const links = JSON.parse(localStorage.getItem('manga-dl-tracker-links') || '{}')
          const anilistId = links[`${parts.provider}:${parts.mangaId}`]?.anilist?.id
          if (anilistId) {
            const mutation = `mutation($id:Int,$progress:Int){SaveMediaListEntry(mediaId:$id,status:CURRENT,progress:$progress){id}}`
            await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anilistToken}` },
              body: JSON.stringify({ query: mutation, variables: { id: anilistId, progress: chapterNum } }),
            })
          }
        } catch { /* silent */ }
      }
    }
    autoSync()
  }, [currentPage, pages.length, mangaTitle, filename])

  // Debounced cloud save
  useEffect(() => {
    if (mangaTitle === 'local' || pages.length === 0) return
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current)
    progressSaveTimerRef.current = setTimeout(() => saveOnlineProgress(currentPage), 1500)
    return () => {
      if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current)
    }
  }, [currentPage, mangaTitle, pages.length, saveOnlineProgress])

  // Main data loader
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
    window.scrollTo(0, 0)
     
    setLoading(true)
     
    setFetchError(null)
     
    setPages([])

    const fetchManifest = async () => {
      let onlineBase64: string | null = null
      if (mangaTitle === 'online' && filename) {
        onlineBase64 = filename
      } else if (mangaTitle && filename && mangaTitle !== 'local') {
        const queryParams = new URLSearchParams(location.search)
        const ctxParam = queryParams.get('ctx')
        onlineBase64 = resolveSmartContext(mangaTitle, filename, ctxParam)
      }

      if (onlineBase64) {
        let decoded: string
        try {
          decoded = decodeURIComponent(escape(atob(onlineBase64)))
        } catch {
          try { decoded = atob(onlineBase64) } catch { decoded = onlineBase64 }
        }
        const parts = decoded.split(/[:|]/)
        const onlineProvider = parts[0]
        const onlineMangaId = parts[1]
        const onlineChapterId = parts[2]
        const onlineMangaTitle = parts[3]
        const onlineChapterTitle = parts[4]
        onlinePartsRef.current = { provider: onlineProvider, mangaId: onlineMangaId, chapterId: onlineChapterId, mangaTitle: onlineMangaTitle, chapterTitle: onlineChapterTitle }

        const base = api.defaults.baseURL || ''
        const apiKey = localStorage.getItem('manga-api-key') || ''
        try {
          const ext = await ExtensionManager.getInstance().getExtension(onlineProvider)
          if (!ext) throw new Error(`No extension loaded for provider: ${onlineProvider}`)
          const rawPages = await ext.getPages(onlineChapterId)
          const skipProxy = (ext as unknown as { skipProxy?: boolean })?.skipProxy ?? false
          const proxyPages: string[] = skipProxy
            ? rawPages
            : rawPages.map((url: string) => {
                // comixto://img? URLs carry DRM params — proxy through descramble endpoint
                if (url.startsWith('comixto://img?')) {
                  const params = url.slice('comixto://img?'.length)
                  return `${base}/manga/descramble-proxy?${params}&api_key=${apiKey}`
                }
                return `${base}/manga/image-proxy?url=${encodeURIComponent(url)}&api_key=${apiKey}`
              })
          setPages(proxyPages)
          setLocalTitle(`Online — Ch. ${onlineChapterId}`)
          try { localStorage.setItem(`manga-dl-last-chapter:${onlineProvider}:${onlineMangaId}`, onlineChapterId) } catch { /* private browsing */ }

          if ('__TAURI_INTERNALS__' in window) {
            import('@tauri-apps/api/core').then(({ invoke }) => {
              invoke('discord_update_presence', {
                details: onlineMangaTitle || 'Reading manga',
                stateText: `Chapter ${onlineChapterTitle || onlineChapterId}`,
              }).catch(() => {})
            }).catch(() => {})
          }

          try {
            const extForChapters = await ExtensionManager.getInstance().getExtension(onlineProvider)
            const detail = extForChapters
              ? await extForChapters.getMangaDetail(onlineMangaId) as { chapters?: { id: string; number: number }[] }
              : null
            const chapters = detail?.chapters ?? []
            // Sort ascending by chapter number for both the dropdown and prev/next logic
            const sorted = [...chapters].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
            chapterListRef.current = sorted
            const sortedIdx = sorted.findIndex(c => c.id === onlineChapterId)
            if (sortedIdx !== -1) {
              setNextChapterId(sortedIdx < sorted.length - 1 ? (sorted[sortedIdx + 1]?.id ?? null) : null)
              setPrevChapterId(sortedIdx > 0 ? (sorted[sortedIdx - 1]?.id ?? null) : null)
            }
          } catch { /* non-fatal */ }

          // Restore page from localStorage fallback first (works offline / no auth)
          const localKey = `manga-dl-pg:${onlineProvider}:${onlineMangaId}:${onlineChapterId}`
          try {
            const localPage = parseInt(localStorage.getItem(localKey) || '1', 10)
            if (localPage > 1) setCurrentPage(localPage)
          } catch { /* private browsing */ }

          // Override with Supabase cloud progress if available
          const { data: session } = await supabase.auth.getSession()
          if (session.session) {
            try {
              const prog = await api.get(
                `/users/reading-progress/${encodeURIComponent(onlineProvider)}/${encodeURIComponent(onlineMangaId)}`,
                { params: { chapter_id: onlineChapterId } }
              )
              if (prog.data.last_page > 1) setCurrentPage(prog.data.last_page)
            } catch { /* no saved progress */ }
          }
        } catch (err) {
          setFetchError((err as { message?: string }).message || 'Failed to load chapter pages from source extension.')
        } finally {
          setLoading(false)
        }
        return
      }

      if (mangaTitle === 'local') {
        const queryParams = new URLSearchParams(location.search)
        let chParam = queryParams.get('ch')
        let targetId = filename || ''

        if (targetId.includes(':')) {
          const parts = targetId.split(':')
          targetId = parts[0]
          chParam = parts[1]
        } else if (targetId.startsWith('ch-')) {
          chParam = targetId
          const existingSession = (window as unknown as Record<string, unknown>).__LOCAL_MANGA_SESSION__ as LocalMangaSession | undefined
          if (existingSession?.localId) {
            targetId = existingSession.localId
          }
        }

        // Restore last-read chapter if no specific chapter was requested
        if (!chParam) {
          try {
            const saved = localStorage.getItem(`manga-dl-last-chapter:local:${targetId}`)
            if (saved) chParam = saved
          } catch { /* private browsing */ }
        }

        const ok = await loadLocalMangaIntoSession(targetId, chParam || undefined)
        const session = (window as unknown as Record<string, unknown>).__LOCAL_MANGA_SESSION__ as LocalMangaSession | undefined

        if (ok && session) {
          // Populate refs BEFORE setLoading(false) so the re-render sees them
          onlinePartsRef.current = { provider: 'local', mangaId: session.localId || targetId, chapterId: session.currentChapterId || 'ch-1', mangaTitle: session.title, chapterTitle: session.chapterTitle || '' }
          const chapters = session.chapters || []
          chapterListRef.current = chapters.map(c => ({ id: c.id, number: c.number, title: c.title }))
          const currentIdx = chapters.findIndex(c => c.id === session.currentChapterId || c.number === session.currentChapterNumber)
          if (currentIdx !== -1) {
            setNextChapterId(currentIdx < chapters.length - 1 ? (chapters[currentIdx + 1]?.id ?? null) : null)
            setPrevChapterId(currentIdx > 0 ? (chapters[currentIdx - 1]?.id ?? null) : null)
          }

          setLocalTitle(`${session.title} — ${session.chapterTitle || 'Chapter ' + session.currentChapterNumber}`)
          setPages(session.pages)
          // Restore saved page position for this chapter
          try {
            const pgKey = `manga-dl-pg:local:${session.localId || targetId}:${session.currentChapterId || 'ch-1'}`
            const savedPage = parseInt(localStorage.getItem(pgKey) || '1', 10)
            if (savedPage > 1) setCurrentPage(savedPage)
          } catch { /* private browsing */ }
          // Save last-read chapter for resume
          try { localStorage.setItem(`manga-dl-last-chapter:local:${session.localId || targetId}`, session.currentChapterId || 'ch-1') } catch { /* private browsing */ }
          setLoading(false)

          if (!incognitoMode) {
            saveLocalHistoryEntry({
              provider: 'local',
              manga_id: session.localId || targetId,
              chapter_id: session.currentChapterId || 'ch-1',
              manga_title: session.title,
              chapter_title: session.chapterTitle || `Chapter ${session.currentChapterNumber}`,
              last_page: 1,
              updated_at: new Date().toISOString(),
            })
            // markRead moved to Reader.tsx — triggers at 80% completion, not on open
          }
          return
        }
        setFetchError('Local session expired or archive file was not found in storage.')
        setLoading(false)
        return
      }

      try {
        const res = await api.get(`/library/read/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}`)
        setPages(res.data.pages)
        if (res.data.last_page > 0) {
          setCurrentPage(res.data.last_page)
          if (readingMode === 'webtoon') {
            setTimeout(() => {
              const el = document.getElementById(`page-${res.data.last_page}`)
              if (el) el.scrollIntoView({ behavior: 'auto' })
            }, 800)
          }
        }
        const libraryRes = await api.get(`/library/${encodeURIComponent(mangaTitle || '')}`)
        const files = libraryRes.data.files
        const currentIdx = files.indexOf(filename)
        if (currentIdx !== -1 && currentIdx < files.length - 1) setNextChapterId(files[currentIdx + 1])
        if (currentIdx > 0) setPrevChapterId(files[currentIdx - 1])
      } catch (err) {
        setFetchError((err as { message?: string }).message || 'Failed to fetch chapter from backend library server.')
      } finally {
        setLoading(false)
      }
    }

    fetchManifest()
    malAutoSyncedRef.current = false
    onlinePartsRef.current = null

    const timer = setTimeout(() => setShowControls(false), 3000)
    return () => {
      clearTimeout(timer)
      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current)
        saveOnlineProgress(currentPage)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mangaTitle, filename, location.search])

  // Spread auto-detection — probe each page's aspect ratio after load
  useEffect(() => {
    if (!pages.length) { setIsWidePage([]); return }
    const results: boolean[] = new Array(pages.length).fill(false)
    let settled = 0
    const done = () => { if (++settled === pages.length) setIsWidePage([...results]) }
    pages.forEach((pageName, i) => {
      const url = getImageUrl(pageName)
      if (!url) { done(); return }
      const img = new Image()
      img.onload = () => { results[i] = img.naturalWidth > img.naturalHeight; done() }
      img.onerror = done
      img.src = url
    })
  }, [pages, getImageUrl])

  // Next chapter prefetch
  useEffect(() => {
    if (!nextChapterId || loading || mangaTitle === 'local') return

    const prefetchNext = async () => {
      try {
        const res = await api.get(`/library/read/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(nextChapterId)}`)
        res.data.pages.slice(0, 5).forEach((page: string) => {
          const img = new Image()
          img.src = getImageUrlForChapter(nextChapterId, page)
        })
      } catch { /* non-fatal */ }
    }

    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        prefetchNext()
        window.removeEventListener('scroll', handleScroll)
      }
    }

    if (readingMode === 'webtoon') {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    } else if (currentPage > pages.length - 2) {
      prefetchNext()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextChapterId, currentPage, pages.length, readingMode, loading])

  // In-browser next-3-pages prefetch
  useEffect(() => {
    if (!pages.length) return
    for (let i = 1; i <= 3; i++) {
      const idx = currentPage + i - 1
      if (idx < pages.length) {
        const img = new Image()
        img.src = getImageUrl(pages[idx])
      }
    }
  }, [currentPage, pages, getImageUrl])

  const handleCloudUpload = async () => {
    if (mangaTitle !== 'local' || uploading) return
    const session = (window as unknown as Record<string, unknown>).__LOCAL_MANGA_SESSION__ as { rawFile?: File } | undefined
    if (!session?.rawFile) {
      alert('Original file data lost. Please re-upload from dashboard.')
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', session.rawFile)
    try {
      await api.post('/library/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 })
      alert('Successfully uploaded to cloud library!')
    } catch {
      alert('Cloud upload failed. Check backend logs.')
    } finally {
      setUploading(false)
    }
  }

  return {
    pages, loading, fetchError,
    currentPage, setCurrentPage,
    nextChapterId, prevChapterId, localTitle,
    uploading, handleCloudUpload,
    onlinePartsRef, chapterListRef,
    getImageUrl, getImageUrlForChapter,
    isWidePage,
  }
}

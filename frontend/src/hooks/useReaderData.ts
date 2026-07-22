import { useState, useEffect, useCallback, useRef } from 'react'
import type { Location } from 'react-router-dom'
import { loadLocalMangaIntoSession } from '../lib/localLibrary'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { markRead } from '../lib/readTracking'
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

  const malAutoSyncedRef = useRef(false)
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onlinePartsRef = useRef<OnlineParts | null>(null)
  const chapterListRef = useRef<{ id: string; number?: number }[]>([])

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
    if (!parts) return
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
  }, [incognitoMode])

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
    if (mangaTitle !== 'online' || pages.length === 0) return
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current)
    progressSaveTimerRef.current = setTimeout(() => saveOnlineProgress(currentPage), 1500)
    return () => {
      if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current)
    }
  }, [currentPage, mangaTitle, pages.length, saveOnlineProgress])

  // Main data loader
  useEffect(() => {
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
        let decoded = ''
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
            : rawPages.map((url: string) => `${base}/manga/image-proxy?url=${encodeURIComponent(url)}&api_key=${apiKey}`)
          setPages(proxyPages)
          setLocalTitle(`Online — Ch. ${onlineChapterId}`)
          if (!incognitoMode) markRead(onlineProvider, onlineMangaId, onlineChapterId)

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
            chapterListRef.current = chapters
            const idx = chapters.findIndex(c => c.id === onlineChapterId)
            if (idx !== -1) setNextChapterId(chapters[idx + 1]?.id ?? null)
          } catch { /* non-fatal */ }

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
        let session = (window as unknown as Record<string, unknown>).__LOCAL_MANGA_SESSION__
        if (!session && filename) {
          const ok = await loadLocalMangaIntoSession(filename)
          if (ok) session = (window as unknown as Record<string, unknown>).__LOCAL_MANGA_SESSION__
        }
        if (session) {
          const s = session as { title: string; pages: string[] }
          setLocalTitle(s.title)
          setPages(s.pages)
          setLoading(false)
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
  }, [mangaTitle, filename, readingMode])

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
    nextChapterId, localTitle,
    uploading, handleCloudUpload,
    onlinePartsRef, chapterListRef,
    getImageUrl, getImageUrlForChapter,
  }
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { FastAverageColor } from 'fast-average-color'
import { useAppStore } from '../lib/store'
import api from '../lib/api'
import { useReaderData } from '../hooks/useReaderData'
import { useAndroidFeatures } from '../hooks/useAndroidFeatures'
import { useReaderNavigation } from '../hooks/useReaderNavigation'
import { ReaderHeader } from '../components/reader/ReaderHeader'
import { ReaderViewport } from '../components/reader/ReaderViewport'
import { PageScrubber } from '../components/reader/PageScrubber'
import { ShortcutOverlay } from '../components/reader/ShortcutOverlay'
import { ReaderSettingsSheet } from '../components/reader/ReaderSettingsSheet'
import CommentSheet from '../components/comments/CommentSheet'
import { startSession, endSession } from '../lib/readingSession'
import { markRead } from '../lib/readTracking'
import { buildSmartReadUrl, buildSmartMangaUrl, resolveSmartManga, resolveSmartContext } from '../lib/smartUrl'
import { usePageTitle } from '../lib/usePageTitle'

const fac = new FastAverageColor()

function withOpacity(rgba: string, opacity: number): string {
  return rgba.replace(/[\d.]+\)$/, `${opacity})`)
}

export default function Reader() {
  const { mangaTitle, filename } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    readingMode, setReadingMode, upscaling, setUpscaling,
    readerFilters, setReaderFilters, resetReaderFilters,
    imageScale, setImageScale, incognitoMode,
    skipReadChapters, setSkipReadChapters,
    cropBorders, dualPageSpread, tapZoneLayout, hapticFeedback,
    webtoonSidePadding, cropBordersWebtoon,
  } = useAppStore()

  const [showControls, setShowControls] = useState(true)
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)
  const [showCommentSheet, setShowCommentSheet] = useState(false)
  const [ambilightColor, setAmbilightColor] = useState('rgba(0,0,0,0)')
  const [ambilightEnabled, setAmbilightEnabled] = useState(true)
  const [showShortcutOverlay, setShowShortcutOverlay] = useState(() => {
    try { return localStorage.getItem('manga-reader-shortcut-shown') !== 'true' } catch { return false }
  })

  // Pull-down-to-search tip: shown once on mobile then auto-dismissed
  const [showSearchTip, setShowSearchTip] = useState(() => {
    try {
      const isMobile = window.innerWidth < 768
      return isMobile && localStorage.getItem('manga-reader-search-tip-dismissed') !== 'true'
    } catch { return false }
  })
  const neverShowSearchTip = () => {
    localStorage.setItem('manga-reader-search-tip-dismissed', 'true')
    setShowSearchTip(false)
  }
  // Auto-dismiss and permanently hide after 6s
  useEffect(() => {
    if (!showSearchTip) return
    const t = setTimeout(neverShowSearchTip, 6000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearchTip])

  // Swipe-down gesture from top of screen → navigate to /search
  useEffect(() => {
    let startY = 0
    let startX = 0
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
    }
    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY
      const dx = Math.abs(e.changedTouches[0].clientX - startX)
      if (dy > 80 && dx < 60 && startY < window.innerHeight * 0.25) {
        navigate('/search')
      }
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [navigate])

  useEffect(() => {
    if (!localStorage.getItem('onboarded')) {
      navigate(`/onboarding?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true })
    }
  }, [navigate, location])

  const {
    pages, loading, fetchError,
    currentPage, setCurrentPage,
    nextChapterId, prevChapterId, localTitle,
    resolvedMangaTitle, resolvedChapterTitle,
    uploading, handleCloudUpload,
    onlinePartsRef, chapterListRef,
    getImageUrl, isWidePage,
    saveOnlineProgress,
  } = useReaderData({ mangaTitle, filename, location, readingMode, incognitoMode, upscaling, setShowControls })

  const readerTitle = pages.length > 0 && onlinePartsRef.current
    ? `${onlinePartsRef.current.mangaTitle || mangaTitle} · ${onlinePartsRef.current.chapterTitle || filename}`
    : (localTitle ?? null)
  usePageTitle(readerTitle)

  const handleBack = useCallback(() => {
    // 1. If onlinePartsRef has resolved provider and mangaId:
    const parts = onlinePartsRef.current
    if (parts) {
      if (parts.provider === 'local') {
        navigate(`/local/${encodeURIComponent(parts.mangaId)}`)
        return
      }
      if (parts.provider && parts.mangaId) {
        navigate(buildSmartMangaUrl(parts.provider, parts.mangaId, parts.mangaTitle || resolvedMangaTitle || ''))
        return
      }
    }

    // 2. If reading local manga archive (/read/local/:archiveId or /read/local/:archiveId:chapterId)
    if (mangaTitle === 'local' && filename) {
      const localId = filename.split(':')[0]
      if (localId) {
        navigate(`/local/${encodeURIComponent(localId)}`)
        return
      }
    }

    // 3. If reading legacy base64 online param (/read/online/:base64)
    if (mangaTitle === 'online' && filename) {
      try {
        let decoded: string
        try {
          decoded = decodeURIComponent(escape(atob(filename)))
        } catch {
          decoded = atob(filename)
        }
        const p = decoded.split(/[:|]/)
        if (p[0] === 'local' && p[1]) {
          navigate(`/local/${encodeURIComponent(p[1])}`)
          return
        }
        if (p[0] && p[1]) {
          navigate(buildSmartMangaUrl(p[0], p[1], p[3] || resolvedMangaTitle || ''))
          return
        }
      } catch { /* ignore decoding failure */ }
    }

    // 4. If smart context exists (either in ?ctx= param or localStorage)
    if (mangaTitle && filename && mangaTitle !== 'local') {
      const queryParams = new URLSearchParams(location.search)
      const ctxParam = queryParams.get('ctx')
      const ctx = resolveSmartContext(mangaTitle, filename, ctxParam)
      if (ctx) {
        try {
          let decoded: string
          try {
            decoded = decodeURIComponent(escape(atob(ctx)))
          } catch {
            decoded = atob(ctx)
          }
          const p = decoded.split(/[:|]/)
          if (p[0] === 'local' && p[1]) {
            navigate(`/local/${encodeURIComponent(p[1])}`)
            return
          }
          if (p[0] && p[1]) {
            navigate(buildSmartMangaUrl(p[0], p[1], p[3] || resolvedMangaTitle || ''))
            return
          }
        } catch { /* ignore decoding failure */ }
      }
    }

    // 5. If mangaTitle is a smart slug in localStorage
    if (mangaTitle && mangaTitle !== 'local' && mangaTitle !== 'online') {
      const cached = resolveSmartManga(mangaTitle)
      if (cached?.provider && cached?.mangaId) {
        navigate(buildSmartMangaUrl(cached.provider, cached.mangaId, cached.title || resolvedMangaTitle || mangaTitle))
        return
      }
      // Direct smart slug route (/manga/:smartSlug)
      navigate(`/manga/${mangaTitle}`)
      return
    }

    // 6. Fallback
    navigate(-1)
  }, [navigate, mangaTitle, filename, location.search, resolvedMangaTitle, onlinePartsRef])

  useAndroidFeatures({ navigate, ambilightColor, onBack: handleBack })

  const {
    nextPage, prevPage,
    tapZoneLeft, tapZoneRight,
    showSpread, spreadPage2Idx,
    nextUnreadChapterId, navigateToNextChapter, navigateToPrevChapter,
  } = useReaderNavigation({
    pages, currentPage, setCurrentPage,
    readingMode, dualPageSpread, tapZoneLayout, hapticFeedback, skipReadChapters,
    onlinePartsRef, chapterListRef, nextChapterId, prevChapterId, mangaTitle, navigate,
    readerFilters, setReaderFilters, isWidePage, onExit: handleBack,
  })

  // Keep a live ref to currentPage so the session cleanup can read the final page reached
  // Live ref to currentPage so session cleanup and callbacks read the latest value
  const currentPageRef = useRef(currentPage)
  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])

  const isResumingScrollRef = useRef(false)
  const hasResumedChapterRef = useRef<string | null>(null)

  // Auto-scroll to resumed page in webtoon mode when chapter loads (0 delay)
  useEffect(() => {
    if (!pages.length) return
    const currentChapterKey = `${onlinePartsRef.current?.provider}:${onlinePartsRef.current?.mangaId}:${onlinePartsRef.current?.chapterId}:${filename}`
    if (hasResumedChapterRef.current === currentChapterKey) return

    if (readingMode === 'webtoon' && currentPage > 1) {
      isResumingScrollRef.current = true
      hasResumedChapterRef.current = currentChapterKey

      let attempts = 0
      const tryScroll = () => {
        attempts++
        const el = document.getElementById(`page-${currentPage}`)
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' })
          setTimeout(() => {
            isResumingScrollRef.current = false
          }, 150)
        } else if (attempts < 35) {
          requestAnimationFrame(tryScroll)
        } else {
          isResumingScrollRef.current = false
        }
      }
      requestAnimationFrame(tryScroll)
    } else {
      hasResumedChapterRef.current = currentChapterKey
      isResumingScrollRef.current = false
    }
  }, [pages.length, readingMode, currentPage, filename])

  // Webtoon scroll tracker — captures current page immediately on scroll (0 delay) and links to counter
  useEffect(() => {
    if (readingMode !== 'webtoon' || !pages.length) return

    let ticking = false
    const onScroll = () => {
      if (isResumingScrollRef.current) return
      if (!ticking) {
        requestAnimationFrame(() => {
          ticking = false
          if (isResumingScrollRef.current) return

          const target = window.innerHeight * 0.35 // 35% down viewport
          let best = 1
          let bestDist = Infinity

          for (let i = 0; i < pages.length; i++) {
            const el = document.getElementById(`page-${i + 1}`)
            if (!el) continue
            const rect = el.getBoundingClientRect()
            const mid = rect.top + Math.min(rect.height, window.innerHeight) / 2
            const dist = Math.abs(mid - target)
            if (dist < bestDist) {
              bestDist = dist
              best = i + 1
            }
          }

          if (best !== currentPageRef.current) {
            setCurrentPage(best)
            saveOnlineProgress(best)
          }
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [readingMode, pages.length, setCurrentPage, saveOnlineProgress])

  // In LTR, RTL, and vertical-pager modes, immediately save progress whenever turning pages
  useEffect(() => {
    if (readingMode === 'webtoon' || !pages.length) return
    saveOnlineProgress(currentPage)
  }, [currentPage, readingMode, pages.length, saveOnlineProgress])

  // Reading session tracking — start when pages arrive, end on unmount / chapter change
  const sessionTokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (!pages.length || !onlinePartsRef.current) return
    const parts = onlinePartsRef.current
    sessionTokenRef.current = startSession(parts.provider, parts.mangaId, parts.chapterId, parts.mangaTitle || parts.mangaId)
    return () => {
      if (sessionTokenRef.current) {
        endSession(sessionTokenRef.current, currentPageRef.current)
        sessionTokenRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length])

  // Mark chapter as read only after reaching 80% of pages
  useEffect(() => {
    if (incognitoMode || !pages.length || currentPage < Math.ceil(pages.length * 0.8)) return
    const parts = onlinePartsRef.current
    if (parts) {
      markRead(parts.provider, parts.mangaId, parts.chapterId)
    } else if (mangaTitle === 'local' && filename) {
      markRead('local', filename, filename)
    }
  }, [currentPage, pages.length, incognitoMode, mangaTitle, filename])

  const handlePageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!ambilightEnabled) return
    fac.getColorAsync(e.currentTarget.src, { algorithm: 'dominant', crossOrigin: 'anonymous' })
      .then(color => setAmbilightColor(color.rgba))
      .catch(() => {})
  }, [ambilightEnabled])

  const openLibraryUrl = (path: string) => {
    if (mangaTitle === 'local') return
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    window.open(`${base}/${path}/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}?api_key=${apiKey}`, '_blank')
  }

  const [queueingDownload, setQueueingDownload] = useState(false)

  const handleDownloadChapter = async () => {
    const online = onlinePartsRef.current
    if (online) {
      // Online chapter — queue it for download
      if (queueingDownload) return
      setQueueingDownload(true)
      try {
        await api.post('/downloads/queue', {
          provider_id: online.provider,
          manga_id: online.mangaId,
          chapter_id: online.chapterId,
          manga_title: online.mangaTitle,
          chapter_title: online.chapterTitle || filename || 'Chapter',
          chapter_number: parseFloat(online.chapterId?.replace(/\D/g, '') || '1') || 1,
          pages,
        })
      } catch {
        // silently ignore — download page shows status
      } finally {
        setQueueingDownload(false)
      }
    } else {
      // Local CBZ — open the raw file
      openLibraryUrl('library/file')
    }
  }

  const cssFilter = [
    readerFilters.brightness !== 1 ? `brightness(${readerFilters.brightness})` : '',
    readerFilters.contrast !== 1 ? `contrast(${readerFilters.contrast})` : '',
    readerFilters.grayscale ? 'grayscale(1)' : '',
    readerFilters.invert ? 'invert(1)' : '',
    readerFilters.sepia ? 'sepia(1)' : '',
  ].filter(Boolean).join(' ')

  if (loading) {
    const isOnline = mangaTitle !== 'local' && (mangaTitle === 'online' || filename?.includes(':') || Boolean(location.search))
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors">
        <Loader2 className="w-12 h-12 text-[var(--accent,#dc2626)] animate-spin mb-4 drop-shadow-[0_0_12px_var(--accent-glow)]" />
        <p className="text-[var(--muted2)] font-bold uppercase tracking-widest text-xs animate-pulse">
          {isOnline ? 'Loading Chapter...' : 'Opening Archive...'}
        </p>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--fg)] p-6 relative overflow-hidden transition-colors">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, var(--accent-glow, rgba(220,38,38,.15)) 0%, transparent 70%)' }} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full glass-panel p-8 text-center border-red-500/20 relative z-10"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black tracking-tight mb-2">Unable to Load Chapter</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            {fetchError || 'No image pages were found in this chapter or the provider request failed.'}
          </p>
          <div className="flex gap-3">
            <button onClick={handleBack} className="flex-1 btn-secondary text-xs uppercase tracking-widest font-bold py-3">Go Back</button>
            <button onClick={() => window.location.reload()} className="flex-1 btn-primary text-xs uppercase tracking-widest font-bold py-3">Retry</button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white overflow-x-hidden select-none" style={{ background: 'var(--bg, #050505)' }}>
      {/* Ambilight */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-700"
        style={ambilightEnabled ? {
          background: `
            radial-gradient(ellipse 100% 30% at 50% 0%, ${withOpacity(ambilightColor, 0.18)} 0%, transparent 100%),
            radial-gradient(ellipse 100% 30% at 50% 100%, ${withOpacity(ambilightColor, 0.18)} 0%, transparent 100%),
            radial-gradient(ellipse 30% 100% at 0% 50%, ${withOpacity(ambilightColor, 0.12)} 0%, transparent 100%),
            radial-gradient(ellipse 30% 100% at 100% 50%, ${withOpacity(ambilightColor, 0.12)} 0%, transparent 100%)
          `,
        } : { background: 'none' }}
      />

      <ReaderHeader
        show={showControls}
        mangaTitle={mangaTitle}
        filename={filename}
        localTitle={localTitle}
        resolvedMangaTitle={resolvedMangaTitle ?? undefined}
        resolvedChapterTitle={resolvedChapterTitle ?? undefined}
        currentChapterId={onlinePartsRef.current?.chapterId}
        chapters={chapterListRef.current}
        onChapterSelect={(chapterId) => {
          const parts = onlinePartsRef.current
          if (!parts) return
          if (mangaTitle === 'local' || parts.provider === 'local') {
            // Compound IDs (archiveId:chapterId) navigate directly
            if (chapterId.includes(':')) {
              navigate(`/read/local/${chapterId}`)
            } else {
              navigate(`/read/local/${parts.mangaId}:${chapterId}`)
            }
            return
          }
          const ch = chapterListRef.current.find(c => c.id === chapterId)
          const url = buildSmartReadUrl(parts.provider, parts.mangaId, chapterId, parts.mangaTitle || '', ch?.title)
          navigate(url)
        }}
        ambilightEnabled={ambilightEnabled}
        setAmbilightEnabled={setAmbilightEnabled}
        upscaling={upscaling}
        setUpscaling={setUpscaling}
        uploading={uploading}
        handleCloudUpload={handleCloudUpload}
        handleDownload={handleDownloadChapter}
        handleConvertToPdf={() => openLibraryUrl('library/pdf')}
        readingMode={readingMode}
        setReadingMode={setReadingMode}
        onBack={handleBack}
        onOpenSettings={() => setShowSettingsSheet(true)}
        onOpenComments={onlinePartsRef.current && mangaTitle !== 'local' ? () => setShowCommentSheet(true) : undefined}
      />

      <ReaderViewport
        pages={pages}
        currentPage={currentPage}
        readingMode={readingMode}
        showSpread={showSpread}
        spreadPage2Idx={spreadPage2Idx}
        getImageUrl={getImageUrl}
        nextPage={nextPage}
        prevPage={prevPage}
        tapZoneLeft={tapZoneLeft}
        tapZoneRight={tapZoneRight}
        setShowControls={setShowControls}
        nextUnreadChapterId={nextUnreadChapterId}
        navigateToNextChapter={navigateToNextChapter}
        navigateToPrevChapter={navigateToPrevChapter}
        prevChapterId={prevChapterId}
        skipReadChapters={skipReadChapters}
        nextChapterId={nextChapterId}
        filename={filename}
        cropBorders={cropBorders}
        cropBordersWebtoon={cropBordersWebtoon}
        imageScale={imageScale}
        webtoonSidePadding={webtoonSidePadding}
        cssFilter={cssFilter}
        handlePageLoad={handlePageLoad}
      />

      <PageScrubber
        pages={pages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        getImageUrl={getImageUrl}
        show={showControls}
        readingMode={readingMode}
      />

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-panel px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(8,8,8,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {prevChapterId ? (
            <button
              onClick={navigateToPrevChapter}
              aria-label="Previous chapter"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
            >
              <ChevronLeft className="w-3 h-3" />
              <span className="hidden sm:inline">Prev Ch</span>
            </button>
          ) : (
            <div className="w-[70px] hidden sm:block" />
          )}

          <span aria-live="polite" aria-atomic="true" className="text-[10px] font-bold tracking-[0.15em] text-white/30 uppercase px-2 whitespace-nowrap">
            {showSpread && spreadPage2Idx < pages.length
              ? `${currentPage}–${spreadPage2Idx + 1} / ${pages.length}`
              : `${currentPage} / ${pages.length}`}
          </span>

          {nextUnreadChapterId ? (
            <button
              onClick={navigateToNextChapter}
              aria-label="Next chapter"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
            >
              <span className="hidden sm:inline">Next Ch</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <div className="w-[70px] hidden sm:block" />
          )}
        </div>
      </footer>

      <ShortcutOverlay
        show={showShortcutOverlay}
        onDismiss={() => {
          localStorage.setItem('manga-reader-shortcut-shown', 'true')
          setShowShortcutOverlay(false)
        }}
      />

      {/* Pull-down-to-search tip — mobile only */}
      {showSearchTip && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [30, 0, -8, 0, -4, 0] }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 72px))',
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 9000, background: 'rgba(12,12,12,0.94)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18,
            padding: '14px 16px 12px',
            maxWidth: 'calc(100vw - 32px)', width: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <motion.span
              animate={{ y: [0, -4, 0, -4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
              style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}
            >↓</motion.span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>Pull down to search</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3, lineHeight: 1.4 }}>
                Swipe down from the top of the screen to open search
              </div>
            </div>
            <button
              onClick={neverShowSearchTip}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '2px 4px', fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: -2 }}
              aria-label="Close tip"
            >×</button>
          </div>
          <button
            onClick={neverShowSearchTip}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              textAlign: 'center', letterSpacing: '0.04em',
            }}
          >
            Don't show again
          </button>
        </motion.div>
      )}

      <ReaderSettingsSheet
        open={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        readingMode={readingMode}
        setReadingMode={setReadingMode}
        imageScale={imageScale}
        setImageScale={setImageScale}
        readerFilters={readerFilters}
        setReaderFilters={setReaderFilters}
        resetReaderFilters={resetReaderFilters}
        skipReadChapters={skipReadChapters}
        setSkipReadChapters={setSkipReadChapters}
        isOnline={mangaTitle !== 'local'}
      />

      {onlinePartsRef.current && mangaTitle !== 'local' && (
        <CommentSheet
          open={showCommentSheet}
          onClose={() => setShowCommentSheet(false)}
          provider={onlinePartsRef.current.provider}
          mangaId={onlinePartsRef.current.mangaId}
          chapterId={onlinePartsRef.current.chapterId}
        />
      )}
    </div>
  )
}

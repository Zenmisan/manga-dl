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
import { startSession, endSession } from '../lib/readingSession'
import { markRead } from '../lib/readTracking'
import { buildSmartReadUrl } from '../lib/smartUrl'

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
  const [ambilightColor, setAmbilightColor] = useState('rgba(0,0,0,0)')
  const [ambilightEnabled, setAmbilightEnabled] = useState(true)
  const [showShortcutOverlay, setShowShortcutOverlay] = useState(() => {
    try { return localStorage.getItem('manga-reader-shortcut-shown') !== 'true' } catch { return false }
  })

  useEffect(() => {
    if (!localStorage.getItem('onboarded')) {
      navigate(`/onboarding?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true })
    }
  }, [navigate, location])

  const {
    pages, loading, fetchError,
    currentPage, setCurrentPage,
    nextChapterId, prevChapterId, localTitle,
    uploading, handleCloudUpload,
    onlinePartsRef, chapterListRef,
    getImageUrl, isWidePage,
  } = useReaderData({ mangaTitle, filename, location, readingMode, incognitoMode, upscaling, setShowControls })

  useAndroidFeatures({ navigate, ambilightColor })

  const {
    nextPage, prevPage,
    tapZoneLeft, tapZoneRight,
    showSpread, spreadPage2Idx,
    nextUnreadChapterId, navigateToNextChapter, navigateToPrevChapter,
  } = useReaderNavigation({
    pages, currentPage, setCurrentPage,
    readingMode, dualPageSpread, tapZoneLayout, hapticFeedback, skipReadChapters,
    onlinePartsRef, chapterListRef, nextChapterId, prevChapterId, mangaTitle, navigate,
    readerFilters, setReaderFilters, isWidePage,
  })

  // Keep a live ref to currentPage so the session cleanup can read the final page reached
  const currentPageRef = useRef(currentPage)
  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])

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
            <button onClick={() => navigate(-1)} className="flex-1 btn-secondary text-xs uppercase tracking-widest font-bold py-3">Go Back</button>
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
        currentChapterId={onlinePartsRef.current?.chapterId}
        chapters={chapterListRef.current}
        onChapterSelect={(chapterId) => {
          const parts = onlinePartsRef.current
          if (!parts) return
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
        handleConvertToEpub={() => openLibraryUrl('library/epub')}
        onBack={() => navigate(-1)}
        onOpenSettings={() => setShowSettingsSheet(true)}
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
    </div>
  )
}

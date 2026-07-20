import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'
import { FastAverageColor } from 'fast-average-color'
import { useAppStore } from '../lib/store'
import api from '../lib/api'
import { useReaderData } from '../hooks/useReaderData'
import { useAndroidFeatures } from '../hooks/useAndroidFeatures'
import { useReaderNavigation } from '../hooks/useReaderNavigation'
import { ReaderHeader } from '../components/reader/ReaderHeader'
import { ReaderViewport } from '../components/reader/ReaderViewport'
import { ShortcutOverlay } from '../components/reader/ShortcutOverlay'

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
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [ambilightColor, setAmbilightColor] = useState('rgba(0,0,0,0)')
  const [ambilightEnabled, setAmbilightEnabled] = useState(true)
  const [showShortcutOverlay, setShowShortcutOverlay] = useState(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem('manga-reader-shortcut-shown') !== 'true'
  )

  useEffect(() => {
    if (!localStorage.getItem('onboarded')) {
      navigate(`/onboarding?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true })
    }
  }, [navigate, location])

  const {
    pages, loading, fetchError,
    currentPage, setCurrentPage,
    nextChapterId, localTitle,
    uploading, handleCloudUpload,
    onlinePartsRef, chapterListRef,
    getImageUrl,
  } = useReaderData({ mangaTitle, filename, location, readingMode, incognitoMode, upscaling, setShowControls })

  useAndroidFeatures({ navigate, ambilightColor })

  const {
    nextPage, prevPage,
    tapZoneLeft, tapZoneRight,
    showSpread, spreadPage2Idx,
    nextUnreadChapterId, navigateToNextChapter,
    volumeKeyMode, setVolumeKeyMode,
  } = useReaderNavigation({
    pages, currentPage, setCurrentPage,
    readingMode, dualPageSpread, tapZoneLayout, hapticFeedback, skipReadChapters,
    onlinePartsRef, chapterListRef, nextChapterId, navigate,
    readerFilters, setReaderFilters,
  })

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

  const cssFilter = [
    readerFilters.brightness !== 1 ? `brightness(${readerFilters.brightness})` : '',
    readerFilters.contrast !== 1 ? `contrast(${readerFilters.contrast})` : '',
    readerFilters.grayscale ? 'grayscale(1)' : '',
    readerFilters.invert ? 'invert(1)' : '',
    readerFilters.sepia ? 'sepia(1)' : '',
  ].filter(Boolean).join(' ')

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs animate-pulse">Opening Archive...</p>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(220,38,38,.15) 0%, transparent 70%)' }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
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
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden select-none">
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
        readingMode={readingMode}
        setReadingMode={setReadingMode}
        imageScale={imageScale}
        setImageScale={setImageScale}
        upscaling={upscaling}
        setUpscaling={setUpscaling}
        ambilightEnabled={ambilightEnabled}
        setAmbilightEnabled={setAmbilightEnabled}
        uploading={uploading}
        handleCloudUpload={handleCloudUpload}
        handleDownload={() => openLibraryUrl('library/file')}
        handleConvertToPdf={() => openLibraryUrl('library/pdf')}
        handleConvertToEpub={() => openLibraryUrl('library/epub')}
        showFilterPanel={showFilterPanel}
        setShowFilterPanel={setShowFilterPanel}
        readerFilters={readerFilters}
        setReaderFilters={setReaderFilters}
        resetReaderFilters={resetReaderFilters}
        volumeKeyMode={volumeKeyMode}
        setVolumeKeyMode={setVolumeKeyMode}
        skipReadChapters={skipReadChapters}
        setSkipReadChapters={setSkipReadChapters}
        onBack={() => navigate(-1)}
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

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-panel px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase flex items-center gap-4">
          <span>
            {showSpread && spreadPage2Idx < pages.length
              ? `Pages ${currentPage}-${spreadPage2Idx + 1} of ${pages.length}`
              : `Page ${currentPage} of ${pages.length}`}
          </span>
          <span className="w-1 h-1 bg-white/10 rounded-full" />
          <span className="hidden md:inline">Click to toggle UI</span>
        </div>
      </footer>

      <ShortcutOverlay
        show={showShortcutOverlay}
        onDismiss={() => {
          localStorage.setItem('manga-reader-shortcut-shown', 'true')
          setShowShortcutOverlay(false)
        }}
      />
    </div>
  )
}

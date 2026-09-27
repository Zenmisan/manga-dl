import type React from 'react'
import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ReaderPageImage } from '../ReaderPageImage'

interface Props {
  pages: string[]
  currentPage: number
  readingMode: string
  showSpread: boolean
  spreadPage2Idx: number
  getImageUrl: (pageName: string) => string
  nextPage: (e?: React.MouseEvent) => void
  prevPage: (e?: React.MouseEvent) => void
  tapZoneLeft: string
  tapZoneRight: string
  onTap: () => void
  nextUnreadChapterId: string | null
  navigateToNextChapter: () => void
  navigateToPrevChapter: () => void
  prevChapterId: string | null
  skipReadChapters: boolean
  nextChapterId: string | null
  filename: string | undefined
  cropBorders: boolean
  cropBordersWebtoon: boolean
  imageScale: string
  webtoonSidePadding: number
  cssFilter: string
  handlePageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void
  webtoonGapless: boolean
  zoomLevel: number
  setZoomLevel: (v: number) => void
}

export function ReaderViewport({
  pages, currentPage, readingMode, showSpread, spreadPage2Idx,
  getImageUrl, nextPage, prevPage, tapZoneLeft, tapZoneRight,
  onTap,
  nextUnreadChapterId, navigateToNextChapter, navigateToPrevChapter, prevChapterId,
  skipReadChapters, nextChapterId,
  filename, cropBorders, cropBordersWebtoon, imageScale, webtoonSidePadding,
  cssFilter, handlePageLoad, webtoonGapless, zoomLevel, setZoomLevel,
}: Props) {
  const filterStyle = cssFilter ? { filter: cssFilter } : undefined
  const disabled = tapZoneLeft === 'w-0'
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const pinchStartRef = useRef<number | null>(null)
  const pinchStartZoomRef = useRef<number>(1)
  const [navDir, setNavDir] = useState<'forward' | 'back'>('forward')

  const handleNextPage = useCallback((e?: React.MouseEvent) => {
    setNavDir('forward')
    nextPage(e)
  }, [nextPage])

  const handlePrevPage = useCallback((e?: React.MouseEvent) => {
    setNavDir('back')
    prevPage(e)
  }, [prevPage])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      pinchStartRef.current = Math.sqrt(dx * dx + dy * dy)
      pinchStartZoomRef.current = zoomLevel
      return
    }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current !== null) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = (dist / pinchStartRef.current) * pinchStartZoomRef.current
      setZoomLevel(Math.min(4, Math.max(0.5, parseFloat(scale.toFixed(2)))))
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartRef.current !== null) {
      pinchStartRef.current = null
      return
    }
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null

    if (readingMode === 'vertical-pager') {
      const dominant = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      const delta = dominant === 'h' ? dx : dy
      if (Math.abs(delta) < 30) return
      e.preventDefault()
      if (delta < 0) { setNavDir('forward'); nextPage() } else { setNavDir('back'); prevPage() }
      return
    }

    // LTR / RTL: horizontal swipe only
    if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return
    e.preventDefault()
    if (readingMode === 'manga') {
      if (dx < 0) { setNavDir('forward'); nextPage() } else { setNavDir('back'); prevPage() }
    } else {
      if (dx < 0) { setNavDir('back'); prevPage() } else { setNavDir('forward'); nextPage() }
    }
  }

  // Direction-aware animation: forward = new page from right; back = new page from left
  // RTL mode flips the visual direction
  const isRTL = readingMode === 'manga-rtl'
  const enterX = navDir === 'forward' ? (isRTL ? -50 : 50) : (isRTL ? 50 : -50)
  const exitX = navDir === 'forward' ? (isRTL ? 50 : -50) : (isRTL ? -50 : 50)
  const zoomStyle = zoomLevel !== 1 ? { transform: `scale(${zoomLevel})`, transformOrigin: 'center top' } : undefined

  return (
    <main
      className={cn(
        "relative z-10 mx-auto transition-all duration-500",
        readingMode === 'webtoon' || readingMode === 'manga-ltr' || readingMode === 'manga-rtl'
          ? "max-w-3xl"
          : "w-full h-screen flex items-center justify-center overflow-hidden"
      )}
      onClick={onTap}
    >
      {readingMode === 'vertical-pager' ? (
        <div
          className="relative w-full h-full flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            role="button" tabIndex={disabled ? -1 : 0} aria-label="Previous page"
            className={`absolute inset-y-0 left-0 ${tapZoneLeft} z-20 cursor-pointer`}
            onClick={!disabled ? handlePrevPage : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePrevPage() } } : undefined}
          />
          <div
            role="button" tabIndex={disabled ? -1 : 0} aria-label="Next page"
            className={`absolute inset-y-0 right-0 ${tapZoneRight} z-20 cursor-pointer`}
            onClick={!disabled ? handleNextPage : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNextPage() } } : undefined}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: navDir === 'forward' ? 30 : -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: navDir === 'forward' ? -30 : 30 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full w-full flex items-center justify-center p-4"
              style={zoomStyle}
            >
              <ReaderPageImage
                src={getImageUrl(pages[currentPage - 1])}
                alt={`Page ${currentPage}`}
                className={cn(
                  "shadow-2xl rounded-sm",
                  cropBorders ? "object-cover" : "object-contain",
                  imageScale === 'fit-screen' && "max-h-[90dvh] max-w-full",
                  imageScale === 'fit-width' && "w-full max-h-none",
                  imageScale === 'fit-height' && "h-[95dvh] w-auto max-w-full",
                  imageScale === 'original' && "max-w-none",
                  cropBorders && "w-full h-[90dvh]",
                )}
                onLoad={handlePageLoad}
                style={filterStyle}
              />
            </motion.div>
          </AnimatePresence>
        </div>

      ) : readingMode === 'webtoon' ? (
        <div
          className="flex flex-col"
          style={{
            ...(webtoonSidePadding > 0 ? { paddingLeft: webtoonSidePadding, paddingRight: webtoonSidePadding } : {}),
            ...(zoomLevel !== 1 ? { transform: `scale(${zoomLevel})`, transformOrigin: 'top center' } : {}),
            gap: webtoonGapless ? 0 : '4px',
          }}
        >
          {pages.map((page, idx) => (
            <motion.div
              key={page}
              id={`page-${idx + 1}`}
              data-page={idx + 1}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '400px' }}
              className="relative w-full"
            >
              <ReaderPageImage
                src={getImageUrl(page)}
                alt={`Page ${idx + 1}`}
                className={cropBordersWebtoon ? "w-full object-cover" : "w-full h-auto"}
                loading={idx < 3 ? "eager" : "lazy"}
                onLoad={idx === 0 ? handlePageLoad : undefined}
                style={filterStyle}
              />
              <div aria-live="polite" aria-atomic="true" className="absolute bottom-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] font-mono text-white/40">
                {idx + 1} / {pages.length}
              </div>
            </motion.div>
          ))}

          {/* Webtoon end-of-chapter panel */}
          <div className="flex flex-col items-center py-16 px-6 gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">End of chapter</p>
            <p className="font-bold text-sm text-white/60">{filename?.replace('.cbz', '') ?? 'Chapter'}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {prevChapterId && (
                <button
                  onClick={navigateToPrevChapter}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/60 hover:text-white hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Prev Chapter
                </button>
              )}
              {nextUnreadChapterId ? (
                <button
                  onClick={navigateToNextChapter}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  {skipReadChapters ? 'Next Unread' : 'Next Chapter'} <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                  {skipReadChapters && nextChapterId ? 'All caught up!' : 'No next chapter'}
                </p>
              )}
            </div>
          </div>
        </div>

      ) : (
        /* Paged mode: LTR / RTL */
        <div
          className="relative w-full flex flex-col items-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            role="button" tabIndex={disabled ? -1 : 0}
            aria-label={readingMode === 'manga' ? 'Previous page' : 'Next page'}
            className={`fixed inset-y-0 left-0 ${tapZoneLeft} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga' ? handlePrevPage : handleNextPage) : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (readingMode === 'manga') handlePrevPage(); else handleNextPage() } } : undefined}
          />
          <div
            role="button" tabIndex={disabled ? -1 : 0}
            aria-label={readingMode === 'manga' ? 'Next page' : 'Previous page'}
            className={`fixed inset-y-0 right-0 ${tapZoneRight} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga' ? handleNextPage : handlePrevPage) : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (readingMode === 'manga') handleNextPage(); else handlePrevPage() } } : undefined}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: enterX }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: exitX }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn("w-full flex items-center justify-center px-2 py-6", showSpread && "gap-1")}
              style={zoomStyle}
            >
              <ReaderPageImage
                src={getImageUrl(pages[currentPage - 1])}
                alt={`Page ${currentPage}`}
                className={cn(
                  "shadow-2xl rounded-sm",
                  cropBorders ? "object-cover" : "object-contain",
                  showSpread ? "max-h-[95dvh] max-w-[48vw] w-auto" : imageScale === 'fit-screen' ? "w-full h-auto" : "",
                  !showSpread && imageScale === 'fit-width' && "w-full h-auto max-h-none",
                  !showSpread && imageScale === 'fit-height' && "h-[95dvh] w-auto max-w-full",
                  !showSpread && imageScale === 'original' && "max-w-none",
                  !showSpread && cropBorders && "w-full",
                )}
                onLoad={handlePageLoad}
                style={filterStyle}
              />
              {showSpread && spreadPage2Idx < pages.length && (
                <ReaderPageImage
                  src={getImageUrl(pages[spreadPage2Idx])}
                  alt={`Page ${spreadPage2Idx + 1}`}
                  className="shadow-2xl rounded-sm object-contain max-h-[95dvh] max-w-[48vw] w-auto"
                  style={filterStyle}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {currentPage === pages.length && pages.length > 0 && (
              <motion.div
                key="chapter-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="fixed inset-0 z-[45] flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                onClick={e => e.stopPropagation()}
              >
                <div
                  className="text-center mx-4 w-full max-w-sm"
                  style={{ background: 'rgba(12,12,12,0.96)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '1.5rem', padding: '32px 28px' }}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">
                    End of chapter
                  </p>
                  <p className="font-bold text-base text-white/80 mb-8">
                    {filename?.replace('.cbz', '') ?? 'Chapter'}
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {prevChapterId && (
                      <button
                        onClick={navigateToPrevChapter}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Prev
                      </button>
                    )}
                    {nextUnreadChapterId ? (
                      <button
                        onClick={navigateToNextChapter}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                        style={{ background: '#dc2626', color: '#fff', boxShadow: '0 0 20px rgba(220,38,38,0.35)' }}
                      >
                        {skipReadChapters ? 'Next Unread' : 'Next Chapter'} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest py-2.5">
                        {skipReadChapters && nextChapterId ? 'All caught up!' : 'No next chapter'}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav chevrons — desktop only; mobile uses tap zones + swipe */}
          <div className="absolute bottom-10 right-10 hidden sm:flex gap-4 z-30">
            <button
              onClick={readingMode === 'manga' ? handlePrevPage : handleNextPage}
              aria-label={readingMode === 'manga' ? 'Previous page' : 'Next page'}
              className={cn("p-4 glass-panel hover:bg-white/10 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black", ((readingMode === 'manga' && currentPage === 1) || (readingMode === 'manga-rtl' && currentPage === pages.length)) && "opacity-0 pointer-events-none")}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={readingMode === 'manga' ? handleNextPage : handlePrevPage}
              aria-label={readingMode === 'manga' ? 'Next page' : 'Previous page'}
              className={cn("p-4 glass-panel hover:bg-white/10 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black", ((readingMode === 'manga' && currentPage === pages.length) || (readingMode === 'manga-rtl' && currentPage === 1)) && "opacity-0 pointer-events-none")}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

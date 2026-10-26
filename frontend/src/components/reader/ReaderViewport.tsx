import type React from 'react'
import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ReaderPageImage } from '../ReaderPageImage'
import type { DisplaySlot } from '../../hooks/useReaderNavigation'

interface Props {
  pages: string[]
  currentPage: number
  readingMode: string
  currentSlot: DisplaySlot
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
  pages, currentPage, readingMode, currentSlot,
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

    // LTR / RTL: horizontal swipe
    if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return
    e.preventDefault()
    if (readingMode === 'manga-rtl') {
      if (dx < 0) { setNavDir('back'); prevPage() } else { setNavDir('forward'); nextPage() }
    } else {
      if (dx < 0) { setNavDir('forward'); nextPage() } else { setNavDir('back'); prevPage() }
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
        "relative z-10 mx-auto transition-all duration-300 min-h-screen",
        readingMode === 'webtoon' || readingMode === 'vertical-pager'
          ? "w-full max-w-3xl block overflow-visible"
          : currentSlot.type === 'pair'
          ? "w-full max-w-[95vw] lg:max-w-7xl flex items-center justify-center px-2"
          : "w-full max-w-4xl flex items-center justify-center px-2"
      )}
      onClick={onTap}
    >
      {readingMode === 'vertical-pager' ? (
        /* Vertical Mode: distinct manga pages stacked with clear margins and shadows */
        <div
          className="flex flex-col items-center py-6 px-3 gap-6 max-w-3xl mx-auto w-full"
          style={{
            ...(zoomLevel !== 1 ? { transform: `scale(${zoomLevel})`, transformOrigin: 'top center' } : {}),
          }}
        >
          {pages.map((page, idx) => (
            <motion.div
              key={page}
              id={`page-${idx + 1}`}
              data-page={idx + 1}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '200px' }}
              transition={{ duration: 0.2 }}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '900px' }}
              className="relative w-full flex flex-col items-center"
            >
              <div className="relative shadow-2xl rounded-md border border-white/10 bg-neutral-900/60 overflow-hidden max-h-[92dvh] flex items-center justify-center">
                <ReaderPageImage
                  src={getImageUrl(page)}
                  alt={`Page ${idx + 1}`}
                  className={cn(
                    cropBorders ? "object-cover" : "object-contain",
                    "max-h-[92dvh] w-auto max-w-full"
                  )}
                  loading={idx < 3 ? "eager" : "lazy"}
                  onLoad={idx === 0 ? handlePageLoad : undefined}
                  style={filterStyle}
                />
                <div aria-live="polite" aria-atomic="true" className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono text-white/50 border border-white/10">
                  {idx + 1} / {pages.length}
                </div>
              </div>
            </motion.div>
          ))}

          {/* End of chapter panel */}
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
              style={{ contentVisibility: 'auto', containIntrinsicSize: '900px' }}
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
            aria-label={readingMode === 'manga-rtl' ? 'Next page' : 'Previous page'}
            className={`fixed inset-y-0 left-0 ${tapZoneLeft} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga-rtl' ? handleNextPage : handlePrevPage) : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (readingMode === 'manga-rtl') handleNextPage(); else handlePrevPage() } } : undefined}
          />
          <div
            role="button" tabIndex={disabled ? -1 : 0}
            aria-label={readingMode === 'manga-rtl' ? 'Previous page' : 'Next page'}
            className={`fixed inset-y-0 right-0 ${tapZoneRight} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga-rtl' ? handlePrevPage : handleNextPage) : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (readingMode === 'manga-rtl') handlePrevPage(); else handleNextPage() } } : undefined}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlot.page1}
              initial={{ opacity: 0, x: enterX }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: exitX }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn(
                "w-full flex items-center justify-center",
                currentSlot.type === 'pair' ? "gap-2 px-1" : "px-2 py-4"
              )}
              style={zoomStyle}
            >
              {currentSlot.type === 'pair' && currentSlot.page2 != null ? (
                // Spread pair: RTL = page 2 on left, page 1 on right. LTR = page 1 on left, page 2 on right.
                (readingMode === 'manga-rtl'
                  ? [currentSlot.page2, currentSlot.page1]
                  : [currentSlot.page1, currentSlot.page2]
                ).map((pageNum, i) => (
                  <div key={pageNum} className="flex-1 flex items-center justify-center min-w-0 min-h-0 overflow-hidden" style={{ maxHeight: '92dvh' }}>
                    <ReaderPageImage
                      src={getImageUrl(pages[pageNum - 1])}
                      alt={`Page ${pageNum}`}
                      className="shadow-2xl rounded-sm object-contain w-auto max-h-[92dvh] max-w-full"
                      onLoad={i === 0 ? handlePageLoad : undefined}
                      style={filterStyle}
                    />
                  </div>
                ))
              ) : (
                // Single page or wide splash
                <div className="w-full flex items-center justify-center min-h-0" style={{ maxHeight: '92dvh' }}>
                  <ReaderPageImage
                    src={getImageUrl(pages[currentSlot.page1 - 1])}
                    alt={`Page ${currentSlot.page1}`}
                    className={cn(
                      "shadow-2xl rounded-sm mx-auto",
                      cropBorders ? "object-cover" : "object-contain",
                      currentSlot.type === 'wide'
                        ? "w-auto max-h-[92dvh] max-w-full"
                        : imageScale === 'fit-screen' ? "max-h-[92dvh] w-auto max-w-full"
                        : imageScale === 'fit-width' ? "w-full max-h-none"
                        : imageScale === 'fit-height' ? "h-[92dvh] w-auto max-w-full"
                        : imageScale === 'original' ? "max-w-none"
                        : "max-h-[92dvh] w-auto max-w-full",
                      cropBorders && currentSlot.type !== 'wide' && "w-full",
                    )}
                    onLoad={handlePageLoad}
                    style={filterStyle}
                  />
                </div>
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

          {/* Nav chevrons | desktop only */}
          <div className="absolute bottom-10 right-10 hidden sm:flex gap-4 z-30">
            <button
              onClick={readingMode === 'manga-rtl' ? handleNextPage : handlePrevPage}
              aria-label={readingMode === 'manga-rtl' ? 'Next page' : 'Previous page'}
              className={cn(
                "p-4 glass-panel hover:bg-white/10 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
                ((readingMode === 'manga-rtl' && currentPage >= pages.length) || (readingMode === 'manga' && currentPage <= 1)) && "opacity-0 pointer-events-none"
              )}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={readingMode === 'manga-rtl' ? handlePrevPage : handleNextPage}
              aria-label={readingMode === 'manga-rtl' ? 'Previous page' : 'Next page'}
              className={cn(
                "p-4 glass-panel hover:bg-white/10 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
                ((readingMode === 'manga-rtl' && currentPage <= 1) || (readingMode === 'manga' && currentPage >= pages.length)) && "opacity-0 pointer-events-none"
              )}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

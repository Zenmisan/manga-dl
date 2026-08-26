import type React from 'react'
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
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>
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
}

export function ReaderViewport({
  pages, currentPage, readingMode, showSpread, spreadPage2Idx,
  getImageUrl, nextPage, prevPage, tapZoneLeft, tapZoneRight,
  setShowControls,
  nextUnreadChapterId, navigateToNextChapter, navigateToPrevChapter, prevChapterId,
  skipReadChapters, nextChapterId,
  filename, cropBorders, cropBordersWebtoon, imageScale, webtoonSidePadding,
  cssFilter, handlePageLoad,
}: Props) {
  const filterStyle = cssFilter ? { filter: cssFilter } : undefined
  const disabled = tapZoneLeft === 'w-0'

  return (
    <main
      className={cn(
        "relative z-10 mx-auto transition-all duration-500",
        readingMode === 'webtoon' ? "max-w-3xl" : "max-w-5xl h-screen flex items-center justify-center overflow-hidden"
      )}
      onClick={() => setShowControls(prev => !prev)}
    >
      {readingMode === 'vertical-pager' ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            role="button" tabIndex={disabled ? -1 : 0} aria-label="Previous page"
            className={`absolute inset-y-0 left-0 ${tapZoneLeft} z-20 cursor-pointer`}
            onClick={!disabled ? prevPage : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prevPage() } } : undefined}
          />
          <div
            role="button" tabIndex={disabled ? -1 : 0} aria-label="Next page"
            className={`absolute inset-y-0 right-0 ${tapZoneRight} z-20 cursor-pointer`}
            onClick={!disabled ? nextPage : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextPage() } } : undefined}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full w-full flex items-center justify-center p-4"
            >
              <ReaderPageImage
                src={getImageUrl(pages[currentPage - 1])}
                alt={`Page ${currentPage}`}
                className={cn(
                  "shadow-2xl rounded-sm",
                  cropBorders ? "object-cover" : "object-contain",
                  imageScale === 'fit-screen' && "max-h-[90dvh] max-w-full",
                  imageScale === 'fit-width' && "w-full max-h-none",
                  imageScale === 'fit-height' && "h-[95dvh] w-auto",
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
        <div className="flex flex-col" style={webtoonSidePadding > 0 ? { paddingLeft: webtoonSidePadding, paddingRight: webtoonSidePadding } : undefined}>
          {pages.map((page, idx) => (
            <motion.div
              key={page}
              id={`page-${idx + 1}`}
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
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            role="button" tabIndex={disabled ? -1 : 0}
            aria-label={readingMode === 'manga' ? 'Previous page' : 'Next page'}
            className={`absolute inset-y-0 left-0 ${tapZoneLeft} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga' ? prevPage : nextPage) : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (readingMode === 'manga') prevPage(); else nextPage() } } : undefined}
          />
          <div
            role="button" tabIndex={disabled ? -1 : 0}
            aria-label={readingMode === 'manga' ? 'Next page' : 'Previous page'}
            className={`absolute inset-y-0 right-0 ${tapZoneRight} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga' ? nextPage : prevPage) : undefined}
            onKeyDown={!disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (readingMode === 'manga') nextPage(); else prevPage() } } : undefined}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: readingMode === 'manga' ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: readingMode === 'manga' ? -40 : 40 }}
              transition={{ duration: 0.15 }}
              className={cn("h-full w-full flex items-center justify-center p-4", showSpread && "gap-1")}
            >
              <ReaderPageImage
                src={getImageUrl(pages[currentPage - 1])}
                alt={`Page ${currentPage}`}
                className={cn(
                  "shadow-2xl rounded-sm",
                  cropBorders ? "object-cover" : "object-contain",
                  showSpread ? "max-h-[90dvh] max-w-[50%]" : imageScale === 'fit-screen' ? "max-h-[90dvh] max-w-full" : "",
                  !showSpread && imageScale === 'fit-width' && "w-full max-h-none",
                  !showSpread && imageScale === 'fit-height' && "h-[95dvh] w-auto",
                  !showSpread && imageScale === 'original' && "max-w-none",
                  !showSpread && cropBorders && "w-full h-[90dvh]",
                )}
                onLoad={handlePageLoad}
                style={filterStyle}
              />
              {showSpread && spreadPage2Idx < pages.length && (
                <ReaderPageImage
                  src={getImageUrl(pages[spreadPage2Idx])}
                  alt={`Page ${spreadPage2Idx + 1}`}
                  className="shadow-2xl rounded-sm object-contain max-h-[90dvh] max-w-[50%]"
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

          <div className="absolute bottom-10 right-10 flex gap-4 z-30">
            <button
              onClick={readingMode === 'manga' ? prevPage : nextPage}
              aria-label={readingMode === 'manga' ? 'Previous page' : 'Next page'}
              className={cn("p-4 glass-panel hover:bg-white/10 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black", ((readingMode === 'manga' && currentPage === 1) || (readingMode === 'manga-rtl' && currentPage === pages.length)) && "opacity-0 pointer-events-none")}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={readingMode === 'manga' ? nextPage : prevPage}
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

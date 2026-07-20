import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  nextUnreadChapterId, navigateToNextChapter, skipReadChapters, nextChapterId,
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
          <div className={`absolute inset-y-0 left-0 ${tapZoneLeft} z-20 cursor-pointer`} onClick={!disabled ? prevPage : undefined} />
          <div className={`absolute inset-y-0 right-0 ${tapZoneRight} z-20 cursor-pointer`} onClick={!disabled ? nextPage : undefined} />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
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
              <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] font-mono text-white/40">
                {idx + 1} / {pages.length}
              </div>
            </motion.div>
          ))}
        </div>

      ) : (
        /* Paged mode: LTR / RTL */
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            className={`absolute inset-y-0 left-0 ${tapZoneLeft} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga' ? prevPage : nextPage) : undefined}
          />
          <div
            className={`absolute inset-y-0 right-0 ${tapZoneRight} z-20 cursor-pointer`}
            onClick={!disabled ? (readingMode === 'manga' ? nextPage : prevPage) : undefined}
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
                className="absolute inset-0 z-25 flex flex-col items-center justify-end pb-32 pointer-events-none"
              >
                <div className="glass-panel px-6 py-4 text-center pointer-events-auto shadow-2xl border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">End of chapter</p>
                  <p className="font-bold text-sm text-white/70 mb-3">{filename?.replace('.cbz', '') ?? 'Chapter'}</p>
                  {nextUnreadChapterId ? (
                    <button
                      onClick={navigateToNextChapter}
                      className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      {skipReadChapters ? 'Next Unread →' : 'Next Chapter →'}
                    </button>
                  ) : (
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                      {skipReadChapters && nextChapterId ? 'All caught up!' : 'No next chapter'}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-10 right-10 flex gap-4 z-30">
            <button
              onClick={readingMode === 'manga' ? prevPage : nextPage}
              className={cn("p-4 glass-panel hover:bg-white/10 transition-all", ((readingMode === 'manga' && currentPage === 1) || (readingMode === 'manga-rtl' && currentPage === pages.length)) && "opacity-0 pointer-events-none")}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={readingMode === 'manga' ? nextPage : prevPage}
              className={cn("p-4 glass-panel hover:bg-white/10 transition-all", ((readingMode === 'manga' && currentPage === pages.length) || (readingMode === 'manga-rtl' && currentPage === 1)) && "opacity-0 pointer-events-none")}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

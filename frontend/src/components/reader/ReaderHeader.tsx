import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Download, Layout, FileText, BookOpen,
  CloudUpload, Sparkles, Tv2, SlidersHorizontal, RotateCcw, Maximize2, Share2, Loader2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type React from 'react'

interface ReaderFilters {
  brightness: number
  contrast: number
  grayscale: boolean
  invert: boolean
  sepia: boolean
}

interface Props {
  show: boolean
  mangaTitle: string | undefined
  filename: string | undefined
  localTitle: string | null
  readingMode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager'
  setReadingMode: (mode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager') => void
  imageScale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original'
  setImageScale: (scale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original') => void
  upscaling: boolean
  setUpscaling: (v: boolean) => void
  ambilightEnabled: boolean
  setAmbilightEnabled: (v: boolean) => void
  uploading: boolean
  handleCloudUpload: () => void
  handleDownload: () => void
  handleConvertToPdf: () => void
  handleConvertToEpub: () => void
  showFilterPanel: boolean
  setShowFilterPanel: (v: boolean) => void
  readerFilters: ReaderFilters
  setReaderFilters: (partial: Partial<ReaderFilters>) => void
  resetReaderFilters: () => void
  volumeKeyMode: 'navigation' | 'brightness'
  setVolumeKeyMode: React.Dispatch<React.SetStateAction<'navigation' | 'brightness'>>
  skipReadChapters: boolean
  setSkipReadChapters: (v: boolean) => void
  onBack: () => void
}

const READING_MODES = ['webtoon', 'manga', 'manga-rtl', 'vertical-pager'] as const
const IMAGE_SCALES = ['fit-screen', 'fit-width', 'fit-height', 'original'] as const

export function ReaderHeader({
  show, mangaTitle, filename, localTitle,
  readingMode, setReadingMode, imageScale, setImageScale,
  upscaling, setUpscaling, ambilightEnabled, setAmbilightEnabled,
  uploading, handleCloudUpload, handleDownload, handleConvertToPdf, handleConvertToEpub,
  showFilterPanel, setShowFilterPanel, readerFilters, setReaderFilters, resetReaderFilters,
  volumeKeyMode, setVolumeKeyMode, skipReadChapters, setSkipReadChapters, onBack,
}: Props) {
  const modeLabel = readingMode === 'manga-rtl' ? 'RTL' : readingMode === 'vertical-pager' ? 'Vert' : readingMode
  const scaleLabel = imageScale === 'fit-screen' ? 'Screen' : imageScale === 'fit-width' ? 'Width' : imageScale === 'fit-height' ? 'Height' : 'Original'

  return (
    <AnimatePresence>
      {show && (
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 p-2 sm:p-4 md:p-6"
        >
          <div className="max-w-5xl mx-auto glass-panel p-2.5 sm:p-4 flex items-center justify-between shadow-2xl border-white/5 gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button onClick={onBack} className="p-2 sm:p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white shrink-0">
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="font-bold text-xs sm:text-sm md:text-base truncate">{mangaTitle === 'local' ? localTitle : mangaTitle}</h1>
                <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-white/30 uppercase tracking-tight truncate">
                  {mangaTitle === 'local' ? 'Local Preview' : filename?.replace('.cbz', '')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0 max-w-[60%] sm:max-w-none overflow-x-auto no-scrollbar">
              <button
                onClick={(e) => { e.stopPropagation(); setAmbilightEnabled(!ambilightEnabled) }}
                className={cn(
                  "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                  ambilightEnabled ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "text-white/40 border-transparent hover:bg-white/5"
                )}
                title="Toggle Ambilight"
              >
                <Tv2 className="w-5 h-5" />
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Ambilight</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setUpscaling(!upscaling) }}
                className={cn(
                  "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                  upscaling ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/10" : "text-white/40 border-transparent hover:bg-white/5"
                )}
                title={upscaling ? 'Disable Upscaling' : 'Enable Upscaling (Beta)'}
              >
                <Sparkles className={cn("w-5 h-5", upscaling && "fill-current animate-pulse")} />
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Enhance</span>
              </button>

              {mangaTitle === 'local' && (
                <button
                  onClick={handleCloudUpload}
                  disabled={uploading}
                  className={cn(
                    "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                    uploading ? "bg-white/5 text-white/20 border-white/5" : "bg-red-600/10 border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white"
                  )}
                  title="Upload to Cloud"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                  <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Save to Cloud</span>
                </button>
              )}

              <button onClick={handleConvertToPdf} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white" title="Export as PDF">
                <FileText className="w-5 h-5" />
              </button>
              <button onClick={handleConvertToEpub} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white" title="Export as EPUB">
                <BookOpen className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = READING_MODES.indexOf(readingMode as typeof READING_MODES[number])
                  setReadingMode(READING_MODES[(idx + 1) % READING_MODES.length])
                }}
                className={cn(
                  "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                  readingMode !== 'webtoon' ? "bg-white/10 text-white border-white/20" : "text-white/40 border-transparent hover:bg-white/5"
                )}
                title={`Current mode: ${readingMode}. Click to switch.`}
              >
                <Layout className="w-5 h-5" />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{modeLabel}</span>
              </button>

              {readingMode !== 'webtoon' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const idx = IMAGE_SCALES.indexOf(imageScale as typeof IMAGE_SCALES[number])
                    setImageScale(IMAGE_SCALES[(idx + 1) % IMAGE_SCALES.length])
                  }}
                  className="p-2.5 rounded-xl transition-all border text-white/40 border-transparent hover:bg-white/5 flex items-center gap-2"
                  title={`Image scale: ${imageScale}. Click to cycle.`}
                >
                  <Maximize2 className="w-5 h-5" />
                  <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{scaleLabel}</span>
                </button>
              )}

              <button onClick={handleDownload} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white">
                <Download className="w-5 h-5" />
              </button>

              {mangaTitle === 'online' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const url = window.location.href
                    if (navigator.share) {
                      navigator.share({ title: document.title, url })
                    } else {
                      navigator.clipboard.writeText(url).then(() => alert('Link copied!'))
                    }
                  }}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                  title="Share chapter link"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setShowFilterPanel(!showFilterPanel) }}
                className={cn(
                  "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                  showFilterPanel ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "text-white/40 border-transparent hover:bg-white/5"
                )}
                title="Image Filters"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilterPanel && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="max-w-5xl mx-auto mt-2 glass-panel p-4 shadow-2xl border-white/5"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-wrap gap-6 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                      Brightness {Math.round(readerFilters.brightness * 100)}%
                    </label>
                    <input type="range" min="0.3" max="2" step="0.05"
                      value={readerFilters.brightness}
                      onChange={e => setReaderFilters({ brightness: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                      Contrast {Math.round(readerFilters.contrast * 100)}%
                    </label>
                    <input type="range" min="0.3" max="2" step="0.05"
                      value={readerFilters.contrast}
                      onChange={e => setReaderFilters({ contrast: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(['grayscale', 'invert', 'sepia'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setReaderFilters({ [f]: !readerFilters[f] })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                          readerFilters[f]
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "text-white/30 border-white/10 hover:border-white/20"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={resetReaderFilters}
                    className="p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                    title="Reset filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Volume keys:</span>
                  <button
                    onClick={() => setVolumeKeyMode(v => v === 'navigation' ? 'brightness' : 'navigation')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                      volumeKeyMode === 'navigation'
                        ? "bg-white/10 text-white/60 border-white/20"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    )}
                  >
                    {volumeKeyMode === 'navigation' ? '↑↓ Page navigation' : '↑↓ Brightness control'}
                  </button>
                  <span className="text-[10px] text-white/20 mr-auto">
                    {volumeKeyMode === 'navigation' ? 'Volume up/down = prev/next page' : 'Volume up/down = +/− brightness'}
                  </span>
                  {mangaTitle === 'online' && (
                    <>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Skip read:</span>
                      <button
                        onClick={() => setSkipReadChapters(!skipReadChapters)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                          skipReadChapters
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-white/5 text-white/30 border-white/10 hover:border-white/20"
                        )}
                      >
                        {skipReadChapters ? 'On — Skip read chapters' : 'Off'}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      )}
    </AnimatePresence>
  )
}

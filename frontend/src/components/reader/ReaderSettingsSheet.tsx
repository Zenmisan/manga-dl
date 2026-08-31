import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ReaderFilters {
  brightness: number
  contrast: number
  grayscale: boolean
  invert: boolean
  sepia: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  readingMode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager'
  setReadingMode: (mode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager') => void
  imageScale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original'
  setImageScale: (scale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original') => void
  readerFilters: ReaderFilters
  setReaderFilters: (partial: Partial<ReaderFilters>) => void
  resetReaderFilters: () => void
  skipReadChapters: boolean
  setSkipReadChapters: (v: boolean) => void
  isOnline: boolean
}

const READING_MODES = [
  { id: 'webtoon' as const, label: 'Webtoon' },
  { id: 'manga' as const, label: 'L→R' },
  { id: 'manga-rtl' as const, label: 'R←L' },
  { id: 'vertical-pager' as const, label: 'Vertical' },
]

const IMAGE_SCALES = [
  { id: 'fit-screen' as const, label: 'Screen' },
  { id: 'fit-width' as const, label: 'Width' },
  { id: 'fit-height' as const, label: 'Height' },
  { id: 'original' as const, label: 'Original' },
]

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/30 mb-3">
      {children}
    </p>
  )
}

export function ReaderSettingsSheet({
  open, onClose,
  readingMode, setReadingMode,
  imageScale, setImageScale,
  readerFilters, setReaderFilters, resetReaderFilters,
  skipReadChapters, setSkipReadChapters,
  isOnline,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={e => e.stopPropagation()}
            aria-hidden="true"
          />

          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[60] overflow-y-auto"
            style={{
              borderRadius: '32px 32px 0 0',
              background: 'rgba(8,8,8,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderTop: '1px solid rgba(255,255,255,0.09)',
              padding: '16px 24px',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
              maxHeight: '85dvh',
            }}
            role="dialog"
            aria-label="Reader settings"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-5" aria-hidden="true">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-white/80">
                Reader Settings
              </h2>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className={cn(
                  "p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all",
                  FOCUS_RING
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reading Mode */}
            <div className="mb-6">
              <SectionLabel>Reading Mode</SectionLabel>
              <div
                className="flex gap-1 p-1 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                role="group"
                aria-label="Reading mode"
              >
                {READING_MODES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setReadingMode(id)}
                    aria-pressed={readingMode === id}
                    className={cn(
                      'flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                      readingMode === id
                        ? 'bg-[var(--accent,#dc2626)] text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                        : 'text-white/40 hover:text-white/60',
                      FOCUS_RING
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom (paged modes only) */}
            {readingMode !== 'webtoon' && (
              <div className="mb-6">
                <SectionLabel>Zoom</SectionLabel>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Image scale">
                  {IMAGE_SCALES.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setImageScale(id)}
                      aria-pressed={imageScale === id}
                      className={cn(
                        'h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                        imageScale === id
                          ? 'bg-[var(--accent,#dc2626)] text-white border-transparent shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                          : 'text-white/40 border-white/10 hover:text-white/60 hover:border-white/20',
                        FOCUS_RING
                      )}
                      style={imageScale !== id ? { background: 'rgba(255,255,255,0.04)' } : undefined}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Brightness */}
            <div className="mb-5">
              <SectionLabel>
                Brightness {Math.round(readerFilters.brightness * 100)}%
              </SectionLabel>
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.05"
                value={readerFilters.brightness}
                onChange={e => setReaderFilters({ brightness: parseFloat(e.target.value) })}
                aria-label="Brightness"
                className="w-full h-1.5"
                style={{ accentColor: '#dc2626' }}
              />
            </div>

            {/* Contrast */}
            <div className="mb-6">
              <SectionLabel>
                Contrast {Math.round(readerFilters.contrast * 100)}%
              </SectionLabel>
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.05"
                value={readerFilters.contrast}
                onChange={e => setReaderFilters({ contrast: parseFloat(e.target.value) })}
                aria-label="Contrast"
                className="w-full h-1.5"
                style={{ accentColor: '#dc2626' }}
              />
            </div>

            {/* Image filters */}
            <div className="mb-6">
              <SectionLabel>Filters</SectionLabel>
              <div className="flex gap-2 flex-wrap">
                {(['grayscale', 'invert', 'sepia'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setReaderFilters({ [f]: !readerFilters[f] })}
                    aria-pressed={readerFilters[f]}
                    className={cn(
                      'h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                      readerFilters[f]
                        ? 'bg-[var(--accent,#dc2626)] text-white border-transparent'
                        : 'text-white/40 border-white/10 hover:text-white/60 hover:border-white/20',
                      FOCUS_RING
                    )}
                    style={!readerFilters[f] ? { background: 'rgba(255,255,255,0.04)' } : undefined}
                  >
                    {f}
                  </button>
                ))}
                <button
                  onClick={resetReaderFilters}
                  aria-label="Reset all filters"
                  className={cn(
                    'h-10 px-3 rounded-xl text-white/30 hover:text-white border border-white/10 hover:border-white/20 transition-all',
                    FOCUS_RING
                  )}
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Skip read (online only) */}
            {isOnline && (
              <div>
                <SectionLabel>Options</SectionLabel>
                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div>
                    <p className="text-xs font-bold text-white/80">Skip read chapters</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      Auto-jump past already-read chapters
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={skipReadChapters}
                    onClick={() => setSkipReadChapters(!skipReadChapters)}
                    aria-label="Toggle skip read chapters"
                    className={cn(
                      'relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200',
                      skipReadChapters ? 'bg-[var(--accent,#dc2626)]' : 'bg-white/15',
                      FOCUS_RING
                    )}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
                      style={{ left: skipReadChapters ? 'calc(100% - 20px)' : '4px' }}
                    />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronDown, Download, FileText, BookOpen,
  CloudUpload, Sparkles, Tv2, Settings2, Share2, Loader2,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface ChapterItem { id: string; number?: number; title?: string }

interface Props {
  show: boolean
  mangaTitle: string | undefined
  filename: string | undefined
  localTitle: string | null
  currentChapterId?: string
  chapters?: ChapterItem[]
  onChapterSelect?: (chapterId: string) => void
  ambilightEnabled: boolean
  setAmbilightEnabled: (v: boolean) => void
  upscaling: boolean
  setUpscaling: (v: boolean) => void
  uploading: boolean
  handleCloudUpload: () => void
  handleDownload: () => void
  handleConvertToPdf: () => void
  handleConvertToEpub: () => void
  onBack: () => void
  onOpenSettings: () => void
}

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black'

export function ReaderHeader({
  show, mangaTitle, filename, localTitle,
  currentChapterId, chapters = [], onChapterSelect,
  ambilightEnabled, setAmbilightEnabled,
  upscaling, setUpscaling,
  uploading, handleCloudUpload, handleDownload,
  handleConvertToPdf, handleConvertToEpub,
  onBack, onOpenSettings,
}: Props) {
  const displayTitle = mangaTitle === 'local' ? localTitle : mangaTitle
  const displayChapter = mangaTitle === 'local' ? 'Local Preview' : filename?.replace('.cbz', '')
  const [showChapterDrop, setShowChapterDrop] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showChapterDrop) return
    const close = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowChapterDrop(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showChapterDrop])

  return (
    <AnimatePresence>
      {show && (
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-50 p-2 sm:p-4 md:p-6"
        >
          <div
            className="max-w-5xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-4 h-[56px] sm:h-[64px]"
            style={{
              background: 'rgba(8,8,8,0.88)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '1rem',
            }}
          >
            {/* Back */}
            <button
              onClick={onBack}
              aria-label="Back to library"
              className={cn(
                'p-2 sm:p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white shrink-0',
                FOCUS_RING
              )}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Title */}
            <div ref={dropRef} className="min-w-0 flex-1 px-2 text-center relative">
              <h1 className="font-bold text-xs sm:text-sm truncate leading-tight">
                {displayTitle}
              </h1>
              {chapters.length > 0 && onChapterSelect ? (
                <button
                  onClick={() => setShowChapterDrop(p => !p)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-white/30 hover:text-white/60 uppercase tracking-tight truncate transition-colors"
                >
                  {displayChapter}
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showChapterDrop && 'rotate-180')} />
                </button>
              ) : (
                <p className="text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-tight truncate">
                  {displayChapter}
                </p>
              )}

              {/* Chapter dropdown */}
              {showChapterDrop && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 max-h-64 overflow-y-auto z-[60] no-scrollbar"
                  style={{
                    background: 'rgba(8,8,8,0.97)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '0.75rem',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                  }}
                >
                  {chapters.map(ch => {
                    const isCurrent = ch.id === currentChapterId
                    return (
                      <button
                        key={ch.id}
                        onClick={() => { onChapterSelect?.(ch.id); setShowChapterDrop(false) }}
                        className="w-full text-left px-4 flex items-center gap-2 transition-colors"
                        style={{
                          height: 40, fontSize: 12, fontWeight: isCurrent ? 800 : 600,
                          color: isCurrent ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                          background: isCurrent ? 'rgba(220,38,38,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        {ch.number ? `Chapter ${ch.number}` : ch.title || ch.id}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setAmbilightEnabled(!ambilightEnabled) }}
                aria-label={ambilightEnabled ? 'Disable ambilight' : 'Enable ambilight'}
                aria-pressed={ambilightEnabled}
                className={cn(
                  'p-2.5 rounded-xl transition-all border',
                  ambilightEnabled
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    : 'text-white/30 border-transparent hover:bg-white/5',
                  FOCUS_RING
                )}
              >
                <Tv2 className="w-[18px] h-[18px]" />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setUpscaling(!upscaling) }}
                aria-label={upscaling ? 'Disable enhance' : 'Enhance local scans'}
                aria-pressed={upscaling}
                className={cn(
                  'p-2.5 rounded-xl transition-all border',
                  upscaling
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'text-white/30 border-transparent hover:bg-white/5',
                  FOCUS_RING
                )}
              >
                <Sparkles className={cn('w-[18px] h-[18px]', upscaling && 'fill-current')} />
              </button>

              {mangaTitle === 'local' && (
                <button
                  onClick={handleCloudUpload}
                  disabled={uploading}
                  aria-label={uploading ? 'Uploading…' : 'Save to cloud'}
                  className={cn(
                    'p-2.5 rounded-xl transition-all border',
                    uploading
                      ? 'text-white/20 border-white/5 bg-white/5'
                      : 'text-red-500 border-red-600/20 bg-red-600/10 hover:bg-red-600 hover:text-white',
                    FOCUS_RING
                  )}
                >
                  {uploading ? (
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  ) : (
                    <CloudUpload className="w-[18px] h-[18px]" />
                  )}
                </button>
              )}

              <button
                onClick={handleConvertToPdf}
                aria-label="Export as PDF"
                className={cn('p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/30 hover:text-white hidden sm:flex', FOCUS_RING)}
              >
                <FileText className="w-[18px] h-[18px]" />
              </button>

              <button
                onClick={handleConvertToEpub}
                aria-label="Export as EPUB"
                className={cn('p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/30 hover:text-white hidden sm:flex', FOCUS_RING)}
              >
                <BookOpen className="w-[18px] h-[18px]" />
              </button>

              <button
                onClick={handleDownload}
                aria-label="Download chapter"
                className={cn('p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/30 hover:text-white', FOCUS_RING)}
              >
                <Download className="w-[18px] h-[18px]" />
              </button>

              {mangaTitle === 'online' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const url = window.location.href
                    if (navigator.share) {
                      navigator.share({ title: document.title, url })
                    } else {
                      navigator.clipboard.writeText(url).then(() => {})
                    }
                  }}
                  aria-label="Share chapter link"
                  className={cn('p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/30 hover:text-white hidden sm:flex', FOCUS_RING)}
                >
                  <Share2 className="w-[18px] h-[18px]" />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); onOpenSettings() }}
                aria-label="Open reader settings"
                aria-haspopup="dialog"
                className={cn(
                  'p-2.5 rounded-xl transition-all border text-white/60 border-white/15 hover:bg-white/10 hover:text-white',
                  FOCUS_RING
                )}
              >
                <Settings2 className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  )
}

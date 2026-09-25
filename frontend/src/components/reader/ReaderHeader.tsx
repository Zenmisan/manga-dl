import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronDown, Download, FileText, BookOpen,
  CloudUpload, Sparkles, Tv2, Settings2, Share2, Loader2,
  Maximize2, Minimize2, AlignJustify, MessageCircle,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface ChapterItem { id: string; number?: number; title?: string }

interface Props {
  show: boolean
  mangaTitle: string | undefined
  filename: string | undefined
  localTitle: string | null
  resolvedMangaTitle?: string
  resolvedChapterTitle?: string
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
  readingMode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager'
  setReadingMode: (mode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager') => void
  onBack: () => void
  onOpenSettings: () => void
  onOpenComments?: () => void
}

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black'

function prettifySlug(s: string | undefined | null): string {
  if (!s) return ''
  return s.replace(/\.(cbz|zip|epub)$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function ReaderHeader({
  show, mangaTitle, filename, localTitle,
  resolvedMangaTitle, resolvedChapterTitle,
  currentChapterId, chapters = [], onChapterSelect,
  ambilightEnabled, setAmbilightEnabled,
  upscaling, setUpscaling,
  uploading, handleCloudUpload, handleDownload,
  handleConvertToPdf,
  readingMode, setReadingMode,
  onBack, onOpenSettings, onOpenComments,
}: Props) {
  const displayTitle = resolvedMangaTitle || localTitle || prettifySlug(mangaTitle)
  const displayChapter = resolvedChapterTitle || (mangaTitle === 'local' ? 'Local Preview' : prettifySlug(filename))
  const [showChapterDrop, setShowChapterDrop] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const chapterDropdownRef = useRef<HTMLDivElement>(null)
  const [showLayoutDrop, setShowLayoutDrop] = useState(false)
  const layoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showLayoutDrop) return
    const close = (e: MouseEvent) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) setShowLayoutDrop(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showLayoutDrop])

  const LAYOUT_MODES = [
    { id: 'webtoon' as const, label: 'Webtoon', desc: 'Vertical scroll' },
    { id: 'manga' as const, label: 'L→R Paged', desc: 'Left to right' },
    { id: 'manga-rtl' as const, label: 'R←L Paged', desc: 'Right to left' },
    { id: 'vertical-pager' as const, label: 'Vertical Paged', desc: 'Tap to page' },
  ]

  useEffect(() => {
    if (!showChapterDrop) return
    const close = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowChapterDrop(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showChapterDrop])

  // Clamp chapter dropdown to viewport so it never clips off left/right edge on mobile
  useEffect(() => {
    if (!showChapterDrop || !chapterDropdownRef.current) return
    const el = chapterDropdownRef.current
    // Reset first so getBoundingClientRect reflects natural position
    el.style.transform = 'translateX(-50%)'
    const rect = el.getBoundingClientRect()
    const margin = 8
    if (rect.left < margin) {
      el.style.transform = `translateX(calc(-50% + ${margin - rect.left}px))`
    } else if (rect.right > window.innerWidth - margin) {
      el.style.transform = `translateX(calc(-50% - ${rect.right - (window.innerWidth - margin)}px))`
    }
  }, [showChapterDrop])

  const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

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
              aria-label="Back to manga details"
              className={cn(
                'p-2 sm:p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white shrink-0',
                FOCUS_RING
              )}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Title */}
            <div ref={dropRef} className="min-w-0 flex-1 px-2 text-center relative">
              <h1 className="font-bold text-xs sm:text-sm truncate leading-tight" style={{ fontFamily: "var(--font-title, 'PT Serif', Georgia, serif)" }}>
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
                  ref={chapterDropdownRef}
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

              {/* Reading layout picker */}
              <div ref={layoutRef} className="relative hidden sm:block">
                <button
                  onClick={() => setShowLayoutDrop(p => !p)}
                  aria-label="Reading layout"
                  className={cn('p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/30 hover:text-white', showLayoutDrop && 'bg-white/10 text-white', FOCUS_RING)}
                >
                  <BookOpen className="w-[18px] h-[18px]" />
                </button>
                {showLayoutDrop && (
                  <div
                    className="absolute top-full right-0 mt-2 w-48 z-[60]"
                    style={{
                      background: 'rgba(8,8,8,0.97)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: '0.75rem',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    }}
                  >
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-black uppercase tracking-widest text-white/30">Layout</p>
                    {LAYOUT_MODES.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setReadingMode(m.id); setShowLayoutDrop(false) }}
                        className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/5 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <div>
                          <div className={cn('text-xs font-bold', readingMode === m.id ? 'text-red-400' : 'text-white/70')}>{m.label}</div>
                          <div className="text-[10px] text-white/30">{m.desc}</div>
                        </div>
                        {readingMode === m.id && <AlignJustify className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
                aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
                title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
                className={cn(
                  'p-2.5 rounded-xl transition-all border hidden sm:flex',
                  isFullscreen
                    ? 'bg-white/15 text-white border-white/20'
                    : 'text-white/60 border-white/15 hover:bg-white/10 hover:text-white',
                  FOCUS_RING
                )}
              >
                {isFullscreen ? <Minimize2 className="w-[18px] h-[18px]" /> : <Maximize2 className="w-[18px] h-[18px]" />}
              </button>

              {onOpenComments && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenComments() }}
                  aria-label="Open comments"
                  className={cn(
                    'p-2.5 rounded-xl transition-all border text-white/60 border-white/15 hover:bg-white/10 hover:text-white',
                    FOCUS_RING
                  )}
                >
                  <MessageCircle className="w-[18px] h-[18px]" />
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

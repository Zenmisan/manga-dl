import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Bell, BellOff, ListPlus,
  ArrowUpDown, Search as SearchIcon, Bookmark, BookmarkCheck,
  Eye, EyeOff, Filter, CheckCircle2, Check, Copy, ChevronDown,
} from 'lucide-react'
import { ThemedSpinner } from '../common/ThemedLoader'
import { cn } from '../../lib/utils'
import { buildSmartReadUrl } from '../../lib/smartUrl'
import { buildNovelReadUrl } from '../../lib/novelUrl'
import type { MangaDetail, Chapter } from '../../hooks/useMangaDetail'

interface CustomGlassSelectOption<T extends string> {
  value: T
  label: string
}

interface CustomGlassSelectProps<T extends string> {
  value: T
  onChange: (val: T) => void
  options: CustomGlassSelectOption<T>[]
  icon?: React.ReactNode
  className?: string
}

function CustomGlassSelect<T extends string>({
  value,
  onChange,
  options,
  icon,
  className
}: CustomGlassSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.value === value)

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer shadow-lg",
          open
            ? "bg-black/10 dark:bg-white/10 border-red-500/60 text-zinc-900 dark:text-white shadow-[0_0_15px_2px_rgba(220,38,38,0.25)]"
            : "bg-white dark:bg-[#0d0d0d] border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/20 dark:hover:border-white/20"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {icon}
          <span className="truncate">{selectedOption?.label || value}</span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0", open && "rotate-180 text-red-400")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 z-40 mt-1.5 min-w-[180px] rounded-3xl bg-white/95 dark:bg-[#0f0f0f]/95 border border-black/10 dark:border-white/15 backdrop-blur-2xl shadow-2xl p-2 overflow-hidden"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-bold transition-all text-left cursor-pointer my-0.5",
                    isSelected
                      ? "bg-red-600/20 text-red-500 dark:text-red-400 border border-red-500/30 font-black"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-400 shrink-0 ml-2" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface Props {
  manga: MangaDetail
  provider: string | undefined
  navigate: (url: string) => void
  displayedChapters: Chapter[]
  readChapters: Set<string>
  bookmarks: Set<string>
  downloading: string[]
  isAdmin: boolean
  subscribed: boolean
  subscribing: boolean
  handleSubscribe: () => void
  notifEnabled: boolean
  toggleNotif: () => void
  bulkLoading: boolean
  handleBulkDownload: () => void
  malToken: string | null
  malSyncing: boolean
  handleMALSync: () => void
  chapterSearch: string
  setChapterSearch: (val: string) => void
  chapterSort: 'default' | 'newest' | 'oldest' | 'num-asc' | 'num-desc'
  setChapterSort: (val: 'default' | 'newest' | 'oldest' | 'num-asc' | 'num-desc') => void
  readFilter: 'all' | 'unread' | 'read'
  setReadFilter: (val: 'all' | 'unread' | 'read') => void
  scanlators: string[]
  scanlatorFilter: string
  setScanlatorFilter: (val: string) => void
  handleMarkAllRead: () => void
  toggleBookmark: (chId: string, e: React.MouseEvent) => void
  toggleReadStatus: (chId: string, e: React.MouseEvent) => void
  handleDownload: (ch: Chapter) => void
  swipedChapterId: string | null
  setSwipedChapterId: (id: string | null) => void
  swipeStartX: React.MutableRefObject<number>
}

export function MangaChaptersSection({
  manga, provider, navigate, displayedChapters, readChapters, bookmarks, downloading,
  isAdmin, subscribed, subscribing, handleSubscribe, notifEnabled, toggleNotif,
  bulkLoading, handleBulkDownload, malToken, malSyncing, handleMALSync,
  chapterSearch, setChapterSearch, chapterSort, setChapterSort, readFilter, setReadFilter,
  scanlators, scanlatorFilter, setScanlatorFilter, handleMarkAllRead,
  toggleBookmark, toggleReadStatus, handleDownload, swipedChapterId, setSwipedChapterId, swipeStartX,
}: Props) {
  const swipeStartXRef = swipeStartX
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chapter: Chapter } | null>(null)
  const [hiddenChapters, setHiddenChapters] = useState<Set<string>>(new Set())
  const [copiedNotification, setCopiedNotification] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contextMenuOpenTime = useRef<number>(0)

  // Filter out user hidden chapters
  const visibleChapters = displayedChapters.filter(ch => !hiddenChapters.has(ch.id))

  const handleContextMenu = (e: React.MouseEvent, chapter: Chapter) => {
    e.preventDefault()
    e.stopPropagation()
    contextMenuOpenTime.current = Date.now()
    setContextMenu({ x: e.clientX, y: e.clientY, chapter })
  }

  const handleTouchStart = (e: React.TouchEvent, chapter: Chapter) => {
    swipeStartXRef.current = e.touches[0].clientX
    const touch = e.touches[0]
    longPressTimerRef.current = setTimeout(() => {
      contextMenuOpenTime.current = Date.now()
      setContextMenu({ x: touch.clientX, y: touch.clientY, chapter })
    }, 500)
  }

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchEnd = (e: React.TouchEvent, chapter: Chapter) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    const delta = e.changedTouches[0].clientX - swipeStartXRef.current

    // Quick strong swipe right: directly trigger download
    if (delta > 110) {
      handleDownload(chapter)
      setSwipedChapterId(null)
      setSwipeDirection(null)
      return
    }
    // Quick strong swipe left: directly toggle read status
    if (delta < -110) {
      const dummyEvent = { stopPropagation: () => {} } as unknown as React.MouseEvent
      toggleReadStatus(chapter.id, dummyEvent)
      setSwipedChapterId(null)
      setSwipeDirection(null)
      return
    }

    // Partial swipe left -> reveal Mark Read / Unread
    if (delta < -50) {
      setSwipedChapterId(chapter.id)
      setSwipeDirection('left')
    }
    // Partial swipe right -> reveal Download
    else if (delta > 50) {
      setSwipedChapterId(chapter.id)
      setSwipeDirection('right')
    } else {
      setSwipedChapterId(null)
      setSwipeDirection(null)
    }
  }

  const handleMarkPreviousAsRead = (chapter: Chapter) => {
    const dummyEvent = { stopPropagation: () => {} } as unknown as React.MouseEvent
    const idx = manga.chapters.findIndex(c => c.id === chapter.id)
    if (idx !== -1) {
      for (let i = idx; i < manga.chapters.length; i++) {
        const c = manga.chapters[i]
        if (!readChapters.has(c.id)) {
          toggleReadStatus(c.id, dummyEvent)
        }
      }
    }
    setContextMenu(null)
  }

  const handleHideChapter = (chId: string) => {
    setHiddenChapters(prev => new Set(prev).add(chId))
    setContextMenu(null)
  }

  const handleCopyLink = (chapter: Chapter) => {
    const targetUrl = manga.type === 'novel'
      ? buildNovelReadUrl(provider || '', manga.id, chapter.id, manga.title, chapter.title)
      : buildSmartReadUrl(provider || '', manga.id, chapter.id, manga.title, chapter.title)
    const fullUrl = `${window.location.origin}${targetUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedNotification(true)
    setTimeout(() => setCopiedNotification(false), 2000)
    setContextMenu(null)
  }

  const sortOptions: CustomGlassSelectOption<typeof chapterSort>[] = [
    { value: 'default', label: 'Default Sort' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'num-desc', label: 'Highest' },
    { value: 'num-asc', label: 'Lowest' },
  ]

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640
  const scanlatorOptions: CustomGlassSelectOption<string>[] = [
    { value: 'all', label: isMobileView ? 'All Groups' : 'All Scanlators' },
    ...scanlators.map(s => ({ value: s, label: s }))
  ]

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="mt-8 lg:mt-0 flex-1 relative min-w-0"
      onClick={() => setContextMenu(null)}
    >
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" /> Link copied to clipboard!
        </div>
      )}

      {/* Chapters Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4 text-zinc-900 dark:text-white">
            Chapters
            <span className="text-sm font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-1 rounded-full text-zinc-600 dark:text-zinc-400">
              {visibleChapters.length}{visibleChapters.length !== manga.chapters.length ? `/${manga.chapters.length}` : ''}
            </span>
          </h2>
          <div className="flex gap-2 flex-wrap">
            {malToken && (
              <button
                onClick={handleMALSync}
                disabled={malSyncing}
                aria-label="Mark as Reading on MAL"
                className="p-2.5 rounded-full transition-all border bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                {malSyncing ? <ThemedSpinner size="sm" /> : <ListPlus className="w-4 h-4" />}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                aria-label={subscribed ? 'Unsubscribe from new chapters' : 'Subscribe to auto-download new chapters'}
                className={cn(
                  "p-2.5 rounded-full transition-all border text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer",
                  subscribed
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-500 dark:hover:text-red-400"
                    : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {subscribing ? (
                  <ThemedSpinner size="sm" />
                ) : subscribed ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </button>
            )}
            {isAdmin && subscribed && (
              <button
                onClick={toggleNotif}
                aria-label={notifEnabled ? 'Mute notifications for this manga' : 'Unmute notifications for this manga'}
                className={cn(
                  "p-2.5 rounded-full transition-all border text-xs font-bold disabled:opacity-50 cursor-pointer",
                  notifEnabled
                    ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-500 dark:hover:text-amber-400"
                    : "bg-amber-500/20 border-amber-500/30 text-amber-500 dark:text-amber-400"
                )}
              >
                {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleBulkDownload}
                disabled={bulkLoading}
                className="py-2.5 px-4 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-900 dark:text-white font-extrabold text-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {bulkLoading ? (
                  <>
                    <ThemedSpinner size="xs" />
                    Queuing...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    Download All
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sort + Search + Filter bar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={chapterSearch}
                onChange={e => setChapterSearch(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full pl-11 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:shadow-[0_0_15px_2px_rgba(220,38,38,0.3)] transition-all"
              />
            </div>

            {/* Custom Dark Glass Sort Dropdown */}
            <CustomGlassSelect
              value={chapterSort}
              onChange={setChapterSort}
              options={sortOptions}
              icon={<ArrowUpDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />}
              className="shrink-0"
            />
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Read Filter Pills */}
            {(['all', 'unread', 'read'] as const).map(f => (
              <button
                key={f}
                onClick={() => setReadFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                  readFilter === f
                    ? "bg-red-600/20 border-red-500/30 text-red-500 dark:text-red-400 shadow-[0_0_12px_rgba(220,38,38,0.2)]"
                    : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                {f}
              </button>
            ))}

            {/* Custom Dark Glass Scanlator Dropdown */}
            {scanlators.length > 0 && (
              <CustomGlassSelect
                value={scanlatorFilter}
                onChange={setScanlatorFilter}
                options={scanlatorOptions}
                icon={<Filter className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />}
                className="shrink-0"
              />
            )}

            {/* Mark All Read Button */}
            <button
              onClick={handleMarkAllRead}
              className="sm:ml-auto text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-all flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 shrink-0 cursor-pointer"
              title="Mark all chapters as read"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="whitespace-nowrap">Mark All Read</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapters list */}
      <div className="space-y-2.5 w-full">
        {visibleChapters.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <p className="text-zinc-600 dark:text-zinc-400 text-xs font-semibold">No chapters match your search or filters</p>
          </div>
        ) : (
          visibleChapters.map((chapter) => {
            const isDownloading = downloading.includes(chapter.id)
            const isBookmarked = bookmarks.has(chapter.id)
            const isChRead = readChapters.has(chapter.id)
            const isSwiped = swipedChapterId === chapter.id
            const isSwipedLeft = isSwiped && swipeDirection === 'left'
            const isSwipedRight = isSwiped && swipeDirection === 'right'
            const pgKey = `manga-dl-pg:${provider}:${manga.id}:${chapter.id}`
            const totalKey = `manga-dl-pg-total:${provider}:${manga.id}:${chapter.id}`
            let readPct = 0
            try {
              const last = parseInt(localStorage.getItem(pgKey) || '0', 10)
              const total = parseInt(localStorage.getItem(totalKey) || '0', 10)
              if (last > 0 && total > 0) readPct = Math.min(100, Math.round((last / total) * 100))
            } catch { /* private browsing */ }

            return (
              <div
                key={chapter.id}
                className="relative overflow-hidden rounded-2xl w-full"
                style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                onContextMenu={(e) => handleContextMenu(e, chapter)}
                onTouchStart={(e) => handleTouchStart(e, chapter)}
                onTouchMove={handleTouchMove}
                onTouchEnd={(e) => handleTouchEnd(e, chapter)}
              >
                {/* Swipe background: Left swipe reveals Mark Read / Unread */}
                {isSwipedLeft && (
                  <div
                    onClick={(e) => {
                      toggleReadStatus(chapter.id, e)
                      setSwipedChapterId(null)
                      setSwipeDirection(null)
                    }}
                    className="absolute inset-0 bg-red-600/30 flex items-center justify-end pr-6 text-red-400 font-extrabold text-xs gap-2 cursor-pointer transition-colors hover:bg-red-600/40 select-none"
                  >
                    {isChRead ? (
                      <>
                        <EyeOff className="w-4 h-4" /> <span>Mark Unread</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> <span>Mark Read</span>
                      </>
                    )}
                  </div>
                )}

                {/* Swipe background: Right swipe reveals Download Chapter */}
                {isSwipedRight && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(chapter)
                      setSwipedChapterId(null)
                      setSwipeDirection(null)
                    }}
                    className="absolute inset-0 bg-emerald-600/30 flex items-center justify-start pl-6 text-emerald-400 font-extrabold text-xs gap-2 cursor-pointer transition-colors hover:bg-emerald-600/40 select-none"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                  </div>
                )}

                <div
                  onClick={() => {
                    if (isSwiped) {
                      setSwipedChapterId(null)
                      setSwipeDirection(null)
                      return
                    }
                    const targetUrl = manga.type === 'novel'
                      ? buildNovelReadUrl(provider || '', manga.id, chapter.id, manga.title, chapter.title)
                      : buildSmartReadUrl(provider || '', manga.id, chapter.id, manga.title, chapter.title)
                    navigate(targetUrl)
                  }}
                  className={cn(
                    "relative flex items-center justify-between p-3 sm:p-5 md:p-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs dark:shadow-none hover:bg-black/[0.02] dark:hover:bg-white/[0.08] cursor-pointer group transition-all duration-200 overflow-hidden",
                    "border-l-4 border-l-red-500",
                    isSwipedLeft && "-translate-x-28",
                    isSwipedRight && "translate-x-28"
                  )}
                >
                  {readPct > 0 && readPct < 100 && (
                    <div
                      className="absolute bottom-0 left-0 h-[2px] bg-red-500/60 dark:bg-white/60 transition-all duration-300"
                      style={{ width: `${readPct}%` }}
                    />
                  )}
                  <div className={cn("flex items-center gap-2 sm:gap-4 flex-1 min-w-0 overflow-hidden pr-2 sm:pr-4", isChRead && "opacity-50")}>
                    {/* Bookmark indicator */}
                    <button
                      onClick={(e) => toggleBookmark(chapter.id, e)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer",
                        isBookmarked ? "text-amber-500 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300"
                      )}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark chapter'}
                    >
                      {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-amber-500 dark:fill-amber-400" /> : <Bookmark className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold text-base md:text-lg text-zinc-900 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors truncate leading-snug">
                          {chapter.title || `Chapter ${chapter.number}`}
                        </h3>
                        {isChRead && <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium mt-2">
                        {chapter.number > 0 && <span>Ch. {chapter.number}</span>}
                        {chapter.scanlator && (
                          <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-[10px]">
                            {chapter.scanlator}
                          </span>
                        )}
                        {chapter.published_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(chapter.published_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button (Download) */}
                  {(isAdmin || isDownloading) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(chapter) }}
                        disabled={isDownloading}
                        className={cn(
                          "p-2.5 rounded-xl transition-all border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 cursor-pointer",
                          isDownloading && "border-red-500/40 text-red-500 dark:text-red-400 bg-red-500/10"
                        )}
                        aria-label="Download Chapter"
                      >
                        {isDownloading ? (
                          <ThemedSpinner size="sm" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Chapter Context Menu Overlay (Desktop Right-Click & Android/Mobile Long-Press) */}
      <AnimatePresence>
        {contextMenu && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            onClick={() => {
              if (Date.now() - contextMenuOpenTime.current > 300) setContextMenu(null)
            }}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'fixed',
                left: Math.min(contextMenu.x, window.innerWidth - 220),
                top: Math.min(contextMenu.y, window.innerHeight - 260),
              }}
              className="w-56 rounded-2xl bg-white/95 dark:bg-[#0f0f0f]/95 border border-black/10 dark:border-white/15 backdrop-blur-2xl shadow-2xl p-1.5 text-zinc-900 dark:text-white z-50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-black/10 dark:border-white/10 mb-1">
                <div className="text-xs font-black truncate text-zinc-900 dark:text-white">
                  Chapter {contextMenu.chapter.number}
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {contextMenu.chapter.title || `Chapter ${contextMenu.chapter.number}`}
                </div>
              </div>

              {/* Mark Read / Unread */}
              <button
                onClick={(e) => {
                  toggleReadStatus(contextMenu.chapter.id, e)
                  setContextMenu(null)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                {readChapters.has(contextMenu.chapter.id) ? (
                  <>
                    <EyeOff className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Mark as Unread</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Mark as Read</span>
                  </>
                )}
              </button>

              {/* Mark Previous as Read */}
              <button
                onClick={() => handleMarkPreviousAsRead(contextMenu.chapter)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Mark Previous Read</span>
              </button>

              {/* Download */}
              {isAdmin && (
                <button
                  onClick={() => {
                    handleDownload(contextMenu.chapter)
                    setContextMenu(null)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-red-500 dark:text-red-400" />
                  <span>Download Chapter</span>
                </button>
              )}

              {/* Bookmark */}
              <button
                onClick={(e) => {
                  toggleBookmark(contextMenu.chapter.id, e)
                  setContextMenu(null)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                {bookmarks.has(contextMenu.chapter.id) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span>Remove Bookmark</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span>Bookmark Chapter</span>
                  </>
                )}
              </button>

              {/* Copy Link */}
              <button
                onClick={() => handleCopyLink(contextMenu.chapter)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <span>Copy Link</span>
              </button>

              {/* Hide Chapter */}
              <button
                onClick={() => handleHideChapter(contextMenu.chapter.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors text-left border-t border-black/10 dark:border-white/10 mt-1 pt-2 cursor-pointer"
              >
                <EyeOff className="w-4 h-4 text-red-500 dark:text-red-400" />
                <span>Hide Chapter</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

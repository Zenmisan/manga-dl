import type React from 'react'
import { motion } from 'framer-motion'
import {
  Download, Loader2, Bell, BellOff, ListPlus, Play,
  ArrowUpDown, Search as SearchIcon, Bookmark, BookmarkCheck,
  Eye, EyeOff, Filter, CheckCircle2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { buildSmartReadUrl } from '../../lib/smartUrl'
import type { MangaDetail, Chapter } from '../../hooks/useMangaDetail'

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
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 lg:mt-0 flex-1"
    >
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4">
            Chapters
            <span className="text-sm font-mono bg-white/5 px-2 py-1 rounded-lg text-white/20">
              {displayedChapters.length}{displayedChapters.length !== manga.chapters.length ? `/${manga.chapters.length}` : ''}
            </span>
          </h2>
          <div className="flex gap-2 flex-wrap">
            {malToken && (
              <button
                onClick={handleMALSync}
                disabled={malSyncing}
                title="Mark as Reading on MAL"
                className="p-2.5 rounded-xl transition-all border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
              >
                {malSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                title={subscribed ? 'Unsubscribe from new chapters' : 'Subscribe to auto-download new chapters'}
                className={cn(
                  "p-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2 disabled:opacity-50",
                  subscribed
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                {subscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
                title={notifEnabled ? 'Mute notifications for this manga' : 'Unmute notifications for this manga'}
                className={cn(
                  "p-2.5 rounded-xl transition-all border text-xs font-bold disabled:opacity-50",
                  notifEnabled
                    ? "bg-white/5 border-white/10 text-white/40 hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-400"
                    : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                )}
              >
                {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleBulkDownload}
                disabled={bulkLoading}
                className="btn-secondary py-2 text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
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
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={chapterSearch}
                onChange={e => setChapterSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 text-white placeholder:text-white/20"
              />
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
              <select value={chapterSort} onChange={e => setChapterSort(e.target.value as typeof chapterSort)}
                className="select-styled text-xs">
                <option value="default">Default</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="num-desc">Highest #</option>
                <option value="num-asc">Lowest #</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Read filter */}
            {(['all','unread','read'] as const).map(f => (
              <button key={f} onClick={() => setReadFilter(f)}
                className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                  readFilter === f ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/30 hover:border-white/10"
                )}
              >{f}</button>
            ))}

            {/* Scanlator filter */}
            {scanlators.length > 0 && (
              <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg px-2 py-0.5">
                <Filter className="w-3 h-3 text-white/30" />
                <select value={scanlatorFilter} onChange={e => setScanlatorFilter(e.target.value)}
                  className="select-styled text-[10px] py-0.5">
                  <option value="all">All scanlators</option>
                  {scanlators.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Mark all read */}
            <button
              onClick={handleMarkAllRead}
              className="sm:ml-auto text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 shrink-0"
              title="Mark all chapters as read"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span className="whitespace-nowrap">Mark All Read</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapters list */}
      <div className="space-y-3">
        {displayedChapters.length === 0 ? (
          <div className="p-8 text-center glass-panel border-white/5">
            <p className="text-white/30 text-sm font-semibold">No chapters match your filters</p>
          </div>
        ) : (
          displayedChapters.map((chapter) => {
            const isDownloading = downloading.includes(chapter.id)
            const isBookmarked = bookmarks.has(chapter.id)
            const isChRead = readChapters.has(chapter.id)
            const isSwiped = swipedChapterId === chapter.id

            return (
              <div
                key={chapter.id}
                className="relative overflow-hidden rounded-2xl"
                onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX }}
                onTouchEnd={(e) => {
                  const delta = e.changedTouches[0].clientX - swipeStartX.current
                  if (delta < -60) setSwipedChapterId(chapter.id)
                  else if (delta > 60) setSwipedChapterId(null)
                }}
              >
                {/* Swipe background action (Mark Read) */}
                <div
                  onClick={(e) => { toggleReadStatus(chapter.id, e); setSwipedChapterId(null) }}
                  className="absolute inset-0 bg-blue-600/30 flex items-center justify-end pr-6 text-white font-bold text-xs gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> {isChRead ? 'Mark Unread' : 'Mark Read'}
                </div>

                <div 
                  onClick={() => {
                    const targetUrl = buildSmartReadUrl(provider || '', manga.id, chapter.id, manga.title, chapter.title)
                    navigate(targetUrl)
                  }}
                  className={cn(
                    "relative flex items-center justify-between p-4 md:p-5 glass-card hover:bg-white/[0.06] cursor-pointer group transition-all border-white/5",
                    isChRead && "opacity-50",
                    isSwiped && "-translate-x-28"
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0 pr-4">
                    {/* Bookmark indicator */}
                    <button
                      onClick={(e) => toggleBookmark(chapter.id, e)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors shrink-0",
                        isBookmarked ? "text-amber-400" : "text-white/10 hover:text-white/30"
                      )}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark chapter'}
                    >
                      {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-amber-400" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm md:text-base text-white/90 group-hover:text-white transition-colors truncate">
                          {chapter.title}
                        </h3>
                        {isChRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Read" />}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] md:text-xs text-white/30 font-medium mt-1">
                        <span>Chapter {chapter.number}</span>
                        {chapter.published_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(chapter.published_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => toggleReadStatus(chapter.id, e)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all border",
                        isChRead
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          : "bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10"
                      )}
                      title={isChRead ? 'Mark as Unread' : 'Mark as Read'}
                    >
                      {isChRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(chapter) }}
                        disabled={isDownloading}
                        className={cn(
                          "p-3 rounded-xl transition-all border",
                          isDownloading 
                            ? "bg-red-500/10 border-red-500/20 text-red-500" 
                            : "bg-white/5 border-white/5 text-white/30 group-hover:text-white group-hover:bg-white/10"
                        )}
                        title="Download Chapter"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const targetUrl = buildSmartReadUrl(provider || '', manga.id, chapter.id, manga.title, chapter.title)
                        navigate(targetUrl)
                      }}
                      className="p-3 rounded-xl transition-all border bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white hover:border-violet-500 shadow-lg"
                      title="Read Online"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

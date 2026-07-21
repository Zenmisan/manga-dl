import type React from 'react'
import { motion } from 'framer-motion'
import {
  Book, Pin, PinOff, Trash2, BookOpen, HardDrive, WifiOff, CheckSquare, Square,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import { buildSmartReadUrl } from '../../lib/smartUrl'
import type { LibraryItem, LastReadEntry } from '../../hooks/useDashboardData'

interface Props {
  item: LibraryItem
  idx: number
  view: 'grid' | 'list'
  selectMode: boolean
  isSelected: boolean
  isPinned: boolean
  lastRead: LastReadEntry | undefined
  navigate: (url: string) => void
  onToggleSelect: (title: string, e: React.MouseEvent) => void
  onTogglePin: (title: string, e: React.MouseEvent) => void
  onDelete: (item: LibraryItem, e: React.MouseEvent) => void
}

export function DashboardMangaCard({
  item, idx, view, selectMode, isSelected, isPinned, lastRead, navigate,
  onToggleSelect, onTogglePin, onDelete,
}: Props) {
  const isCloudOnly = !item.isLocal && item.files.length === 0

  const handleClick = (e: React.MouseEvent) => {
    if (selectMode) {
      onToggleSelect(item.title, e)
      return
    }
    if (item.isLocal) {
      navigate(`/read/local/${encodeURIComponent(item.title)}`)
    } else if (item.provider && item.provider_manga_id) {
      navigate(`/manga/detail/${item.provider}/${encodeURIComponent(item.provider_manga_id)}`)
    }
  }

  const coverSrc = item.cover_url
    ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(item.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`
    : item.files.length > 0 && item.provider && item.provider_manga_id
    ? `${api.defaults.baseURL || ''}/manga/cover/${item.provider}/${encodeURIComponent(item.provider_manga_id)}?api_key=${localStorage.getItem('manga-api-key') || ''}`
    : null

  if (view === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.03 }}
        onClick={handleClick}
        className={cn(
          "glass-card p-4 flex items-center justify-between group cursor-pointer border-white/5 hover:border-white/20 transition-all",
          isSelected && "border-red-500/50 bg-red-500/5"
        )}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {selectMode && (
            <button onClick={(e) => onToggleSelect(item.title, e)} className="text-white/40 hover:text-white shrink-0">
              {isSelected ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5" />}
            </button>
          )}
          <div className="w-12 h-16 rounded-xl bg-white/5 overflow-hidden shrink-0 flex items-center justify-center border border-white/10 relative">
            {coverSrc ? (
              <img src={coverSrc} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <Book className="w-5 h-5 text-white/20" />
            )}
            {item.isLocal && (
              <div className="absolute top-1 left-1 bg-amber-500/80 p-0.5 rounded shadow">
                <HardDrive className="w-2.5 h-2.5 text-black" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm md:text-base text-white/90 group-hover:text-white transition-colors truncate">
                {item.title}
              </h3>
              {item.subscribed && (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md shrink-0">
                  Subscribed
                </span>
              )}
              {isCloudOnly && (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md shrink-0 flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" /> Cloud
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 font-medium mt-1">
              {item.isLocal ? 'Local CBZ Archive' : `${item.total_chapters || item.files.length} chapters`}
              {item.chapters_downloading > 0 && <span className="text-amber-400 ml-2 animate-pulse"> Downloading ({item.chapters_downloading})</span>}
            </p>
            {lastRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const targetUrl = buildSmartReadUrl(lastRead.provider, lastRead.mangaId, lastRead.chapterId, lastRead.mangaTitle, lastRead.chapterTitle)
                  navigate(targetUrl)
                }}
                className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400 transition-all cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                Continue reading
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => onTogglePin(item.title, e)}
            className={cn("p-2 rounded-xl transition-all border", isPinned ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-white/5 border-white/5 text-white/20 hover:text-white")}
            title={isPinned ? "Unpin from top" : "Pin to top"}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => onDelete(item, e)}
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer"
            title="Delete series"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      onClick={handleClick}
      className={cn(
        "glass-card p-4 group cursor-pointer flex flex-col justify-between relative overflow-hidden transition-all border-white/5 hover:border-white/20",
        isSelected && "border-red-500/50 bg-red-500/5"
      )}
    >
      <div className="aspect-[3/4] bg-white/5 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all">
        {coverSrc ? (
          <img src={coverSrc} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <Book className="w-10 h-10 text-white/10 group-hover:scale-110 transition-transform" />
        )}

        {selectMode && (
          <div className="absolute top-2 left-2 z-10">
            {isSelected ? <CheckSquare className="w-6 h-6 text-red-500 drop-shadow" /> : <Square className="w-6 h-6 text-white/40 drop-shadow" />}
          </div>
        )}

        {isPinned && (
          <div className="absolute top-2 right-2 bg-amber-500/90 text-black p-1 rounded-lg shadow-lg">
            <Pin className="w-3.5 h-3.5 fill-current" />
          </div>
        )}

        {item.isLocal && (
          <div className="absolute bottom-2 left-2 bg-amber-500/90 text-black px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow flex items-center gap-1">
            <HardDrive className="w-2.5 h-2.5" /> Local
          </div>
        )}

        {isCloudOnly && (
          <div className="absolute bottom-2 left-2 bg-sky-500/80 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow flex items-center gap-1">
            <WifiOff className="w-2.5 h-2.5" /> Cloud
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold text-base text-white/90 group-hover:text-white transition-colors line-clamp-1 mb-1">
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-white/40 font-medium">
          <span>{item.isLocal ? 'Local Archive' : `${item.total_chapters || item.files.length} chapters`}</span>
          {item.chapters_downloading > 0 && <span className="text-amber-400 font-bold animate-pulse">↓{item.chapters_downloading}</span>}
          {item.chapters_failed > 0 && <span className="text-red-400"> ✗{item.chapters_failed}</span>}
        </div>
        {lastRead && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              const targetUrl = buildSmartReadUrl(lastRead.provider, lastRead.mangaId, lastRead.chapterId, lastRead.mangaTitle, lastRead.chapterTitle)
              navigate(targetUrl)
            }}
            className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-red-600/80 hover:bg-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all w-fit cursor-pointer"
          >
            <BookOpen className="w-3 h-3" />
            Continue
          </button>
        )}
      </div>
    </motion.div>
  )
}

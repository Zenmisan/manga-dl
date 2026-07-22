import type React from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Tag, Clock, Info, Pencil, BookOpen } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import type { MangaDetail } from '../../hooks/useMangaDetail'

interface Props {
  manga: MangaDetail
  themeColor: string
  imgRef: React.RefObject<HTMLImageElement | null>
  onOpenMetaEdit: () => void
}

export function MangaInfoCard({ manga, themeColor, imgRef, onOpenMetaEdit }: Props) {
  const [imgError, setImgError] = useState(false)
  const proxyUrl = manga.cover_url
    ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`
    : ''

  return (
    <>
      {/* Cover Art */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-48 md:w-64 shrink-0 mx-auto md:mx-0 lg:mx-auto"
      >
        <div 
          className="aspect-[3/4.5] glass-panel p-2 shadow-2xl transition-shadow duration-1000"
          style={{ boxShadow: `0 25px 50px -12px ${themeColor}` }}
        >
          {proxyUrl && !imgError ? (
            <img
              ref={imgRef}
              src={proxyUrl}
              alt={manga.title}
              className="w-full h-full object-cover rounded-xl"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-xl">
              <BookOpen className="w-12 h-12 text-white/20" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Info Content */}
      <div className="flex-1 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span 
              className="px-3 py-1 text-xs font-black uppercase tracking-[0.2em] border rounded-lg transition-colors duration-1000"
              style={{ backgroundColor: 'var(--theme-color)', color: '#fff', borderColor: 'var(--theme-color)', opacity: 0.8 }}
            >
              {manga.provider}
            </span>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-2 h-2 rounded-full",
                manga.status === 'ongoing' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-sky-400'
              )} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                {manga.status || 'unknown'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <h1 className="text-xl sm:text-3xl md:text-6xl font-black tracking-tighter leading-tight text-white flex-1">
              {manga.title}
            </h1>
            <button
              onClick={onOpenMetaEdit}
              title="Edit metadata"
              className="mt-2 p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-4 text-white/40 mb-8">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{manga.authors.join(', ') || 'Unknown Author'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span className="text-sm font-medium">{manga.genres.slice(0, 3).join(', ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{manga.chapters.length} Chapters</span>
            </div>
          </div>

          <div className="glass-panel p-6 border-white/5 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Synopsis
            </h3>
            <p className="text-white/60 leading-relaxed line-clamp-4 md:line-clamp-none text-sm md:text-base font-medium">
              {manga.description || 'No description available for this series.'}
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}

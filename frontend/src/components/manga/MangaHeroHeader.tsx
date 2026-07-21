import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import api from '../../lib/api'
import type { MangaDetail } from '../../hooks/useMangaDetail'

interface Props {
  manga: MangaDetail
  themeColor: string
  showQueueLink: boolean
  onBack: () => void
  onQueueClick: () => void
}

export function MangaHeroHeader({ manga, themeColor, showQueueLink, onBack, onQueueClick }: Props) {
  const proxyUrl = manga.cover_url
    ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`
    : undefined

  return (
    <div className="relative h-64 md:h-96 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110 transition-all duration-1000"
        style={{ backgroundImage: proxyUrl ? `url(${proxyUrl})` : undefined, backgroundColor: themeColor }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6 md:p-12 h-full flex items-end">
        <button 
          onClick={onBack}
          className="absolute top-8 left-6 p-3 glass-panel hover:bg-white/10 transition-all text-white shadow-xl z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <AnimatePresence>
          {showQueueLink && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={onQueueClick}
              className="absolute top-8 right-6 flex items-center gap-2 px-5 py-3 glass-panel transition-all shadow-xl z-10 font-bold text-sm"
              style={{ backgroundColor: 'var(--theme-color)', color: '#fff', opacity: 0.9 }}
            >
              <ExternalLink className="w-4 h-4" />
              View Queue
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

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
    <div style={{ position: 'relative', height: 260, overflow: 'hidden', background: 'linear-gradient(150deg, #3f1d1d, #1c0a0a)' }}>
      {/* Blurred Backdrop Image */}
      {proxyUrl && (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${proxyUrl})`,
            backgroundColor: themeColor,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(36px)', opacity: 0.35, transform: 'scale(1.1)',
            transition: 'all 1s',
          }}
        />
      )}

      {/* Fade overlay to body background */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, var(--bg) 100%)' }} />

      {/* Header controls */}
      <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-start', padding: '16px 16px 0' }}>
        <button
          onClick={onBack}
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', border: '1px solid rgba(255,255,255,.1)',
            cursor: 'pointer', zIndex: 10,
          }}
          aria-label="Go Back"
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </button>

        <AnimatePresence>
          {showQueueLink && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={onQueueClick}
              className="btn-primary"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, zIndex: 10 }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              View Queue
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

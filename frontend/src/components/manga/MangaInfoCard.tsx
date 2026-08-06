import type React from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Tag, Clock, Info, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../lib/api'
import type { MangaDetail } from '../../hooks/useMangaDetail'

interface Props {
  manga: MangaDetail
  themeColor: string
  imgRef: React.RefObject<HTMLImageElement | null>
}

export function MangaInfoCard({ manga, themeColor, imgRef }: Props) {
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const proxyUrl = manga.cover_url
    ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`
    : ''

  const isLong = (manga.description?.length ?? 0) > 160

  return (
    <>
      {/* Cover — overlaps hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginTop: -110, marginBottom: 16, display: 'flex', justifyContent: 'center' }}
      >
        <div className="manga-cover" style={{ width: 140, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: `0 20px 40px -8px ${themeColor}55` }}>
          {proxyUrl && !imgError ? (
            <img ref={imgRef} src={proxyUrl} alt={manga.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
              <BookOpen style={{ width: 32, height: 32, color: 'var(--muted3)' }} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        {/* Source badge + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 6, background: `${themeColor}22`, border: `1px solid ${themeColor}44`, color: themeColor }}>
            {manga.provider}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: manga.status === 'ongoing' ? 'rgb(52,211,153)' : 'rgb(56,189,248)' }} />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)' }}>{manga.status || 'unknown'}</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <h1 className="page-title" style={{ fontSize: 'clamp(22px, 5vw, 36px)', lineHeight: 1.1 }}>{manga.title}</h1>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { icon: User, label: 'Author', val: manga.authors[0] || 'Unknown' },
            { icon: Clock, label: 'Chapters', val: String(manga.chapters.length) },
            { icon: Tag, label: 'Genre', val: manga.genres[0] || '—' },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
              <Icon style={{ width: 14, height: 14, color: 'var(--muted3)', margin: '0 auto 4px' }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted3)', letterSpacing: '0.08em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Synopsis */}
        {manga.description && (
          <div style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>
              <Info style={{ width: 12, height: 12 }} /> Synopsis
            </div>
            <p
              style={{ fontSize: 13, color: 'var(--muted1)', lineHeight: 1.65, whiteSpace: 'pre-line' }}
              className={!expanded && isLong ? 'line-clamp-4' : ''}
            >
              {manga.description}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 10,
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                <span>{expanded ? 'Show Less' : 'Read More'}</span>
                {expanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

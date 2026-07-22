import type React from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Book, Pin, PinOff, Trash2, BookOpen, HardDrive, WifiOff, CheckSquare, Square, Download,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import { buildSmartReadUrl } from '../../lib/smartUrl'
import type { LibraryItem, LastReadEntry } from '../../hooks/useDashboardData'

interface Props {
  item: LibraryItem
  idx: number
  view: 'grid' | 'list'
  density: 'large' | 'compact'
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
  item, idx, view, density, selectMode, isSelected, isPinned, lastRead, navigate,
  onToggleSelect, onTogglePin, onDelete,
}: Props) {
  const [coverError, setCoverError] = useState(false)
  const isCloudOnly = !item.isLocal && item.files.length === 0
  const isCompact = view === 'grid' && density === 'compact'
  const chapterCount = item.total_chapters || item.files.length

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
    : null

  if (view === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.025 }}
        onClick={handleClick}
        className="group cursor-pointer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 14px',
          borderRadius: 14,
          background: isSelected ? 'var(--accent-muted)' : 'var(--surface)',
          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
          transition: 'background 0.12s ease, border-color 0.12s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          {selectMode && (
            <button onClick={(e) => onToggleSelect(item.title, e)} style={{ color: 'var(--muted3)', flexShrink: 0 }}>
              {isSelected ? <CheckSquare className="w-5 h-5" style={{ color: 'var(--accent)' }} /> : <Square className="w-5 h-5" />}
            </button>
          )}
          <div style={{ width: 44, height: 60, borderRadius: 8, background: 'var(--surface-hover)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', position: 'relative' }}>
            {coverSrc && !coverError ? (
              <img src={coverSrc} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setCoverError(true)} />
            ) : (
              <Book style={{ width: 18, height: 18, color: 'var(--muted3)' }} />
            )}
            {item.isLocal && (
              <div style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(245,158,11,0.9)', padding: 2, borderRadius: 4 }}>
                <HardDrive style={{ width: 8, height: 8, color: '#000' }} />
              </div>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </h3>
              {item.subscribed && (
                <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(52,211,153,0.15)', color: 'rgb(52,211,153)', border: '1px solid rgba(52,211,153,0.3)', padding: '1px 6px', borderRadius: 6, flexShrink: 0 }}>Sub</span>
              )}
              {isCloudOnly && (
                <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(56,189,248,0.1)', color: 'rgb(56,189,248)', border: '1px solid rgba(56,189,248,0.2)', padding: '1px 6px', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <WifiOff style={{ width: 8, height: 8 }} /> Cloud
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 500, margin: '3px 0 0' }}>
              {item.isLocal ? 'Local Archive' : `${chapterCount} chapters`}
              {item.chapters_downloading > 0 && <span style={{ color: 'rgb(251,191,36)', marginLeft: 8 }}> ↓{item.chapters_downloading}</span>}
            </p>
            {lastRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(buildSmartReadUrl(lastRead.provider, lastRead.mangaId, lastRead.chapterId, lastRead.mangaTitle, lastRead.chapterTitle))
                }}
                style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--accent-muted)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', cursor: 'pointer' }}
              >
                <BookOpen style={{ width: 10, height: 10 }} />
                Continue
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={(e) => onTogglePin(item.title, e)}
            className="icon-btn"
            style={isPinned ? { background: 'rgba(245,158,11,0.15)', color: 'rgb(245,158,11)', borderColor: 'rgba(245,158,11,0.3)' } : {}}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => onDelete(item, e)}
            className="icon-btn"
            style={{ color: 'var(--muted3)' }}
            title="Delete series"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.03 }}
      onClick={handleClick}
      className="group cursor-pointer"
    >
      {/* Cover */}
      <div
        className={cn('manga-cover', isCompact && 'compact')}
        style={isSelected ? { boxShadow: `inset 0 0 0 2px var(--accent)` } : {}}
      >
        {coverSrc && !coverError ? (
          <img
            src={coverSrc}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', display: 'block' }}
            className="group-hover:scale-105"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
            <Book style={{ width: isCompact ? 20 : 28, height: isCompact ? 20 : 28, color: 'var(--muted3)' }} />
          </div>
        )}

        {/* Select checkbox */}
        {selectMode && (
          <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }}>
            {isSelected
              ? <CheckSquare style={{ width: 20, height: 20, color: 'var(--accent)', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }} />
              : <Square style={{ width: 20, height: 20, color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }} />
            }
          </div>
        )}

        {/* Pin badge */}
        {isPinned && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(245,158,11,0.92)', borderRadius: 6, padding: 4 }}>
            <Pin style={{ width: 10, height: 10, color: '#000', fill: 'currentColor' }} />
          </div>
        )}

        {/* Downloaded badge (bottom-left) */}
        {item.files.length > 0 && !item.isLocal && (
          <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '3px 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Download style={{ width: 10, height: 10, color: 'rgb(74,222,128)' }} />
            {!isCompact && <span style={{ fontSize: 9, fontWeight: 900, color: 'rgb(74,222,128)' }}>{item.files.length}</span>}
          </div>
        )}

        {/* Local badge */}
        {item.isLocal && (
          <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '3px 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <HardDrive style={{ width: 10, height: 10, color: 'rgb(251,191,36)' }} />
          </div>
        )}

        {/* Downloading indicator */}
        {item.chapters_downloading > 0 && (
          <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(251,191,36,0.9)', borderRadius: 6, padding: '2px 5px', fontSize: 9, fontWeight: 900, color: '#000' }}>
            ↓{item.chapters_downloading}
          </div>
        )}
      </div>

      {/* Meta below cover — large density only */}
      {!isCompact && (
        <div style={{ marginTop: 8, paddingLeft: 2 }}>
          <h3 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
            {item.title}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted3)', margin: '3px 0 0', fontWeight: 500 }}>
            {item.isLocal ? 'Local' : chapterCount > 0 ? `Ch. ${chapterCount}` : '—'}
          </p>
          {lastRead && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigate(buildSmartReadUrl(lastRead.provider, lastRead.mangaId, lastRead.chapterId, lastRead.mangaTitle, lastRead.chapterTitle))
              }}
              style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'var(--accent)', borderRadius: 6, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', cursor: 'pointer', border: 'none' }}
            >
              <BookOpen style={{ width: 9, height: 9 }} />
              Continue
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

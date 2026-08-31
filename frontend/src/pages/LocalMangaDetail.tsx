import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Play, HardDrive, CheckCircle, Circle, CheckCheck } from 'lucide-react'
import { getLocalManga, getAllLocalManga, loadLocalMangaIntoSession, type LocalMangaEntry, type LocalChapterMeta, type LocalMangaSession } from '../lib/localLibrary'
import { getReadChapters, markRead, markUnread, markAllRead } from '../lib/readTracking'
import { ThemedLoadingScreen } from '../components/common/ThemedLoader'

interface CtxMenu { x: number; y: number; chapter: LocalChapterMeta }

export default function LocalMangaDetail() {
  const { localId } = useParams<{ localId: string }>()
  const navigate = useNavigate()
  const id = localId ? decodeURIComponent(localId) : ''

  const [entry, setEntry] = useState<LocalMangaEntry | null>(null)
  const [chapters, setChapters] = useState<LocalChapterMeta[]>([])
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      const e = await getLocalManga(id)
      if (!e) { setLoading(false); return }
      setEntry(e)

      // Collect chapters from ALL archives sharing the same series title
      const sTitle = (e.seriesTitle || e.title).toLowerCase().trim()
      const allEntries = await getAllLocalManga()
      const related = allEntries
        .filter(x => (x.seriesTitle || x.title).toLowerCase().trim() === sTitle)
        .sort((a, b) => a.addedAt - b.addedAt)

      const allHaveSummary = related.length > 0 && related.every(x => x.chaptersSummary && x.chaptersSummary.length > 0)

      if (allHaveSummary) {
        const merged: LocalChapterMeta[] = []
        for (const rel of related) {
          for (const ch of rel.chaptersSummary!) {
            if (!merged.some(m => m.number === ch.number)) {
              // Use compound ID for archives other than the current one
              merged.push({ id: rel.id === id ? ch.id : `${rel.id}:${ch.id}`, number: ch.number, title: ch.title })
            }
          }
        }
        setChapters(merged.sort((a, b) => a.number - b.number))
        setLoading(false)
      } else {
        const ok = await loadLocalMangaIntoSession(e.id, undefined)
        if (ok) {
          const session = (window as unknown as Record<string, unknown>).__LOCAL_MANGA_SESSION__ as LocalMangaSession | undefined
          setChapters([...(session?.chapters || [])].sort((a, b) => a.number - b.number))
        }
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!id) return
    setReadChapters(getReadChapters('local', id))
  }, [id])

  useEffect(() => {
    if (!ctxMenu) return
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [ctxMenu])

  const goRead = useCallback((chapterId: string) => {
    // Compound IDs (archiveId:chapterId) navigate directly to the correct archive
    if (chapterId.includes(':')) {
      navigate(`/read/local/${chapterId}`)
    } else {
      navigate(`/read/local/${id}:${chapterId}`)
    }
  }, [id, navigate])

  const resumeChapterId = id ? (localStorage.getItem(`manga-dl-last-chapter:local:${id}`) ?? null) : null
  const resumeChapter = chapters.find(c => c.id === resumeChapterId)

  const handleMarkRead = (chapter: LocalChapterMeta) => {
    markRead('local', id, chapter.id)
    setReadChapters(prev => new Set([...prev, chapter.id]))
    setCtxMenu(null)
  }

  const handleMarkUnread = (chapter: LocalChapterMeta) => {
    markUnread('local', id, chapter.id)
    setReadChapters(prev => { const next = new Set(prev); next.delete(chapter.id); return next })
    setCtxMenu(null)
  }

  const handleMarkAllRead = () => {
    const allIds = chapters.map(c => c.id)
    markAllRead('local', id, allIds)
    setReadChapters(new Set(allIds))
  }

  const readCount = chapters.filter(c => readChapters.has(c.id)).length

  if (loading) return <ThemedLoadingScreen message="Loading chapters…" fullScreen={false} />

  if (!entry) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--muted2)', fontSize: 14 }}>Manga not found in local library.</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer', fontSize: 13 }}>Go Back</button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 80px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ padding: 8, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <HardDrive style={{ width: 13, height: 13, color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>Local Upload</span>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg)', margin: '2px 0 0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.seriesTitle || entry.title}
          </h1>
        </div>
      </div>

      {/* Continue / Start button */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => goRead(resumeChapter?.id || chapters[0]?.id || '')}
          disabled={chapters.length === 0}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 12, background: 'var(--accent)', color: '#fff',
            border: 'none', cursor: chapters.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 800, letterSpacing: '0.03em',
            opacity: chapters.length === 0 ? 0.5 : 1,
          }}
        >
          <Play style={{ width: 14, height: 14, fill: 'currentColor' }} />
          {resumeChapter ? `Continue Ch. ${resumeChapter.number}` : 'Start Reading'}
        </button>
        {readCount < chapters.length && (
          <button
            onClick={handleMarkAllRead}
            title="Mark all as read"
            style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CheckCheck style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, color: 'var(--muted2)' }}>
          <span style={{ fontWeight: 800, color: 'var(--fg)' }}>{chapters.length}</span> chapters
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted2)' }}>
          <span style={{ fontWeight: 800, color: 'var(--fg)' }}>{readCount}</span> read
        </span>
        {readCount > 0 && chapters.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--muted2)' }}>
            <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{Math.round((readCount / chapters.length) * 100)}%</span> complete
          </span>
        )}
      </div>

      {/* Chapter list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {chapters.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--muted2)', fontSize: 13, padding: '32px 0' }}>No chapters found.</p>
        )}
        {chapters.map((ch) => {
          const isRead = readChapters.has(ch.id)
          return (
            <div
              key={ch.id}
              onClick={() => goRead(ch.id)}
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, chapter: ch }) }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goRead(ch.id) } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent',
                transition: 'background 0.1s',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {isRead
                ? <CheckCircle style={{ width: 16, height: 16, color: 'var(--muted3)', flexShrink: 0 }} />
                : <Circle style={{ width: 16, height: 16, color: 'var(--accent)', flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isRead ? 'var(--muted2)' : 'var(--fg)' }}>
                  {ch.title || `Chapter ${ch.number}`}
                </span>
              </div>
              {ch.id === resumeChapterId && (
                <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(220,38,38,0.12)', color: 'var(--accent)', border: '1px solid rgba(220,38,38,0.25)', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>
                  Last read
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Right-click context menu */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            ref={ctxRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              top: ctxMenu.y,
              left: ctxMenu.x,
              zIndex: 9999,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              minWidth: 160,
            }}
          >
            {readChapters.has(ctxMenu.chapter.id) ? (
              <button
                onClick={() => handleMarkUnread(ctxMenu.chapter)}
                style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Circle style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                Mark as unread
              </button>
            ) : (
              <button
                onClick={() => handleMarkRead(ctxMenu.chapter)}
                style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <CheckCircle style={{ width: 14, height: 14, color: 'var(--muted3)' }} />
                Mark as read
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

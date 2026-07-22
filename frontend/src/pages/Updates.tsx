import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useMangaUpdates } from '../lib/queries'
import { motion } from 'framer-motion'
import { Bell, Play, Download, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'
import { buildSmartReadUrl } from '../lib/smartUrl'

interface UpdateEntry {
  manga_title: string
  manga_id: string
  provider: string
  cover_url: string | null
  chapter_id: string
  chapter_title: string
  chapter_number: number
  published_at: string | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export default function UpdatesPage() {
  const navigate = useNavigate()
  const { data: rawUpdates = [], isLoading: loading, isFetching: refreshing, refetch } = useMangaUpdates()
  const updates = rawUpdates as UpdateEntry[]
  const [downloading, setDownloading] = useState<Set<string>>(new Set())

  const handleDownload = async (entry: UpdateEntry) => {
    const key = `${entry.provider}-${entry.chapter_id}`
    if (downloading.has(key)) return
    setDownloading(prev => new Set(prev).add(key))
    try {
      await api.post('/downloads/queue', {
        provider_id: entry.provider,
        manga_id: entry.manga_id,
        chapter_id: entry.chapter_id,
      })
    } catch { /* non-fatal */ }
    setTimeout(() => setDownloading(prev => {
      const next = new Set(prev); next.delete(key); return next
    }), 2000)
  }

  const handleReadOnline = (entry: UpdateEntry) => {
    const targetUrl = buildSmartReadUrl(entry.provider, entry.manga_id, entry.chapter_id, entry.manga_title, entry.chapter_title)
    navigate(targetUrl)
  }

  // Group by manga title
  const grouped = updates.reduce<Record<string, UpdateEntry[]>>((acc, u) => {
    if (!acc[u.manga_title]) acc[u.manga_title] = []
    acc[u.manga_title].push(u)
    return acc
  }, {})

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Updates</h1>
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>
            {updates.length > 0 ? `${updates.length} new chapters` : 'Latest from your library'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={refreshing}
          className="icon-btn"
          title="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : updates.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>No updates yet</p>
            <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Subscribe to manga to see new chapters here</p>
            <button onClick={() => navigate('/search')} className="btn-primary" style={{ marginTop: 8 }}>Find Manga</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {Object.entries(grouped).map(([title, chapters], gi) => (
              <motion.section
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.04 }}
              >
                <button
                  onClick={() => { const ch = chapters[0]; navigate(`/manga/${ch.provider}/${ch.manga_id}`) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}
                >
                  {chapters[0].cover_url ? (
                    <img
                      src={`${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(chapters[0].cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`}
                      alt={title}
                      style={{ width: 44, height: 62, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 62, borderRadius: 8, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)' }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 2 }}>{chapters.length} chapter{chapters.length !== 1 ? 's' : ''}</div>
                  </div>
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chapters.map((ch) => {
                    const key = `${ch.provider}-${ch.chapter_id}`
                    return (
                      <div
                        key={ch.chapter_id}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.chapter_title}</div>
                          {ch.published_at && (
                            <div style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 2 }}>{timeAgo(ch.published_at)}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => handleReadOnline(ch)} title="Read online" className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10, color: 'var(--accent)' }}>
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownload(ch)}
                            title="Download"
                            className="icon-btn"
                            style={downloading.has(key) ? { width: 34, height: 34, borderRadius: 10, color: 'rgb(74,222,128)', borderColor: 'rgba(74,222,128,0.3)' } : { width: 34, height: 34, borderRadius: 10 }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

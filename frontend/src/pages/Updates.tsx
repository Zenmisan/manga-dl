import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useMangaUpdates } from '../lib/queries'
import { Bell, Download, RefreshCw } from 'lucide-react'
import { ThemedSpinner } from '../components/common/ThemedLoader'
import { motion } from 'framer-motion'
import { buildSmartReadUrl, buildSmartMangaUrl } from '../lib/smartUrl'

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

function dateBucket(iso: string | null): string {
  if (!iso) return 'Earlier'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Earlier'
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
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

const BUCKET_ORDER_FN = (a: string, b: string) => {
  const order = ['Today', 'Yesterday']
  const ai = order.indexOf(a)
  const bi = order.indexOf(b)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.localeCompare(b)
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

  // Group by date bucket instead of manga title
  const grouped: Record<string, UpdateEntry[]> = {}
  for (const u of updates) {
    const bucket = dateBucket(u.published_at)
    if (!grouped[bucket]) grouped[bucket] = []
    grouped[bucket].push(u)
  }
  const buckets = Object.keys(grouped).sort(BUCKET_ORDER_FN)

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
          {refreshing ? <ThemedSpinner size="xs" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1" style={{ maxWidth: 720 }}>
        {loading ? (
          <div className="flex justify-center py-20">
            <ThemedSpinner size="lg" />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {buckets.map((bucket, bi) => (
              <motion.div
                key={bucket}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: bi * 0.04 }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>
                  {bucket}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {grouped[bucket].map((ch) => {
                    const key = `${ch.provider}-${ch.chapter_id}`
                    const isDone = downloading.has(key)
                    return (
                      <div
                        key={`${ch.provider}-${ch.chapter_id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}
                      >
                        {ch.cover_url ? (
                          <img
                            src={`${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(ch.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`}
                            alt={ch.manga_title}
                            style={{ width: 48, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border)' }}
                          />
                        ) : (
                          <div style={{ width: 48, height: 64, borderRadius: 8, flexShrink: 0, background: 'var(--surface-hover)', border: '1px solid var(--border)' }} />
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <button
                            onClick={() => navigate(buildSmartMangaUrl(ch.provider, ch.manga_id, ch.manga_title))}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          >
                            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.manga_title}</div>
                          </button>
                          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.chapter_title}</div>
                          {ch.published_at && (
                            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }}>{timeAgo(ch.published_at)}</div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => handleReadOnline(ch)}
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10, height: 34 }}
                          >
                            Read
                          </button>
                          <button
                            onClick={() => handleDownload(ch)}
                            title="Download"
                            className="icon-btn"
                            style={isDone
                              ? { width: 34, height: 34, borderRadius: 10, color: 'rgb(74,222,128)', borderColor: 'rgba(74,222,128,0.3)' }
                              : { width: 34, height: 34, borderRadius: 10 }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

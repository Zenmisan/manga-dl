import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { useHistory, QK } from '../lib/queries'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Play, Trash2, Loader2, EyeOff } from 'lucide-react'
import { useAppStore } from '../lib/store'
import { cn } from '../lib/utils'
import { buildSmartReadUrl } from '../lib/smartUrl'

interface HistoryEntry {
  provider: string
  manga_id: string
  chapter_id: string
  manga_title: string
  chapter_title: string
  last_page: number
  updated_at: string
}

type DateFilter = 'all' | 'today' | 'week' | 'month'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function startOf(filter: DateFilter): number {
  const now = new Date()
  if (filter === 'today') { now.setHours(0, 0, 0, 0); return now.getTime() }
  if (filter === 'week') return Date.now() - 7 * 86_400_000
  if (filter === 'month') return Date.now() - 30 * 86_400_000
  return 0
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { incognitoMode } = useAppStore()
  const [authed, setAuthed] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearingMangaId, setClearingMangaId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
    })
  }, [])

  const { data: rawHistory = [], isLoading: loading } = useHistory(authed)
  const history = rawHistory as HistoryEntry[]

  const filtered = useMemo(() => {
    const cutoff = startOf(dateFilter)
    return history.filter(e => {
      const ts = e.updated_at ? new Date(e.updated_at).getTime() : 0
      if (ts < cutoff) return false
      if (search && !e.manga_title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [history, dateFilter, search])

  const handleClearAll = async () => {
    if (!confirm('Clear all reading history?')) return
    setClearing(true)
    try {
      await api.delete('/users/history')
      queryClient.setQueryData(QK.history, [])
    } catch { /* non-fatal */ }
    setClearing(false)
  }

  const handleClearManga = async (provider: string, mangaId: string) => {
    setClearingMangaId(mangaId)
    try {
      await api.delete(`/users/history/${encodeURIComponent(provider)}/${encodeURIComponent(mangaId)}`)
      queryClient.setQueryData(QK.history, (prev: HistoryEntry[]) =>
        (prev ?? []).filter(e => !(e.provider === provider && e.manga_id === mangaId))
      )
    } catch { /* non-fatal */ }
    setClearingMangaId(null)
  }

  const resumeChapter = (entry: HistoryEntry) => {
    const targetUrl = buildSmartReadUrl(entry.provider, entry.manga_id, entry.chapter_id, entry.manga_title, entry.chapter_title)
    navigate(targetUrl)
  }

  const DATE_TABS: { label: string; value: DateFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
  ]

  const COVER_GRADIENTS = [
    'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
    'linear-gradient(135deg, #3d1a1a, #8b2c2c)',
    'linear-gradient(135deg, #1a3d2b, #2d6b4a)',
    'linear-gradient(135deg, #2d1a4d, #5b3a8a)',
    'linear-gradient(135deg, #3d2e1a, #8b6b2c)',
  ]

  if (incognitoMode) {
    return (
      <div className="min-h-full flex flex-col">
        <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>History</h1>
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>Your reading activity</p>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EyeOff style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>Incognito mode is on</p>
          <p style={{ fontSize: 13, color: 'var(--muted2)' }}>History is not recorded while incognito.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>History</h1>
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>Your reading activity</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', fontSize: 12, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}
          >
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear
          </button>
        )}
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1" style={{ maxWidth: 720 }}>
        {authed && history.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search history..."
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, color: 'var(--fg)', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {DATE_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setDateFilter(tab.value)}
                  className={cn('filter-pill', dateFilter === tab.value && 'active')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : !authed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>Sign in to see history</p>
            <button onClick={() => navigate('/login')} className="btn-primary" style={{ marginTop: 8 }}>Sign In</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>{history.length === 0 ? 'No reading history yet' : 'No entries match'}</p>
            <p style={{ fontSize: 13, color: 'var(--muted2)' }}>{history.length === 0 ? 'Chapters you read online will appear here' : 'Try a different date range'}</p>
          </div>
        ) : (
          <AnimatePresence>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map((entry, i) => {
                const gradIdx = Math.abs(entry.manga_title.charCodeAt(0) + entry.manga_title.charCodeAt(1 % entry.manga_title.length)) % COVER_GRADIENTS.length
                return (
                  <motion.div
                    key={`${entry.provider}-${entry.manga_id}-${entry.chapter_id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="group"
                    style={{ display: 'flex', gap: 14, padding: '12px 14px', borderRadius: 14, cursor: 'pointer' }}
                  >
                    {/* Cover placeholder */}
                    <div style={{ width: 44, height: 62, borderRadius: 8, flexShrink: 0, background: COVER_GRADIENTS[gradIdx], overflow: 'hidden' }} />

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                      <div
                        style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => navigate(`/manga/${entry.provider}/${encodeURIComponent(entry.manga_id)}`)}
                      >
                        {entry.manga_title}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.chapter_title}
                        {entry.last_page > 1 && <span style={{ color: 'var(--muted3)', marginLeft: 6 }}>· p.{entry.last_page}</span>}
                      </div>
                      {entry.last_page > 1 && (
                        <div style={{ width: '100%', maxWidth: 160, height: 4, borderRadius: 4, background: 'var(--surface-hover)', marginTop: 4 }}>
                          <div style={{ height: '100%', borderRadius: 4, background: '#dc2626', width: `${Math.min(100, (entry.last_page / 20) * 100)}%` }} />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0, gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted3)' }}>{entry.updated_at ? timeAgo(entry.updated_at) : ''}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => resumeChapter(entry)} title="Resume" className="icon-btn" style={{ width: 30, height: 30, borderRadius: 8, color: 'var(--accent)' }}>
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleClearManga(entry.provider, entry.manga_id)}
                          title="Remove"
                          disabled={clearingMangaId === entry.manga_id}
                          className="icon-btn"
                          style={{ width: 30, height: 30, borderRadius: 8 }}
                        >
                          {clearingMangaId === entry.manga_id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

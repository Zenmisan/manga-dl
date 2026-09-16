import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { ExtensionManager } from '../lib/extensions'
import { buildSmartMangaUrl } from '../lib/smartUrl'
import { usePageTitle } from '../lib/usePageTitle'

interface MangaResult {
  id: string
  title: string
  cover_url: string | null
  provider: string
  url: string
  status: string | null
}

type DiscoveryResponse = Record<string, { popular: MangaResult[]; latest: MangaResult[] }>

function BrowseCard({ r, idx, navigate }: { r: MangaResult; idx: number; navigate: ReturnType<typeof useNavigate> }) {
  const [coverError, setCoverError] = useState(false)
  const apiBase = api.defaults.baseURL || ''
  const apiKey = localStorage.getItem('manga-api-key') || ''
  const coverSrc = r.cover_url ? `${apiBase}/manga/image-proxy?url=${encodeURIComponent(r.cover_url)}&api_key=${apiKey}` : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate(buildSmartMangaUrl(r.provider, r.id, r.title))}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ height: 155, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', position: 'relative' }}>
        {coverSrc && !coverError ? (
          <img
            src={coverSrc}
            alt={r.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setCoverError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen style={{ width: 24, height: 24, color: 'var(--muted3)' }} />
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
          padding: '2px 5px', borderRadius: 5,
          fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {r.provider}
        </div>
      </div>
      <div
        className="manga-card-title"
        style={{
          marginTop: 6, fontSize: 13,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          whiteSpace: 'normal',
        }}
      >
        {r.title}
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div>
      <motion.div animate={{ opacity: [0.4, 0.65, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ height: 155, borderRadius: 10, background: 'var(--surface)' }} />
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        style={{ marginTop: 6, height: 12, borderRadius: 4, background: 'var(--surface)', width: '85%' }} />
      <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        style={{ marginTop: 4, height: 10, borderRadius: 4, background: 'var(--surface)', width: '60%' }} />
    </div>
  )
}

function interleave<T>(cols: T[][]): T[] {
  const result: T[] = []
  const maxLen = Math.max(0, ...cols.map(c => c.length))
  for (let i = 0; i < maxLen; i++) {
    for (const col of cols) { if (i < col.length) result.push(col[i]) }
  }
  return result
}

// ── Aggregate browse (popular / latest) ──────────────────────────────────────

function AggregateBrowse({ isPopular }: { isPopular: boolean }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<MangaResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async (attempt = 0) => {
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()
      const providerIds = Array.from(manager.extensions.keys()).join(',')

      const data: DiscoveryResponse = await api
        .get(`/sources/discovery?providers=${providerIds}`)
        .then(r => r.data as DiscoveryResponse)
        .catch(() => ({} as DiscoveryResponse))

      const key = isPopular ? 'popular' : 'latest'
      const cols = Object.entries(data)
        .filter(([id]) => id !== 'mangadex')
        .map(([, v]) => v[key] ?? [])
      const all = interleave(cols)

      if (cancelled) return
      if (all.length === 0 && attempt < 3) {
        // Cache still warming — retry with backoff
        setTimeout(() => { if (!cancelled) fetch(attempt + 1) }, (attempt + 1) * 5000)
        return
      }
      setItems(all)
      setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [isPopular])

  const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16 } as const

  if (loading) return <div style={GRID}>{Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--muted2)', fontSize: 14 }}>
      No results yet — sources may still be warming up.
    </div>
  )
  return (
    <div style={GRID}>
      {items.map((r, i) => <BrowseCard key={`${r.provider}:${r.id}`} r={r} idx={i} navigate={navigate} />)}
    </div>
  )
}

// ── Per-source browse ─────────────────────────────────────────────────────────

function SourceBrowse({ sourceId }: { sourceId: string }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'popular' | 'latest'>('popular')
  const [popular, setPopular] = useState<MangaResult[]>([])
  const [latest, setLatest] = useState<MangaResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()

      // Try backend cache first
      const data: DiscoveryResponse = await api
        .get(`/sources/discovery?providers=${sourceId}`)
        .then(r => r.data as DiscoveryResponse)
        .catch(() => ({} as DiscoveryResponse))

      const cached = data[sourceId]
      const hasCachedPopular = (cached?.popular?.length ?? 0) > 0
      const hasCachedLatest = (cached?.latest?.length ?? 0) > 0

      if (hasCachedPopular) setPopular(cached.popular)
      if (hasCachedLatest) setLatest(cached.latest)

      // Fall back to browser-side extension for uncovered sources
      const ext = manager.extensions.get(sourceId)
      if (ext) {
        const fetches: Promise<void>[] = []
        if (!hasCachedPopular && ext.getPopular) {
          fetches.push(
            (ext.getPopular(1) as Promise<MangaResult[]>)
              .then(r => setPopular(r))
              .catch(() => {})
          )
        }
        if (!hasCachedLatest && ext.getLatest) {
          fetches.push(
            (ext.getLatest(1) as Promise<MangaResult[]>)
              .then(r => setLatest(r))
              .catch(() => {})
          )
        }
        await Promise.all(fetches)
      }

      setLoading(false)
    }
    run()
  }, [sourceId])

  const items = tab === 'popular' ? popular : latest
  const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16 } as const

  return (
    <>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['popular', 'latest'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, textTransform: 'capitalize',
              background: tab === t ? 'var(--accent)' : 'var(--surface)',
              color: tab === t ? '#fff' : 'var(--muted2)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'popular' ? 'Popular' : 'Latest'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={GRID}>{Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : items.length > 0 ? (
        <div style={GRID}>
          {items.map((r, i) => <BrowseCard key={`${r.provider}:${r.id}`} r={r} idx={i} navigate={navigate} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--muted2)', fontSize: 14 }}>
          No results — source may not support this list.
        </div>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const { category, sourceId } = useParams<{ category?: string; sourceId?: string }>()
  const navigate = useNavigate()

  const isSourceMode = !!sourceId
  const isPopular = !isSourceMode && category !== 'latest'
  const pageTitle = isSourceMode
    ? sourceId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : isPopular ? 'Popular Now' : 'Latest Updates'

  usePageTitle(pageTitle)

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-6 pt-5 pb-28 flex-1">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--muted2)', display: 'flex', borderRadius: 10 }}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--fg)', lineHeight: 1.1, margin: 0 }}>{pageTitle}</h1>
        </div>

        {isSourceMode
          ? <SourceBrowse sourceId={sourceId} />
          : <AggregateBrowse isPopular={isPopular} />
        }
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search as SearchIcon, X } from 'lucide-react'
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
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0, transition: 'opacity 0.25s ease' }}
            onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }}
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
      await manager.init()
      const providerIds = Array.from(manager.extensions.keys()).join(',')

      const data: DiscoveryResponse = await api
        .get(`/sources/discovery?providers=${providerIds}`)
        .then(r => r.data as DiscoveryResponse)
        .catch(() => ({} as DiscoveryResponse))

      const key = isPopular ? 'popular' : 'latest'
      const cols = Object.entries(data)
        .map(([, v]) => v[key] ?? [])
      const all = interleave(cols)

      if (cancelled) return
      if (all.length === 0 && attempt < 2) {
        // Cache warming — brief backoff retry
        setTimeout(() => { if (!cancelled) fetch(attempt + 1) }, 2500)
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

// ── Per-source browse (Tachiyomi-style) ──────────────────────────────────────

type BrowseMode = 'popular' | 'latest' | 'search'

function SourceBrowse({ sourceId, onNameResolved }: { sourceId: string; onNameResolved: (name: string) => void }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialMode = (searchParams.get('listing') as BrowseMode | null) ?? 'popular'
  const [mode, setMode] = useState<BrowseMode>(initialMode)
  const [searchInput, setSearchInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [items, setItems] = useState<MangaResult[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Refs so callbacks read current values without stale closure issues
  const modeRef = useRef<BrowseMode>(mode)
  const queryRef = useRef(activeQuery)
  const fetchCountRef = useRef(0) // cancels stale fetches on mode/query change
  const sentinelRef = useRef<HTMLDivElement>(null)
  const extRef = useRef<ReturnType<typeof ExtensionManager.prototype.extensions.get>>(undefined)

  const fetchPage = useCallback(async (targetPage: number, isReset: boolean) => {
    const fetchId = ++fetchCountRef.current
    const currentMode = modeRef.current
    const currentQuery = queryRef.current

    if (isReset) { setLoading(true); setItems([]); setFetchError(null) }
    else setLoadingMore(true)

    try {
      const manager = ExtensionManager.getInstance()
      const ext = await manager.getExtension(sourceId)
      if (fetchCountRef.current !== fetchId) return

      if (!ext) {
        setFetchError(`Source "${sourceId}" is not available or could not be loaded.`)
        return
      }

      extRef.current = ext
      onNameResolved(ext.name)

      let results: MangaResult[]
      if (currentMode === 'search') {
        results = (await (ext.search(currentQuery, targetPage) as Promise<MangaResult[]>))
      } else if (currentMode === 'latest') {
        results = ext.getLatest
          ? (await (ext.getLatest(targetPage) as Promise<MangaResult[]>))
          : []
      } else {
        results = ext.getPopular
          ? (await (ext.getPopular(targetPage) as Promise<MangaResult[]>))
          : []
      }

      if (fetchCountRef.current !== fetchId) return

      setHasMore(results.length > 0)
      setPage(targetPage)
      setItems(prev => isReset ? results : [...prev, ...results])
    } catch (err) {
      console.error('[Browse] fetch failed:', err)
      if (fetchCountRef.current === fetchId && isReset) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load listings from this source.')
      }
    } finally {
      if (fetchCountRef.current === fetchId) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [sourceId, onNameResolved])

  // Refetch when mode / activeQuery changes or on mount
  useEffect(() => {
    modeRef.current = mode
    queryRef.current = activeQuery
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMore(true)
    fetchPage(1, true)
  }, [mode, activeQuery, fetchPage])

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          fetchPage(page + 1, false)
        }
      },
      { rootMargin: '300px' }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loading, loadingMore, page, fetchPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchInput.trim()
    if (!q) return
    setActiveQuery(q)
    setMode('search')
  }

  const switchMode = (next: 'popular' | 'latest') => {
    setSearchInput('')
    setActiveQuery('')
    setMode(next)
    setSearchParams(next === 'latest' ? { listing: 'latest' } : {}, { replace: true })
  }

  const clearSearch = () => {
    setSearchInput('')
    setActiveQuery('')
    setMode('popular')
    setSearchParams({}, { replace: true })
  }

  const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16 } as const

  return (
    <>
      {/* Inline search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <SearchIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted3)', pointerEvents: 'none' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search this source…"
            style={{
              width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted3)', padding: 2, display: 'flex' }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
        <button type="submit"
          style={{ padding: '9px 16px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
          Search
        </button>
      </form>

      {/* Mode chips — Popular / Latest (hidden while in search) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
        {mode === 'search' ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Results for <strong style={{ color: 'var(--fg)' }}>"{activeQuery}"</strong></span>
            <button onClick={clearSearch}
              style={{ marginLeft: 6, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted2)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Clear
            </button>
          </>
        ) : (
          (['popular', 'latest'] as const).map(t => (
            <button key={t} onClick={() => switchMode(t)}
              style={{
                padding: '5px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 800, textTransform: 'capitalize',
                background: mode === t ? 'var(--accent)' : 'var(--surface)',
                color: mode === t ? '#fff' : 'var(--muted2)',
                transition: 'background 0.15s, color 0.15s',
              }}>
              {t === 'popular' ? 'Popular' : 'Latest'}
            </button>
          ))
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={GRID}>{Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', fontSize: 14 }}>
          {fetchError ? (
            <>
              <p style={{ color: 'var(--muted2)', marginBottom: 6 }}>Failed to load from this source.</p>
              <p style={{ color: 'var(--muted3)', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 400, margin: '0 auto' }}>{fetchError}</p>
            </>
          ) : mode === 'search' ? (
            <span style={{ color: 'var(--muted2)' }}>No results for &ldquo;{activeQuery}&rdquo;</span>
          ) : (
            <span style={{ color: 'var(--muted2)' }}>No results — source may not support this listing.</span>
          )}
        </div>
      ) : (
        <>
          <div style={GRID}>
            {items.map((r, i) => (
              <BrowseCard key={`${r.provider}:${r.id}:${i}`} r={r} idx={i % 20} navigate={navigate} />
            ))}
          </div>
          {loadingMore && (
            <div style={{ ...GRID, marginTop: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} style={{ height: 1, marginTop: 8 }} />
          {!hasMore && items.length > 0 && (
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted3)', marginTop: 24, paddingBottom: 8 }}>
              End of catalogue
            </p>
          )}
        </>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const { category, sourceId } = useParams<{ category?: string; sourceId?: string }>()
  const navigate = useNavigate()
  const [resolvedSourceName, setResolvedSourceName] = useState<string | null>(null)

  const isSourceMode = !!sourceId
  const isPopular = !isSourceMode && category !== 'latest'

  // For source mode: show resolved name; fall back to prettified slug while loading
  const slugTitle = sourceId
    ? sourceId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null
  const pageTitle = isSourceMode
    ? (resolvedSourceName ?? slugTitle ?? sourceId!)
    : isPopular ? 'Popular Now' : 'Latest Updates'

  usePageTitle(pageTitle)

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-6 pt-5 pb-28 flex-1">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
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
          ? <SourceBrowse key={sourceId} sourceId={sourceId!} onNameResolved={setResolvedSourceName} />
          : <AggregateBrowse key={category || (isPopular ? 'popular' : 'latest')} isPopular={isPopular} />
        }
      </div>
    </div>
  )
}

/* Hallmark · component: search-discovery · genre: atmospheric · theme: modern-dark-cinema
 * pre-emit critique: P4 H4 E4 S4 R5 V4 — all axes ≥ 3
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/common/Toast'
import api from '../lib/api'
import { ExtensionManager } from '../lib/extensions'
import { Search as SearchIcon, Globe, BookOpen, BookMarked, Check, SlidersHorizontal, X, LayoutGrid, LayoutList, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAppStore } from '../lib/store'
import { buildSmartMangaUrl } from '../lib/smartUrl'
import { ThemedSpinner, ThemedSkeletonGrid } from '../components/common/ThemedLoader'
import { SourceSwimlane } from '../components/search/SourceSwimlane'
import { SourceToggleModal } from '../components/search/SourceToggleModal'
import { getEnabledSources } from '../lib/sourceManager'
import { sortResultsByRelevance } from '../lib/relevanceScorer'

// Module-level discovery cache — survives navigation, cleared only on page refresh
const _discoveryCache: { popular: MangaResult[]; latest: MangaResult[]; fetched: boolean } = {
  popular: [], latest: [], fetched: false,
}

interface MangaResult {
  id: string
  title: string
  cover_url: string | null
  provider: string
  url: string
  status: string | null
  anilist_score?: number
  anilist_url?: string
}

const FALLBACK_PROVIDERS = [
  { id: 'mangadex', name: 'MangaDex' },
  { id: 'asurascans', name: 'Asura Scans' },
  { id: 'mangakatana', name: 'MangaKatana' },
  { id: 'omegascans', name: 'Omega Scans' },
]

// ── Discovery Card ─────────────────────────────────────────────────────────

function DiscoveryCard({ r, idx, navigate }: { r: MangaResult; idx: number; navigate: ReturnType<typeof useNavigate> }) {
  const [coverError, setCoverError] = useState(false)
  const apiBase = api.defaults.baseURL || ''
  const apiKey = localStorage.getItem('manga-api-key') || ''
  const coverSrc = r.cover_url ? `${apiBase}/manga/image-proxy?url=${encodeURIComponent(r.cover_url)}&api_key=${apiKey}` : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.055, 0.44), ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate(buildSmartMangaUrl(r.provider, r.id, r.title))}
      style={{ width: 110, flexShrink: 0, cursor: 'pointer' }}
    >
      <div style={{ width: 110, height: 155, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', position: 'relative' }}>
        {coverSrc && !coverError ? (
          <img
            src={coverSrc}
            alt={r.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }}
            onError={() => setCoverError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen style={{ width: 24, height: 24, color: 'var(--muted3)' }} />
          </div>
        )}
        {/* Active press effect via CSS */}
        <style>{`.disc-card-${idx % 20}:active { transform: scale(0.97); }`}</style>
      </div>
      <div style={{ marginTop: 6 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          textWrap: 'balance',
        }}>{r.title}</div>
        <div style={{ fontSize: 10, color: 'var(--muted3)', marginTop: 2, textTransform: 'capitalize', fontWeight: 500 }}>{r.provider}</div>
      </div>
    </motion.div>
  )
}

function DiscoveryCardSkeleton() {
  return (
    <div style={{ width: 110, flexShrink: 0 }}>
      <motion.div animate={{ opacity: [0.4, 0.65, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 110, height: 155, borderRadius: 10, background: 'var(--surface)' }} />
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        style={{ marginTop: 6, height: 12, borderRadius: 4, background: 'var(--surface)', width: '80%' }} />
      <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        style={{ marginTop: 4, height: 10, borderRadius: 4, background: 'var(--surface)', width: '55%' }} />
    </div>
  )
}

// ── SwimLane ───────────────────────────────────────────────────────────────

function SwimLane({ title, items, loading, navigate }: {
  title: string
  items: MangaResult[]
  loading?: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg)', marginBottom: 12, lineHeight: 1.2, textWrap: 'balance', fontStyle: 'normal' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 8, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <DiscoveryCardSkeleton key={i} />)
          : items.map((r, i) => <DiscoveryCard key={`${r.provider}:${r.id}`} r={r} idx={i} navigate={navigate} />)
        }
      </div>
    </div>
  )
}

// ── MangaCard (search results) ─────────────────────────────────────────────

function MangaCard({ r, idx, onSubscribe, subscribed, subscribing, navigate }: {
  r: MangaResult
  idx: number
  onSubscribe: (e: React.MouseEvent, result: MangaResult) => void
  subscribed: string[]
  subscribing: string[]
  navigate: ReturnType<typeof useNavigate>
}) {
  const [coverError, setCoverError] = useState(false)
  const key = `${r.provider}:${r.id}`
  const isSubscribed = subscribed.includes(key)
  const isSubscribing = subscribing.includes(key)
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.3) }}
      onClick={() => navigate(buildSmartMangaUrl(r.provider, r.id, r.title))}
      className="group cursor-pointer"
    >
      <div className="manga-cover" style={{ position: 'relative' }}>
        {r.cover_url && !coverError ? (
          <img
            src={`${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(r.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`}
            alt={r.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            className="group-hover:scale-105 transition-transform duration-400"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
            <BookOpen style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {r.provider}
        </div>
      </div>

      <div style={{ marginTop: 8, paddingLeft: 2 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{r.title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 2, fontWeight: 500 }}>{r.status || 'unknown'}</div>

        <button
          onClick={(e) => onSubscribe(e, r)}
          disabled={isSubscribing}
          className={cn(
            "w-full mt-2 py-1.5 px-3 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-sm",
            isSubscribed
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
              : "bg-white/10 border-white/15 hover:bg-white/20 text-white"
          )}
          aria-label={isSubscribed ? `Remove ${r.title} from library` : `Add ${r.title} to library`}
        >
          {isSubscribing ? (
            <ThemedSpinner size="xs" />
          ) : isSubscribed ? (
            <><Check className="w-3.5 h-3.5 text-emerald-400" /><span>In Library</span></>
          ) : (
            <><BookMarked className="w-3.5 h-3.5 text-white" /><span>Add to Library</span></>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SearchPage() {
  const navigate = useNavigate()
  const { show: toast } = useToast()
  const {
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    selectedProvider, setSelectedProvider,
    hasSearched, setHasSearched,
  } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [subscribing, setSubscribing] = useState<string[]>([])
  const [subscribed, setSubscribed] = useState<string[]>([])
  const [extCount, setExtCount] = useState(0)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [showAllSources, setShowAllSources] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchViewMode, setSearchViewMode] = useState<'lanes' | 'grid'>(() => {
    return (localStorage.getItem('manga-dl-search-view') as 'lanes' | 'grid') || 'lanes'
  })

  const [enabledSources, setEnabledSources] = useState<string[]>(() => {
    const manager = ExtensionManager.getInstance()
    const allIds = manager.extensions.size > 0
      ? Array.from(manager.extensions.keys())
      : FALLBACK_PROVIDERS.map(p => p.id)
    return getEnabledSources(allIds)
  })

  const [filterStatus, setFilterStatus] = useState<string>('any')
  const [filterRating, setFilterRating] = useState<string[]>(['safe'])
  const [filterFormat, setFilterFormat] = useState<string[]>([])

  interface FilterDef { id: string; label: string; type: string; options: { value: string; label: string }[]; default: string }
  const [sourceFilters] = useState<FilterDef[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  // Discovery feed — initialise from cache if available (instant on back-nav)
  const [discoveryPopular, setDiscoveryPopular] = useState<MangaResult[]>(_discoveryCache.popular)
  const [discoveryLatest, setDiscoveryLatest] = useState<MangaResult[]>(_discoveryCache.latest)
  const [discoveryLoading, setDiscoveryLoading] = useState(!_discoveryCache.fetched)

  useEffect(() => {
    const manager = ExtensionManager.getInstance()
    if (manager.extensions.size === 0) {
      manager.init().then(() => { setExtCount(manager.extensions.size) })
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExtCount(manager.extensions.size)
    }
  }, [])

  const activeProviders = useMemo(() => {
    const manager = ExtensionManager.getInstance()
    if (manager.extensions.size === 0) return FALLBACK_PROVIDERS
    return Array.from(manager.extensions.values()).map(ext => ({ id: ext.id, name: ext.name }))
  }, [extCount])

  useEffect(() => {
    if (activeProviders.length > 0) {
      if (selectedProvider && !activeProviders.some(p => p.id === selectedProvider)) setSelectedProvider(null)
      setEnabledSources(prev => {
        const availableIds = activeProviders.map(p => p.id)
        const valid = prev.filter(id => availableIds.includes(id))
        return valid.length > 0 ? valid : getEnabledSources(availableIds)
      })
    }
  }, [activeProviders, selectedProvider, setSelectedProvider])

  // Fetch discovery feed once on mount (after extensions ready)
  useEffect(() => {
    if (_discoveryCache.fetched) return  // cache hit — skip fetch entirely

    let spinnerCleared = false
    const clearSpinner = () => {
      if (!spinnerCleared) { spinnerCleared = true; setDiscoveryLoading(false) }
    }

    const mergeInto = (
      setter: React.Dispatch<React.SetStateAction<MangaResult[]>>,
      cacheKey: 'popular' | 'latest',
      incoming: MangaResult[],
    ) => {
      setter(prev => {
        const seen = new Set(prev.map(r => `${r.provider}:${r.id}`))
        const next = [...prev, ...incoming.filter(r => !seen.has(`${r.provider}:${r.id}`))]
        _discoveryCache[cacheKey] = next.slice(0, 20)
        return _discoveryCache[cacheKey]
      })
      clearSpinner()
    }

    const run = async () => {
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()
      const exts = Array.from(manager.extensions.values())
      if (exts.length === 0) { clearSpinner(); return }

      // 1. Hit backend discovery cache — instant for all built-in sources
      const providerIds = exts.map(e => e.id).join(',')
      type DiscoveryResponse = Record<string, { popular: MangaResult[]; latest: MangaResult[] }>
      const cached: DiscoveryResponse = await api.get(`/sources/discovery?providers=${providerIds}`)
        .then(r => r.data as DiscoveryResponse)
        .catch(() => ({} as DiscoveryResponse))

      const serverPopular = Object.values(cached).flatMap(c => c.popular ?? []).slice(0, 20)
      const serverLatest = Object.values(cached).flatMap(c => c.latest ?? []).slice(0, 20)
      if (serverPopular.length > 0) mergeInto(setDiscoveryPopular, 'popular', serverPopular)
      if (serverLatest.length > 0) mergeInto(setDiscoveryLatest, 'latest', serverLatest)

      // 2. Progressive browser-side fetch for community extensions not covered by backend
      const coveredIds = new Set(
        Object.entries(cached)
          .filter(([, v]) => (v.popular?.length ?? 0) > 0 || (v.latest?.length ?? 0) > 0)
          .map(([id]) => id)
      )
      const uncovered = exts.filter(e => !coveredIds.has(e.id))
      uncovered.forEach(ext => {
        if (ext.getPopular) {
          (ext.getPopular(1) as Promise<MangaResult[]>)
            .then(r => mergeInto(setDiscoveryPopular, 'popular', r))
            .catch(() => {})
        }
        if (ext.getLatest) {
          (ext.getLatest(1) as Promise<MangaResult[]>)
            .then(r => mergeInto(setDiscoveryLatest, 'latest', r))
            .catch(() => {})
        }
      })

      clearSpinner()
      _discoveryCache.fetched = true
    }

    run()
  }, [])

  const handleToggleViewMode = () => {
    const next = searchViewMode === 'lanes' ? 'grid' : 'lanes'
    setSearchViewMode(next)
    localStorage.setItem('manga-dl-search-view', next)
  }

  const handleSubscribe = async (e: React.MouseEvent, result: MangaResult) => {
    e.stopPropagation()
    const { provider, id: mangaId, title, cover_url } = result
    const key = `${provider}:${mangaId}`
    if (subscribed.includes(key) || subscribing.includes(key)) return
    setSubscribing(prev => [...prev, key])
    try {
      await api.post(`/manga/subscribe/${provider}/${encodeURIComponent(mangaId)}`, { title, cover_url })
      setSubscribed(prev => [...prev, key])
    } catch { toast('Could not add to library.', 'error') }
    finally { setSubscribing(prev => prev.filter(k => k !== key)) }
  }

  const performSearch = useCallback(async (query: string) => {
    if (!query) return
    setLoading(true)
    setHasSearched(false)
    try {
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()
      if (manager.extensions.size === 0) { toast('No sources loaded. Check your API Key in Settings.', 'warning'); setLoading(false); return }

      if (selectedProvider) {
        const ext = manager.extensions.get(selectedProvider)
        const results = ext ? await ext.search(query, 1) as MangaResult[] : []
        setSearchResults(sortResultsByRelevance(results, query))
      } else {
        const allExts = Array.from(manager.extensions.values())
        const targetExts = allExts.filter(ext => enabledSources.includes(ext.id))
        const finalExts = targetExts.length > 0 ? targetExts : allExts

        const settled = await Promise.allSettled(finalExts.map(ext => ext.search(query, 1) as Promise<MangaResult[]>))
        settled.forEach((r, i) => { if (r.status === 'rejected') console.error(`[Search] ${finalExts[i].name} failed:`, r.reason) })
        const merged = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])
        if (merged.length === 0 && settled.some(r => r.status === 'rejected')) {
          const firstError = settled.find(r => r.status === 'rejected') as PromiseRejectedResult
          if (String(firstError?.reason).includes('403')) toast('Search failed (403). Check your API Key in Settings.', 'error')
        }
        setSearchResults(sortResultsByRelevance(merged, query))
      }
      setHasSearched(true)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [selectedProvider, enabledSources, setSearchResults, setHasSearched, toast])

  const isFirstSourceMount = useRef(true)
  useEffect(() => {
    if (isFirstSourceMount.current) { isFirstSourceMount.current = false; return }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchQuery.trim()) performSearch(searchQuery.trim())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider, enabledSources])

  const resetSearchFilters = () => { setFilterStatus('any'); setFilterRating(['safe']); setFilterFormat([]) }
  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const hasSearchFilters = filterStatus !== 'any' || filterRating.length !== 1 || !filterRating.includes('safe') || filterFormat.length > 0

  const FILTER_SECTIONS = [
    { label: 'Publication Status', items: ['any', 'ongoing', 'completed', 'hiatus'], active: filterStatus, onToggle: (v: string) => setFilterStatus(v), single: true },
    { label: 'Content Rating', items: ['safe', 'suggestive', 'erotica'], active: filterRating, onToggle: (v: string) => toggleArr(filterRating, v, setFilterRating), single: false },
    { label: 'Format', items: ['manga', 'manhwa', 'manhua', 'webtoon'], active: filterFormat, onToggle: (v: string) => toggleArr(filterFormat, v, setFilterFormat), single: false },
  ]

  const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 18 } as const

  const isIdle = !hasSearched && !searchQuery.trim() && !loading

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-6 pt-5 pb-28 flex-1">

        {/* Page heading */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: 'var(--fg)', lineHeight: 1.1, marginBottom: 3, fontStyle: 'normal', textWrap: 'balance' }}>
            Discover Manga
          </h1>
          <p className="hidden md:block" style={{ fontSize: 13, color: 'var(--muted2)' }}>Search across multiple sources to find your next read.</p>
        </motion.div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: 20 }}>
          <form onSubmit={(e) => { e.preventDefault(); performSearch(searchQuery.trim()) }}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            {/* Input container — cinema dark with blur + focus glow */}
            <div
              style={{
                position: 'relative', flex: 1, minWidth: 0,
                borderRadius: 18,
                border: `1.5px solid ${searchFocused ? 'var(--accent)' : 'var(--border)'}`,
                background: 'var(--surface)',
                backdropFilter: 'blur(8px)',
                boxShadow: searchFocused ? '0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <SearchIcon style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, color: searchFocused ? 'var(--accent)' : 'var(--muted3)', pointerEvents: 'none', transition: 'color 0.2s' }} />
              <input
                type="search"
                inputMode="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search your titles"
                style={{ width: '100%', padding: '14px 48px 14px 42px', borderRadius: 18, border: 'none', background: 'transparent', fontSize: 15, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box', fontWeight: 500 }}
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="Search"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: 12, border: 'none', background: searchQuery.trim() ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: searchQuery.trim() ? '#fff' : 'var(--muted3)', transition: 'background 0.15s, color 0.15s' }}
              >
                {loading ? <ThemedSpinner size="xs" /> : <SearchIcon style={{ width: 14, height: 14 }} />}
              </button>
            </div>

            {/* Sources modal button */}
            <button
              type="button"
              onClick={() => setShowSourceModal(true)}
              aria-label="Manage Search Sources"
              style={{ flexShrink: 0, position: 'relative', width: 48, height: 48, borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--surface)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)' }}
            >
              <Layers style={{ width: 17, height: 17, color: 'var(--accent)' }} />
              <span style={{ position: 'absolute', top: 5, right: 5, minWidth: 14, height: 14, borderRadius: 7, background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                {enabledSources.length}
              </span>
            </button>

            {/* View switcher */}
            <button
              type="button"
              onClick={handleToggleViewMode}
              aria-label={searchViewMode === 'lanes' ? 'Switch to Grid View' : 'Switch to Swimlane View'}
              style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--surface)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)' }}
            >
              {searchViewMode === 'lanes' ? <LayoutGrid style={{ width: 17, height: 17 }} /> : <LayoutList style={{ width: 17, height: 17 }} />}
            </button>

            {/* Filter panel */}
            <button type="button" onClick={() => setShowFilterPanel(true)} aria-label="Search filters" aria-expanded={showFilterPanel} aria-haspopup="dialog"
              style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 16, border: `1.5px solid ${hasSearchFilters ? 'var(--accent)' : 'var(--border)'}`, background: hasSearchFilters ? 'rgba(220,38,38,0.08)' : 'var(--surface)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasSearchFilters ? 'var(--accent)' : 'var(--muted2)' }}
            >
              <SlidersHorizontal style={{ width: 17, height: 17 }} />
            </button>
          </form>

          {/* Source filter pills — only visible when results are showing */}
          {(hasSearched || searchQuery.trim()) && activeProviders.length > 0 && (() => {
            const visibleProviders = activeProviders.filter(p => enabledSources.includes(p.id))
            const DEFAULT_VISIBLE = 4
            const shown = visibleProviders.slice(0, DEFAULT_VISIBLE)
            const hidden = visibleProviders.slice(DEFAULT_VISIBLE)
            return (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap', marginTop: 12, paddingBottom: 4, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                <button onClick={() => setSelectedProvider(null)} aria-pressed={!selectedProvider} className={cn('filter-pill', !selectedProvider && 'active')} style={{ flexShrink: 0 }}>All</button>
                {shown.map(p => (
                  <button key={p.id} onClick={() => setSelectedProvider(p.id)} aria-pressed={selectedProvider === p.id} className={cn('filter-pill', selectedProvider === p.id && 'active')} style={{ textTransform: 'uppercase', fontSize: 11, flexShrink: 0 }}>
                    {p.name}
                  </button>
                ))}
                {showAllSources && hidden.map(p => (
                  <button key={p.id} onClick={() => setSelectedProvider(p.id)} aria-pressed={selectedProvider === p.id} className={cn('filter-pill', selectedProvider === p.id && 'active')} style={{ textTransform: 'uppercase', fontSize: 11, flexShrink: 0 }}>
                    {p.name}
                  </button>
                ))}
                {hidden.length > 0 && (
                  <button onClick={() => setShowAllSources(v => !v)} className="filter-pill" style={{ fontSize: 11, fontWeight: 800, flexShrink: 0 }}
                    aria-label={showAllSources ? 'Show fewer sources' : `Show ${hidden.length} more sources`}>
                    {showAllSources ? '−' : `+${hidden.length}`}
                  </button>
                )}
              </div>
            )
          })()}
        </motion.div>

        {/* ── Discovery Feed (idle state) ─────────────────────────────── */}
        {isIdle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <SwimLane title="Popular Now" items={discoveryPopular} loading={discoveryLoading} navigate={navigate} />
            <SwimLane title="Latest Updates" items={discoveryLatest} loading={discoveryLoading} navigate={navigate} />
          </motion.div>
        )}

        {/* ── Search results ──────────────────────────────────────────── */}
        {!isIdle && (
          <>
            {hasSearched && !loading && searchResults.length > 0 && (
              <p aria-live="polite" aria-atomic="true" style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', marginBottom: 12, letterSpacing: '0.04em' }}>
                {searchResults.length} results
              </p>
            )}
            {loading ? (
              <ThemedSkeletonGrid count={12} />
            ) : searchResults.length > 0 ? (
              selectedProvider || searchViewMode === 'grid' ? (
                <div style={GRID_STYLE}>
                  <AnimatePresence mode="popLayout">
                    {searchResults.map((r, idx) => (
                      <MangaCard key={r.id + r.provider} r={r} idx={idx} onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col">
                  {Object.keys(searchResults.reduce<Record<string, MangaResult[]>>((acc, r) => { ;(acc[r.provider] ??= []).push(r); return acc }, {})).length > 1 && (
                    <SourceSwimlane title="Top Matches" isTopMatches count={Math.min(searchResults.length, 10)}>
                      {searchResults.slice(0, 10).map((r, idx) => (
                        <div key={'top-' + r.id + r.provider} className="w-[140px] sm:w-[155px] min-w-[140px] sm:min-w-[155px] shrink-0 snap-start">
                          <MangaCard r={r} idx={idx} onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate} />
                        </div>
                      ))}
                    </SourceSwimlane>
                  )}
                  {Object.entries(searchResults.reduce<Record<string, MangaResult[]>>((acc, r) => { ;(acc[r.provider] ??= []).push(r); return acc }, {}))
                    .filter(([, results]) => results.length > 0)
                    .map(([provider, results]) => (
                      <SourceSwimlane
                        key={provider}
                        title={activeProviders.find((p: { id: string; name: string }) => p.id === provider)?.name || provider}
                        providerId={provider}
                        count={results.length}
                        onViewAll={() => setSelectedProvider(provider)}
                      >
                        {results.map((r, idx) => (
                          <div key={r.id + r.provider} className="w-[140px] sm:w-[155px] min-w-[140px] sm:min-w-[155px] shrink-0 snap-start">
                            <MangaCard r={r} idx={idx} onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate} />
                          </div>
                        ))}
                      </SourceSwimlane>
                    ))}
                </div>
              )
            ) : hasSearched ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 24px', gap: 12 }}>
                <Globe style={{ width: 52, height: 52, color: 'var(--muted3)', opacity: 0.35 }} />
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>No results found</p>
                <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Couldn't find "{searchQuery}". Try another spelling.</p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Filter bottom sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilterPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilterPanel(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', bottom: 76, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--border)', borderRadius: '20px 20px 0 0', zIndex: 50, maxHeight: 'calc(85vh - 76px)', display: 'flex', flexDirection: 'column' }}
              className="md:!bottom-0 md:!max-h-[85vh]"
            >
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
                  <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg)' }}>Search Filters</span>
                  <button onClick={() => setShowFilterPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <X style={{ width: 20, height: 20, color: 'var(--muted2)' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 16 }}>
                  {FILTER_SECTIONS.map(sec => (
                    <div key={sec.label}>
                      <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 12 }}>{sec.label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {sec.items.map(item => {
                          const isOn = sec.single ? sec.active === item : (sec.active as string[]).includes(item)
                          return (
                            <button key={item} onClick={() => sec.onToggle(item)} className={cn('filter-pill', isOn && 'active')} style={{ textTransform: 'capitalize', padding: '8px 16px' }}>
                              {item}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {sourceFilters.map(f => (
                    <div key={f.id}>
                      <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 12 }}>{f.label}</div>
                      {f.type === 'multiselect' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {f.options.map(o => {
                            const current = (activeFilters[f.id] ?? f.default).split(',').filter(Boolean)
                            const isActive = current.includes(o.value)
                            return (
                              <button key={o.value} onClick={() => { const next = isActive ? current.filter(v => v !== o.value) : [...current, o.value]; setActiveFilters(prev => ({ ...prev, [f.id]: next.join(',') })) }} className={cn('filter-pill', isActive && 'active')} style={{ padding: '8px 16px' }}>
                                {o.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--bg)', flexShrink: 0 }}>
                <button onClick={resetSearchFilters} className="btn-secondary" style={{ flex: 1, padding: '13px 0', fontSize: 14, fontWeight: 700 }}>Reset</button>
                <button onClick={() => setShowFilterPanel(false)} className="btn-primary" style={{ flex: 2, padding: '13px 0', fontSize: 14, fontWeight: 700 }}>Apply</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Source Toggle Modal ─────────────────────────────────────────── */}
      <SourceToggleModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        availableSources={activeProviders}
        enabledSources={enabledSources}
        onSourcesChange={(updated) => setEnabledSources(updated)}
      />
    </div>
  )
}

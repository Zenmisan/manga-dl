/* Hallmark · component: search-discovery · genre: atmospheric · theme: modern-dark-cinema
 * pre-emit critique: P4 H4 E4 S4 R5 V4 — all axes ≥ 3
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../components/common/Toast'
import api from '../lib/api'
import { ExtensionManager } from '../lib/extensions'
import { Search as SearchIcon, Globe, BookOpen, BookMarked, Check, SlidersHorizontal, X, LayoutGrid, LayoutList, Layers, Users, Flame, Trophy, Crown, Medal, Award, Zap, Shield, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MILESTONES } from '../lib/milestones'
import { cn } from '../lib/utils'
import { useAppStore } from '../lib/store'
import { buildSmartMangaUrl } from '../lib/smartUrl'
import { ThemedSpinner, ThemedSkeletonGrid } from '../components/common/ThemedLoader'
import { SourceSwimlane } from '../components/search/SourceSwimlane'
import { DiscoverySwimlane } from '../components/search/DiscoverySwimlane'
import { SourceToggleModal } from '../components/search/SourceToggleModal'
import { getEnabledSources } from '../lib/sourceManager'
import { sortResultsByRelevance } from '../lib/relevanceScorer'
import { usePageTitle } from '../lib/usePageTitle'

// Module-level discovery cache — survives navigation, cleared only on page refresh
const _discoveryBySource: Record<string, { popular: MangaResult[]; latest: MangaResult[] }> = {}
let _discoveryFetched = false

// Round-robin zip: [A1,A2,A3],[B1,B2] → [A1,B1,A2,B2,A3]
function _interleave<T>(cols: T[][]): T[] {
  const result: T[] = []
  const maxLen = Math.max(0, ...cols.map(c => c.length))
  for (let i = 0; i < maxLen; i++) {
    for (const col of cols) { if (i < col.length) result.push(col[i]) }
  }
  return result
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
  type?: 'manga' | 'novel'
}

const FALLBACK_PROVIDERS = [
  { id: 'mangadex', name: 'MangaDex' },
  { id: 'asurascans', name: 'Asura Scans' },
  { id: 'mangakatana', name: 'MangaKatana' },
  { id: 'omegascans', name: 'Omega Scans' },
]

const NOVEL_PROVIDERS = [
  { id: 'royalroad', name: 'Royal Road' },
  { id: 'novelbin', name: 'NovelBin' },
  { id: 'novelfull', name: 'NovelFull' },
  { id: 'freewebnovel', name: 'FreeWebNovel' },
  { id: 'novelfire', name: 'NovelFire' },
  { id: 'allnovel', name: 'AllNovel' },
  { id: 'novelphoenix', name: 'Novel Phoenix' },
  { id: 'readnovelfull', name: 'ReadNovelFull' },
  { id: 'libread', name: 'LibRead' },
  { id: 'brightnovel', name: 'Bright Novel' },
  { id: 'chrysanthemumgarden', name: 'Chrysanthemum Garden' },
  { id: 'comrademao', name: 'Comrademao' },
  { id: 'lightnoveltranslations', name: 'Light Novel Translations' },
  { id: 'bestlightnovel', name: 'BestLightNovel' },
  { id: 'asianovel', name: 'Asian Novel' },
  { id: 'novelbuddy', name: 'NovelBuddy' },
  { id: 'readlightnovel', name: 'ReadLightNovel' },
  { id: 'scribblehub', name: 'Scribble Hub' },
  { id: 'lightnovelworld', name: 'Light Novel World' },
  { id: 'wuxiaworld', name: 'WuxiaWorld' },
]
const NOVEL_PROVIDER_IDS = NOVEL_PROVIDERS.map(p => p.id)

// ── Discovery Card ─────────────────────────────────────────────────────────

function DiscoveryCard({ r, idx, navigate }: { r: MangaResult; idx: number; navigate: ReturnType<typeof useNavigate> }) {
  const [coverError, setCoverError] = useState(false)
  const apiBase = api.defaults.baseURL || ''
  const apiKey = localStorage.getItem('manga-api-key') || ''
  const coverSrc = r.cover_url ? `${apiBase}/manga/image-proxy?url=${encodeURIComponent(r.cover_url)}&api_key=${apiKey}` : null
  const isNovel = r.type === 'novel' || NOVEL_PROVIDER_IDS.includes(r.provider)

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
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.25s ease, transform 0.3s ease', opacity: 0 }}
            onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }}
            onError={() => setCoverError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen style={{ width: 24, height: 24, color: 'var(--muted3)' }} />
          </div>
        )}
        {isNovel && (
          <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(139,92,246,0.92)', backdropFilter: 'blur(6px)', padding: '2px 6px', borderRadius: 5, fontSize: 8, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', zIndex: 2 }}>
            Novel
          </div>
        )}
        {/* Active press effect via CSS */}
        <style>{`.disc-card-${idx % 20}:active { transform: scale(0.97); }`}</style>
      </div>
      <div style={{ marginTop: 6 }}>
        <div
          className="manga-card-title"
          style={{
            fontSize: 13,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            whiteSpace: 'normal', textWrap: 'balance',
          }}
        >
          {r.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted3)', marginTop: 2, textTransform: 'capitalize', fontWeight: 500 }}>{r.provider}</div>
      </div>
    </motion.div>
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
  const isNovel = r.type === 'novel' || NOVEL_PROVIDER_IDS.includes(r.provider)
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
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0, transition: 'opacity 0.25s ease' }}
            className="group-hover:scale-105 transition-transform duration-400"
            onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }}
            onError={() => setCoverError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
            <BookOpen style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
          </div>
        )}
        {isNovel && (
          <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(139,92,246,0.92)', backdropFilter: 'blur(6px)', padding: '2px 7px', borderRadius: 6, fontSize: 8.5, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', zIndex: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
            Novel
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {r.provider}
        </div>
      </div>

      <div style={{ marginTop: 8, paddingLeft: 2 }}>
        <div className="manga-card-title" style={{ fontSize: 13.5 }}>{r.title}</div>
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

function getHunterBadgeStyle(tier: string, code: string) {
  if (code === 'MONARCH') {
    return {
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/50',
      text: 'text-purple-300',
      glow: 'rgba(168, 85, 247, 0.45)',
    }
  }
  switch (tier) {
    case 'diamond':
      return {
        border: 'border-purple-400/40',
        bg: 'bg-purple-900/30',
        text: 'text-purple-300',
        glow: 'rgba(168, 85, 247, 0.3)',
      }
    case 'platinum':
      return {
        border: 'border-sky-400/40',
        bg: 'bg-sky-900/30',
        text: 'text-sky-300',
        glow: 'rgba(56, 189, 248, 0.3)',
      }
    case 'gold':
      return {
        border: 'border-amber-400/40',
        bg: 'bg-amber-900/30',
        text: 'text-amber-300',
        glow: 'rgba(245, 158, 11, 0.3)',
      }
    case 'silver':
      return {
        border: 'border-slate-400/40',
        bg: 'bg-slate-800/40',
        text: 'text-slate-300',
        glow: 'rgba(148, 163, 184, 0.25)',
      }
    case 'bronze':
    default:
      return {
        border: 'border-amber-700/40',
        bg: 'bg-amber-950/30',
        text: 'text-amber-400',
        glow: 'rgba(205, 127, 50, 0.2)',
      }
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SearchPage() {
  const navigate = useNavigate()
  const { show: toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'novel' ? 'novel' : searchParams.get('mode') === 'readers' ? 'readers' : 'manga'
  const [searchMode, setSearchMode] = useState<'manga' | 'novel' | 'readers'>(initialMode)
  usePageTitle(searchMode === 'novel' ? 'Browse Web Novels' : searchMode === 'readers' ? 'Community & Readers' : 'Browse Manga')

  const {
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    selectedProvider, setSelectedProvider,
    hasSearched, setHasSearched,
  } = useAppStore()

  interface ReaderResult {
    user_id: string
    username: string
    display_name: string
    bio: string
    avatar_url: string
    chapters_read: number
    manga_count: number
    streak_days: number
  }

  interface LeaderboardEntry {
    rank: number
    user_id: string
    username: string | null
    display_name: string
    bio: string
    avatar_url: string
    pinned_badges: string[]
    chapters_read: number
    manga_count: number
    streak_days: number
    score: number
    hunter_rank: {
      rank_code: string
      rank_name: string
      tier: string
    }
  }

  const [readerResults, setReaderResults] = useState<ReaderResult[]>([])
  const [readerLoading, setReaderLoading] = useState(false)
  const [readerHasSearched, setReaderHasSearched] = useState(false)

  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'yearly' | 'all_time'>('all_time')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const fetchLeaderboard = useCallback(async (period: 'weekly' | 'monthly' | 'yearly' | 'all_time') => {
    setLeaderboardLoading(true)
    try {
      const res = await api.get(`/users/leaderboard?period=${period}&limit=50`)
      setLeaderboard(res.data || [])
    } catch {
      setLeaderboard([])
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchMode === 'readers' && !searchQuery.trim()) {
      fetchLeaderboard(leaderboardPeriod)
    }
  }, [searchMode, searchQuery, leaderboardPeriod, fetchLeaderboard])

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

  // Discovery feed — per-source data, survives back-nav via module-level cache
  const [discoveryBySource, setDiscoveryBySource] = useState<Record<string, { popular: MangaResult[]; latest: MangaResult[] }>>(_discoveryBySource)
  const [discoveryLoading, setDiscoveryLoading] = useState(!_discoveryFetched)

  // Pre-select source from URL param (?source=mangakatana)
  useEffect(() => {
    const src = searchParams.get('source')
    if (src) setSelectedProvider(src)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (manager.extensions.size === 0) {
      return searchMode === 'novel' ? NOVEL_PROVIDERS : FALLBACK_PROVIDERS
    }
    const all = Array.from(manager.extensions.values())
    if (searchMode === 'readers') return []
    if (searchMode === 'novel') {
      const novels = all
        .filter(ext => ext.type === 'novel' || NOVEL_PROVIDER_IDS.includes(ext.id))
        .map(ext => ({ id: ext.id, name: ext.name }))
      return novels.length > 0 ? novels : NOVEL_PROVIDERS
    }
    return all
      .filter(ext => ext.type !== 'novel' && !NOVEL_PROVIDER_IDS.includes(ext.id))
      .map(ext => ({ id: ext.id, name: ext.name }))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- extCount triggers recompute when extensions load
  }, [extCount, searchMode])

  // Aggregate popular/latest — interleaved
  const aggregatePopular = useMemo(() => {
    if (searchMode === 'novel') {
      const cols = Object.entries(discoveryBySource)
        .filter(([id]) => NOVEL_PROVIDER_IDS.includes(id))
        .map(([, v]) => (v.popular ?? []).map(r => ({ ...r, type: 'novel' as const })))
      return _interleave(cols)
    }
    const cols = Object.entries(discoveryBySource)
      .filter(([id]) => id !== 'mangadex' && !NOVEL_PROVIDER_IDS.includes(id) && enabledSources.includes(id))
      .map(([, v]) => v.popular ?? [])
    return _interleave(cols)
  }, [discoveryBySource, enabledSources, searchMode])

  const aggregateLatest = useMemo(() => {
    if (searchMode === 'novel') {
      const cols = Object.entries(discoveryBySource)
        .filter(([id]) => NOVEL_PROVIDER_IDS.includes(id))
        .map(([, v]) => (v.latest ?? []).map(r => ({ ...r, type: 'novel' as const })))
      return _interleave(cols)
    }
    const cols = Object.entries(discoveryBySource)
      .filter(([id]) => id !== 'mangadex' && !NOVEL_PROVIDER_IDS.includes(id) && enabledSources.includes(id))
      .map(([, v]) => v.latest ?? [])
    return _interleave(cols)
  }, [discoveryBySource, enabledSources, searchMode])

  useEffect(() => {
    if (activeProviders.length > 0) {
      if (selectedProvider && !activeProviders.some(p => p.id === selectedProvider)) setSelectedProvider(null)
      if (searchMode === 'manga') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEnabledSources(prev => {
          const availableIds = activeProviders.map(p => p.id)
          const valid = prev.filter(id => availableIds.includes(id))
          return valid.length > 0 ? valid : getEnabledSources(availableIds)
        })
      }
    }
  }, [activeProviders, selectedProvider, setSelectedProvider, searchMode])

  // Fetch discovery feed once on mount — stores per-source data
  useEffect(() => {
    if (_discoveryFetched) return  // cache hit — skip fetch entirely

    let spinnerCleared = false
    const clearSpinner = () => {
      if (!spinnerCleared) { spinnerCleared = true; setDiscoveryLoading(false) }
    }

    const mergeSource = (sourceId: string, key: 'popular' | 'latest', incoming: MangaResult[]) => {
      setDiscoveryBySource(prev => {
        const current = prev[sourceId] ?? { popular: [], latest: [] }
        const seen = new Set(current[key].map(r => `${r.provider}:${r.id}`))
        const merged = [...current[key], ...incoming.filter(r => !seen.has(`${r.provider}:${r.id}`))]
        const updated = { ...prev, [sourceId]: { ...current, [key]: merged } }
        Object.assign(_discoveryBySource, updated)
        return updated
      })
      clearSpinner()
    }

    const run = async () => {
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()
      const exts = Array.from(manager.extensions.values())
      if (exts.length === 0) { clearSpinner(); return }

      // 1. Backend discovery cache — instant for all built-in sources
      const providerIds = exts.map(e => e.id).join(',')
      type DiscoveryResponse = Record<string, { popular: MangaResult[]; latest: MangaResult[] }>
      const cached: DiscoveryResponse = await api.get(`/sources/discovery?providers=${providerIds}`)
        .then(r => r.data as DiscoveryResponse)
        .catch(() => ({} as DiscoveryResponse))

      Object.entries(cached).forEach(([sourceId, data]) => {
        if (data.popular?.length) mergeSource(sourceId, 'popular', data.popular)
        if (data.latest?.length) mergeSource(sourceId, 'latest', data.latest)
      })

      // 2. Progressive browser-side fetch for community sources not covered by backend
      const coveredIds = new Set(
        Object.entries(cached)
          .filter(([, v]) => (v.popular?.length ?? 0) > 0 || (v.latest?.length ?? 0) > 0)
          .map(([id]) => id)
      )
      const uncovered = exts.filter(e => !coveredIds.has(e.id))
      uncovered.forEach(ext => {
        if (ext.getPopular) {
          (ext.getPopular(1) as Promise<MangaResult[]>)
            .then(r => mergeSource(ext.id, 'popular', r))
            .catch(() => {})
        }
        if (ext.getLatest) {
          (ext.getLatest(1) as Promise<MangaResult[]>)
            .then(r => mergeSource(ext.id, 'latest', r))
            .catch(() => {})
        }
      })

      clearSpinner()
      _discoveryFetched = true
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
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) toast('Sign in to add manga to your library.', 'error')
      else toast('Could not add to library.', 'error')
    }
    finally { setSubscribing(prev => prev.filter(k => k !== key)) }
  }

  const performReaderSearch = useCallback(async (query: string) => {
    if (!query) return
    setReaderLoading(true)
    setReaderHasSearched(true)
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`)
      setReaderResults(res.data || [])
    } catch {
      setReaderResults([])
    } finally {
      setReaderLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchMode !== 'readers') return
    const q = searchQuery.trim()
    if (!q) {
      setReaderResults([])
      setReaderHasSearched(false)
      setReaderLoading(false)
      return
    }
    const timer = setTimeout(() => {
      performReaderSearch(q)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, searchMode, performReaderSearch])

  const handleSwitchMode = (mode: 'manga' | 'novel' | 'readers') => {
    if (mode === searchMode) return
    setSearchMode(mode)
    setSelectedProvider(null)
    const nextParams = new URLSearchParams(searchParams)
    if (mode === 'novel') nextParams.set('mode', 'novel')
    else if (mode === 'readers') nextParams.set('mode', 'readers')
    else nextParams.delete('mode')
    setSearchParams(nextParams, { replace: true })
    if (searchQuery.trim()) {
      if (mode === 'readers') {
        performReaderSearch(searchQuery.trim())
      } else {
        performSearch(searchQuery.trim(), mode, null)
      }
    } else {
      if (mode === 'readers') {
        setReaderResults([])
        setReaderHasSearched(false)
      } else {
        setSearchResults([])
        setHasSearched(false)
      }
    }
  }

  // Incremented on every new search to discard stale results from previous calls
  const searchIdRef = useRef(0)

  const performSearch = useCallback((query: string, overrideMode?: 'manga' | 'novel' | 'readers', overrideProvider?: string | null) => {
    if (!query) return
    const mode = overrideMode ?? searchMode
    if (mode === 'readers') {
      performReaderSearch(query)
      return
    }
    const providerToUse = overrideProvider !== undefined ? overrideProvider : selectedProvider
    const searchId = ++searchIdRef.current

    setLoading(true)
    setHasSearched(false)
    setSearchResults([])

    const run = async () => {
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()
      if (manager.extensions.size === 0) {
        if (searchIdRef.current !== searchId) return
        toast('No sources loaded. Check your API Key in Settings.', 'warning')
        setLoading(false)
        return
      }

      // Build extension list for this search
      let exts: ReturnType<typeof manager.extensions.get>[]
      if (mode === 'novel') {
        if (providerToUse) {
          exts = [manager.extensions.get(providerToUse)].filter(Boolean) as typeof exts
        } else {
          exts = Array.from(manager.extensions.values()).filter(
            ext => ext.type === 'novel' || NOVEL_PROVIDER_IDS.includes(ext.id)
          )
        }
      } else {
        if (providerToUse) {
          exts = [manager.extensions.get(providerToUse)].filter(Boolean) as typeof exts
        } else {
          const allExts = Array.from(manager.extensions.values()).filter(
            ext => ext.type !== 'novel' && !NOVEL_PROVIDER_IDS.includes(ext.id)
          )
          const targetExts = allExts.filter(ext => enabledSources.includes(ext.id))
          exts = targetExts.length > 0 ? targetExts : allExts
        }
      }

      if (exts.length === 0) {
        if (searchIdRef.current !== searchId) return
        setLoading(false)
        setHasSearched(true)
        return
      }

      // AniList alt-title variants (manga mode only, fires in parallel, adds zero wait)
      let anilistVariants: string[] = []
      // Accumulator for streaming results — needed because setSearchResults is not a state setter
      const acc: MangaResult[] = []

      if (mode !== 'novel') {
        ;(async () => {
          try {
            const res = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({
                query: 'query($s:String){Media(search:$s,type:MANGA,isAdult:false){title{romaji english native}synonyms}}',
                variables: { s: query },
              }),
            })
            if (!res.ok || searchIdRef.current !== searchId) return
            const json = await res.json()
            const media = json?.data?.Media
            if (!media || searchIdRef.current !== searchId) return
            const variants = [
              media.title?.romaji,
              media.title?.english,
              media.title?.native,
              ...(media.synonyms ?? []),
            ].filter(Boolean) as string[]
            if (variants.length === 0) return
            anilistVariants = variants
            // Re-sort accumulated results with the richer variant set
            if (acc.length > 0 && searchIdRef.current === searchId) {
              const resorted = sortResultsByRelevance(acc, query, anilistVariants)
              acc.splice(0, acc.length, ...resorted)
              setSearchResults(resorted)
            }
          } catch {
            // AniList failure is silent — doesn't degrade search quality
          }
        })()
      }

      // Per-source streaming: fire all, update state as each resolves
      let remaining = exts.length
      let hasError403 = false

      const handleBatch = (newResults: MangaResult[]) => {
        if (searchIdRef.current !== searchId) return
        remaining--
        if (newResults.length > 0) {
          const merged = sortResultsByRelevance([...acc, ...newResults], query, anilistVariants)
          acc.splice(0, acc.length, ...merged)
          setSearchResults(merged)
        }
        if (remaining === 0) {
          setLoading(false)
          setHasSearched(true)
          if (hasError403 && acc.length === 0) toast('Search failed (403). Check your API Key in Settings.', 'error')
        }
      }

      for (const ext of exts) {
        if (!ext) { handleBatch([]); continue }
        ;(ext.search(query, 1) as Promise<MangaResult[]>)
          .then(results =>
            handleBatch(
              mode === 'novel'
                ? results.map(r => ({ ...r, type: 'novel' as const }))
                : results
            )
          )
          .catch(err => {
            console.error(`[Search] ${ext.name} failed:`, err)
            if (String(err).includes('403')) hasError403 = true
            handleBatch([])
          })
      }
    }

    run().catch(err => {
      console.error('[Search] init error:', err)
      if (searchIdRef.current === searchId) setLoading(false)
    })
  }, [searchMode, selectedProvider, enabledSources, setSearchResults, setHasSearched, toast])

  const isFirstSourceMount = useRef(true)
  useEffect(() => {
    if (isFirstSourceMount.current) { isFirstSourceMount.current = false; return }
    if (searchQuery.trim() && searchMode !== 'readers') performSearch(searchQuery.trim(), searchMode, selectedProvider)
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
            {searchMode === 'novel' ? 'Discover Web Novels' : searchMode === 'readers' ? 'Find Readers' : 'Discover Manga'}
          </h1>
          <p className="hidden md:block" style={{ fontSize: 13, color: 'var(--muted2)' }}>
            {searchMode === 'novel'
              ? 'Read web novels and light novels directly in your browser.'
              : searchMode === 'readers'
              ? 'Search for other manga fans, explore their public profiles, streaks, and reading history.'
              : 'Search across multiple sources to find your next read.'}
          </p>
        </motion.div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: 20 }}>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (searchMode === 'readers') {
              performReaderSearch(searchQuery.trim())
            } else {
              performSearch(searchQuery.trim(), searchMode)
            }
          }}
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
                placeholder={searchMode === 'novel' ? "Search web novel titles…" : searchMode === 'readers' ? "Search readers by @username or display name…" : "Search your titles"}
                style={{ width: '100%', padding: '14px 48px 14px 42px', borderRadius: 18, border: 'none', background: 'transparent', fontSize: 15, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box', fontWeight: 500 }}
              />
              <button
                type="submit"
                disabled={searchMode === 'readers' ? readerLoading : loading}
                aria-label="Search"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: 12, border: 'none', background: searchQuery.trim() ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: searchQuery.trim() ? '#fff' : 'var(--muted3)', transition: 'background 0.15s, color 0.15s' }}
              >
                {(searchMode === 'readers' ? readerLoading : loading) ? <ThemedSpinner size="xs" /> : <SearchIcon style={{ width: 14, height: 14 }} />}
              </button>
            </div>

            {/* Sources modal button (Manga only) */}
            {searchMode === 'manga' && (
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
            )}

            {/* View switcher (Manga & Novel only) */}
            {searchMode !== 'readers' && (
              <button
                type="button"
                onClick={handleToggleViewMode}
                aria-label={searchViewMode === 'lanes' ? 'Switch to Grid View' : 'Switch to Swimlane View'}
                style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--surface)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)' }}
              >
                {searchViewMode === 'lanes' ? <LayoutGrid style={{ width: 17, height: 17 }} /> : <LayoutList style={{ width: 17, height: 17 }} />}
              </button>
            )}

            {/* Filter panel (Manga only) */}
            {searchMode === 'manga' && (
              <button type="button" onClick={() => setShowFilterPanel(true)} aria-label="Search filters" aria-expanded={showFilterPanel} aria-haspopup="dialog"
                style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 16, border: `1.5px solid ${hasSearchFilters ? 'var(--accent)' : 'var(--border)'}`, background: hasSearchFilters ? 'rgba(220,38,38,0.08)' : 'var(--surface)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasSearchFilters ? 'var(--accent)' : 'var(--muted2)' }}
              >
                <SlidersHorizontal style={{ width: 17, height: 17 }} />
              </button>
            )}
          </form>

          {/* Media Type Switcher: Manga vs Web Novels vs Readers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => handleSwitchMode('manga')}
              aria-pressed={searchMode === 'manga'}
              className={cn('filter-pill flex items-center gap-1.5 transition-all', searchMode === 'manga' && 'active')}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: 20,
                background: searchMode === 'manga' ? 'var(--accent)' : 'var(--surface)',
                color: searchMode === 'manga' ? '#fff' : 'var(--muted2)',
                border: `1px solid ${searchMode === 'manga' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <BookOpen style={{ width: 13, height: 13 }} />
              <span>Manga</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('novel')}
              aria-pressed={searchMode === 'novel'}
              className={cn('filter-pill flex items-center gap-1.5 transition-all', searchMode === 'novel' && 'active')}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: 20,
                background: searchMode === 'novel' ? 'var(--accent)' : 'var(--surface)',
                color: searchMode === 'novel' ? '#fff' : 'var(--muted2)',
                border: `1px solid ${searchMode === 'novel' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <BookMarked style={{ width: 13, height: 13 }} />
              <span>Web Novels</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('readers')}
              aria-pressed={searchMode === 'readers'}
              className={cn('filter-pill flex items-center gap-1.5 transition-all', searchMode === 'readers' && 'active')}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: 20,
                background: searchMode === 'readers' ? 'var(--accent)' : 'var(--surface)',
                color: searchMode === 'readers' ? '#fff' : 'var(--muted2)',
                border: `1px solid ${searchMode === 'readers' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <Users style={{ width: 13, height: 13 }} />
              <span>Readers</span>
            </button>
          </div>

          {/* Source filter pills — only visible when results are showing or query entered */}
          {searchMode !== 'readers' && (hasSearched || searchQuery.trim()) && activeProviders.length > 0 && (() => {
            const visibleProviders = searchMode === 'novel'
              ? activeProviders
              : activeProviders.filter(p => enabledSources.includes(p.id))
            const DEFAULT_VISIBLE = 4
            const shown = visibleProviders.slice(0, DEFAULT_VISIBLE)
            const hidden = visibleProviders.slice(DEFAULT_VISIBLE)
            return (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap', marginTop: 10, paddingBottom: 4, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
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

        {/* ── Readers Mode ────────────────────────────────────────── */}
        {searchMode === 'readers' ? (
          <>
            {!searchQuery.trim() && !readerHasSearched ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 mt-2">
                {/* ── Header & Period Controls ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg flex-shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        Reader Hall of Fame
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase tracking-wider">
                          Ranked EXP
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Global leaderboard computed from Chapters (×10), Streaks (×50), and Series (×25).
                      </p>
                    </div>
                  </div>

                  {/* Period Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 self-stretch sm:self-auto overflow-x-auto scrollbar-none flex-shrink-0">
                    {(['weekly', 'monthly', 'yearly', 'all_time'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setLeaderboardPeriod(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                          leaderboardPeriod === p
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : p === 'yearly' ? 'Yearly' : 'All-Time'}
                      </button>
                    ))}
                  </div>
                </div>

                {leaderboardLoading ? (
                  <ThemedSkeletonGrid count={6} />
                ) : leaderboard.length === 0 ? (
                  <div className="glass-card p-10 text-center max-w-lg mx-auto border-white/10 space-y-3">
                    <Trophy className="w-10 h-10 text-zinc-600 mx-auto" />
                    <h3 className="text-sm font-black text-white">No Readers Ranked Yet</h3>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                      No reading activity recorded for this period. Read chapters and build your streak to claim the #1 Sovereign spot!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Top 3 Podium Showcase ── */}
                    {leaderboard.length >= 1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end pt-2 pb-2">
                        {/* 2nd Place (if exists) */}
                        {leaderboard[1] ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            onClick={() => navigate(`/profile/${leaderboard[1].username || leaderboard[1].user_id}`)}
                            className="glass-card p-4 border-slate-500/20 bg-slate-900/20 hover:border-slate-400/40 transition-all cursor-pointer flex flex-col items-center text-center relative group order-2 sm:order-1"
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-500/20 border border-slate-400/40 flex items-center justify-center text-slate-300 font-black text-xs mb-2">
                              #2
                            </div>
                            <Medal className="w-6 h-6 text-slate-300 mb-2" />
                            {leaderboard[1].avatar_url ? (
                              <img src={leaderboard[1].avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-400/40 mb-2 shadow-lg" />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-400/40 flex items-center justify-center text-slate-300 font-black text-base mb-2 shadow-lg">
                                {leaderboard[1].display_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <h4 className="text-xs font-black text-white group-hover:text-red-400 transition-colors truncate max-w-full">
                              {leaderboard[1].display_name}
                            </h4>
                            {leaderboard[1].username && (
                              <p className="text-[10px] font-mono text-zinc-500 truncate max-w-full">
                                @{leaderboard[1].username}
                              </p>
                            )}
                            <div className="mt-2">
                              {(() => {
                                const style = getHunterBadgeStyle(leaderboard[1].hunter_rank.tier, leaderboard[1].hunter_rank.rank_code)
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                                    <Shield className="w-2.5 h-2.5" />
                                    {leaderboard[1].hunter_rank.rank_name}
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-white/5 w-full flex items-center justify-center gap-2 text-[10px] text-zinc-400">
                              <span className="font-mono font-bold text-slate-300 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-slate-400" /> {leaderboard[1].score.toLocaleString()} EXP
                              </span>
                            </div>
                          </motion.div>
                        ) : <div className="hidden sm:block order-1" />}

                        {/* 1st Place Champion (Center, Elevated) */}
                        {leaderboard[0] && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => navigate(`/profile/${leaderboard[0].username || leaderboard[0].user_id}`)}
                            className="glass-card p-5 border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-transparent hover:border-amber-400/50 transition-all cursor-pointer flex flex-col items-center text-center relative group sm:-translate-y-2 shadow-xl order-1 sm:order-2"
                          >
                            <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1">
                              <Crown className="w-3 h-3 text-black" /> #1 Sovereign
                            </div>
                            <Crown className="w-8 h-8 text-amber-400 mt-2 mb-2 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                            {leaderboard[0].avatar_url ? (
                              <img src={leaderboard[0].avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 mb-2 shadow-xl" />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-lg mb-2 shadow-xl">
                                {leaderboard[0].display_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors truncate max-w-full">
                              {leaderboard[0].display_name}
                            </h4>
                            {leaderboard[0].username && (
                              <p className="text-xs font-mono text-zinc-400 truncate max-w-full">
                                @{leaderboard[0].username}
                              </p>
                            )}
                            <div className="mt-2">
                              {(() => {
                                const style = getHunterBadgeStyle(leaderboard[0].hunter_rank.tier, leaderboard[0].hunter_rank.rank_code)
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                                    <Shield className="w-3 h-3" />
                                    {leaderboard[0].hunter_rank.rank_name}
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-white/10 w-full flex items-center justify-center gap-3 text-xs">
                              <span className="font-mono font-black text-amber-400 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-amber-400" /> {leaderboard[0].score.toLocaleString()} EXP
                              </span>
                              <span className="text-[10px] text-zinc-400 font-bold">
                                {leaderboard[0].chapters_read} ch · {leaderboard[0].streak_days}d streak
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* 3rd Place (if exists) */}
                        {leaderboard[2] ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            onClick={() => navigate(`/profile/${leaderboard[2].username || leaderboard[2].user_id}`)}
                            className="glass-card p-4 border-amber-800/30 bg-amber-950/10 hover:border-amber-700/40 transition-all cursor-pointer flex flex-col items-center text-center relative group order-3"
                          >
                            <div className="w-7 h-7 rounded-full bg-amber-800/30 border border-amber-700/40 flex items-center justify-center text-amber-500 font-black text-xs mb-2">
                              #3
                            </div>
                            <Award className="w-6 h-6 text-amber-600 mb-2" />
                            {leaderboard[2].avatar_url ? (
                              <img src={leaderboard[2].avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-700/40 mb-2 shadow-lg" />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border-2 border-amber-700/40 flex items-center justify-center text-amber-500 font-black text-base mb-2 shadow-lg">
                                {leaderboard[2].display_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <h4 className="text-xs font-black text-white group-hover:text-red-400 transition-colors truncate max-w-full">
                              {leaderboard[2].display_name}
                            </h4>
                            {leaderboard[2].username && (
                              <p className="text-[10px] font-mono text-zinc-500 truncate max-w-full">
                                @{leaderboard[2].username}
                              </p>
                            )}
                            <div className="mt-2">
                              {(() => {
                                const style = getHunterBadgeStyle(leaderboard[2].hunter_rank.tier, leaderboard[2].hunter_rank.rank_code)
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                                    <Shield className="w-2.5 h-2.5" />
                                    {leaderboard[2].hunter_rank.rank_name}
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-white/5 w-full flex items-center justify-center gap-2 text-[10px] text-zinc-400">
                              <span className="font-mono font-bold text-amber-500 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" /> {leaderboard[2].score.toLocaleString()} EXP
                              </span>
                            </div>
                          </motion.div>
                        ) : <div className="hidden sm:block order-3" />}
                      </div>
                    )}

                    {/* ── Complete Hall of Fame Ranked List ── */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 px-3 uppercase tracking-wider">
                        <span>Rank & Reader</span>
                        <span>Score & Stats</span>
                      </div>

                      <div className="space-y-1.5">
                        {leaderboard.map((u) => {
                          const style = getHunterBadgeStyle(u.hunter_rank.tier, u.hunter_rank.rank_code)
                          return (
                            <motion.div
                              key={u.user_id}
                              onClick={() => navigate(`/profile/${u.username || u.user_id}`)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                                u.rank === 1
                                  ? 'bg-amber-500/[0.06] border-amber-500/30 hover:border-amber-400/50'
                                  : u.rank === 2
                                  ? 'bg-slate-500/[0.04] border-slate-500/20 hover:border-slate-400/40'
                                  : u.rank === 3
                                  ? 'bg-amber-800/[0.04] border-amber-800/20 hover:border-amber-700/40'
                                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Rank badge */}
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                                  u.rank === 1
                                    ? 'bg-amber-500 text-black shadow-md'
                                    : u.rank === 2
                                    ? 'bg-slate-300 text-black'
                                    : u.rank === 3
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-white/5 text-zinc-400 font-mono'
                                }`}>
                                  {u.rank === 1 ? <Crown className="w-3.5 h-3.5" /> : `#${u.rank}`}
                                </div>

                                {/* Avatar */}
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                                    {u.display_name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}

                                {/* Names + Hunter Badge */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs font-black text-white group-hover:text-red-400 transition-colors truncate">
                                      {u.display_name}
                                    </h4>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                                      <Shield className="w-2.5 h-2.5" />
                                      {u.hunter_rank.rank_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {u.username && (
                                      <span className="text-[10px] font-mono text-zinc-500 truncate">
                                        @{u.username}
                                      </span>
                                    )}
                                    {u.pinned_badges && u.pinned_badges.length > 0 && (
                                      <div className="flex items-center gap-1 ml-1">
                                        {u.pinned_badges.slice(0, 4).map(bid => {
                                          const bObj = MILESTONES.find(m => m.id === bid)
                                          if (!bObj) return null
                                          return (
                                            <div
                                              key={bid}
                                              className="w-4 h-4 rounded-md flex items-center justify-center shadow-xs flex-shrink-0"
                                              style={{ background: bObj.color }}
                                              title={`${bObj.title}: ${bObj.description}`}
                                            >
                                              <Award className="w-2.5 h-2.5 text-black" />
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <div className="text-xs font-black font-mono text-amber-400 flex items-center justify-end gap-1">
                                    <Zap className="w-3 h-3 text-amber-400" />
                                    {u.score.toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-medium">
                                    {u.chapters_read} ch · {u.streak_days}d streak
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ) : readerLoading ? (
              <ThemedSkeletonGrid count={6} />
            ) : readerResults.length > 0 ? (
              <div>
                <p aria-live="polite" aria-atomic="true" style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', marginBottom: 14, letterSpacing: '0.04em' }}>
                  {readerResults.length} reader{readerResults.length !== 1 ? 's' : ''} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {readerResults.map((u, idx) => (
                    <motion.div
                      key={u.user_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
                      onClick={() => navigate(`/profile/${u.username || u.user_id}`)}
                      className="glass-card p-4 hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-red-500/30 flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-500 font-black text-sm flex-shrink-0">
                            {(u.display_name || u.username || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-white group-hover:text-red-400 transition-colors truncate">
                            {u.display_name || u.username}
                          </h3>
                          {u.username && (
                            <p className="text-xs font-mono font-bold text-red-400/90 truncate">
                              @{u.username}
                            </p>
                          )}
                        </div>
                      </div>

                      {u.bio && (
                        <p className="text-xs text-zinc-300 line-clamp-2 mt-3 leading-relaxed">
                          {u.bio}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-3.5 pt-2.5 border-t border-white/5 text-[10px] font-bold text-zinc-400">
                        <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                          <BookOpen className="w-3 h-3 text-red-400" /> {u.chapters_read || 0} chapters
                        </span>
                        {u.streak_days > 0 && (
                          <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                            <Flame className="w-3 h-3 text-amber-400" /> {u.streak_days}d streak
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : readerHasSearched ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 24px', gap: 12 }}>
                <Users style={{ width: 48, height: 48, color: 'var(--muted3)', opacity: 0.35 }} />
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>No readers found</p>
                <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Couldn't find any readers matching "{searchQuery}".</p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {/* ── Discovery Feed (idle state) ─────────────────────────────── */}
            {isIdle && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                {/* Aggregate rows */}
                <DiscoverySwimlane
                  title={searchMode === 'novel' ? "Popular Web Novels" : "Popular Now"}
                  items={aggregatePopular}
                  loading={discoveryLoading}
                  browseHref={searchMode === 'novel' ? undefined : "/browse/popular"}
                  renderCard={(r, i) => (
                    <DiscoveryCard key={`${r.provider}:${r.id}`} r={r} idx={i} navigate={navigate} />
                  )}
                />
                <DiscoverySwimlane
                  title={searchMode === 'novel' ? "Latest Web Novels" : "Latest Updates"}
                  items={aggregateLatest}
                  loading={discoveryLoading}
                  browseHref={searchMode === 'novel' ? undefined : "/browse/latest"}
                  renderCard={(r, i) => (
                    <DiscoveryCard key={`${r.provider}:${r.id}`} r={r} idx={i} navigate={navigate} />
                  )}
                />
                {/* Per-source swimlanes */}
                {activeProviders
                  .filter(p => searchMode === 'novel' ? true : enabledSources.includes(p.id))
                  .map(source => {
                    const data = discoveryBySource[source.id]
                    const hasData = (data?.popular?.length ?? 0) > 0
                    if (!hasData && !discoveryLoading) return null
                    return (
                      <DiscoverySwimlane
                        key={source.id}
                        title={source.name}
                        items={(data?.popular ?? []).map(r => searchMode === 'novel' ? { ...r, type: 'novel' as const } : r)}
                        loading={discoveryLoading && !data}
                        browseHref={searchMode === 'novel' ? undefined : `/browse/source/${source.id}`}
                        renderCard={(r, i) => (
                          <DiscoveryCard key={`${r.provider}:${r.id}`} r={r} idx={i} navigate={navigate} />
                        )}
                      />
                    )
                })}
              </motion.div>
            )}

            {/* ── Search results ──────────────────────────────────────────── */}
            {!isIdle && (
              <>
                {(searchResults.length > 0 || hasSearched) && (
                  <p aria-live="polite" aria-atomic="true" style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', marginBottom: 12, letterSpacing: '0.04em' }}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}{loading ? ' · searching more sources…' : ''}
                  </p>
                )}
                {searchResults.length > 0 ? (
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
                            <div key={'top-' + r.id + r.provider} className="w-35 sm:w-38.75 min-w-35 sm:min-w-38.75 shrink-0 snap-start">
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
                              <div key={r.id + r.provider} className="w-35 sm:w-38.75 min-w-35 sm:min-w-38.75 shrink-0 snap-start">
                                <MangaCard r={r} idx={idx} onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate} />
                              </div>
                            ))}
                          </SourceSwimlane>
                        ))}
                    </div>
                  )
                ) : loading ? (
                  <ThemedSkeletonGrid count={12} />
                ) : hasSearched ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 24px', gap: 12 }}>
                    <Globe style={{ width: 52, height: 52, color: 'var(--muted3)', opacity: 0.35 }} />
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>No results found</p>
                    <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Couldn't find "{searchQuery}". Try another spelling.</p>
                  </div>
                ) : null}
              </>
            )}
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
              className="md:bottom-0! md:max-h-[85vh]!"
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

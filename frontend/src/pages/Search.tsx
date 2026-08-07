import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { ExtensionManager } from '../lib/extensions'
import { Search as SearchIcon, Globe, BookOpen, BookMarked, Check, SlidersHorizontal, X, TrendingUp, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAppStore } from '../lib/store'
import { buildSmartMangaUrl } from '../lib/smartUrl'
import { ThemedSpinner, ThemedSkeletonGrid } from '../components/common/ThemedLoader'

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

const PROVIDERS = [
  { id: 'mangadex', name: 'MangaDex' },
  { id: 'asurascans', name: 'Asura Scans' },
  { id: 'mangakatana', name: 'MangaKatana' },
  { id: 'omegascans', name: 'Omega Scans' },
]

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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
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
          title={isSubscribed ? "In Library (tap to remove)" : "Add to Library"}
        >
          {isSubscribing ? (
            <ThemedSpinner size="xs" />
          ) : isSubscribed ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>In Library</span>
            </>
          ) : (
            <>
              <BookMarked className="w-3.5 h-3.5 text-white" />
              <span>Add to Library</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

export default function SearchPage() {
  const navigate = useNavigate()
  const {
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    selectedProvider, setSelectedProvider,
    hasSearched, setHasSearched,
    searchTab: tab, setSearchTab: setTab,
    browseProvider, setBrowseProvider,
    browseResults, setBrowseResults,
    browsePage, setBrowsePage,
    browseHasMore, setBrowseHasMore,
    lastFetchKey, setLastFetchKey
  } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [browseLoading, setBrowseLoading] = useState(false)
  const [subscribing, setSubscribing] = useState<string[]>([])
  const [subscribed, setSubscribed] = useState<string[]>([])
  const [extCount, setExtCount] = useState(0)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const [filterStatus, setFilterStatus] = useState<string>('any')
  const [filterRating, setFilterRating] = useState<string[]>(['safe'])
  const [filterFormat, setFilterFormat] = useState<string[]>([])

  interface FilterDef { id: string; label: string; type: string; options: { value: string; label: string }[]; default: string }
  const [sourceFilters] = useState<FilterDef[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

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
    return PROVIDERS.filter(p => manager.extensions.has(p.id))
  }, [extCount])

  useEffect(() => {
    if (activeProviders.length > 0) {
      if (selectedProvider && !activeProviders.some(p => p.id === selectedProvider)) setSelectedProvider(null)
      if (browseProvider && !activeProviders.some(p => p.id === browseProvider)) setBrowseProvider(activeProviders[0]?.id || 'mangadex')
    }
  }, [activeProviders, selectedProvider, browseProvider, setSelectedProvider, setBrowseProvider])

  const handleSubscribe = async (e: React.MouseEvent, result: MangaResult) => {
    e.stopPropagation()
    const { provider, id: mangaId, title, cover_url } = result
    const key = `${provider}:${mangaId}`
    if (subscribed.includes(key) || subscribing.includes(key)) return
    setSubscribing(prev => [...prev, key])
    try {
      await api.post(`/manga/subscribe/${provider}/${encodeURIComponent(mangaId)}`, { title, cover_url })
      setSubscribed(prev => [...prev, key])
    } catch { alert('Could not add to library.') }
    finally { setSubscribing(prev => prev.filter(k => k !== key)) }
  }

  const performSearch = useCallback(async (query: string) => {
    if (!query) return
    setLoading(true)
    setHasSearched(false)
    try {
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()
      if (manager.extensions.size === 0) { alert('No sources loaded. Please check your API Key in Settings.'); setLoading(false); return }

      if (selectedProvider) {
        const ext = manager.extensions.get(selectedProvider)
        const results = ext ? await ext.search(query, 1) as MangaResult[] : []
        setSearchResults(results)
      } else {
        const allExts = Array.from(manager.extensions.values())
        const settled = await Promise.allSettled(allExts.map(ext => ext.search(query, 1) as Promise<MangaResult[]>))
        settled.forEach((r, i) => { if (r.status === 'rejected') console.error(`[Search] ${allExts[i].name} failed:`, r.reason) })
        const merged = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])
        if (merged.length === 0 && settled.some(r => r.status === 'rejected')) {
          const firstError = settled.find(r => r.status === 'rejected') as PromiseRejectedResult
          if (String(firstError?.reason).includes('403')) alert('Search failed (403 Forbidden). Is your API Key correct in Settings?')
        }
        setSearchResults(merged)
      }
      setHasSearched(true)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [selectedProvider, setSearchResults, setHasSearched])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchQuery.trim() && tab === 'search') performSearch(searchQuery.trim())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider])

  const fetchBrowse = useCallback(async (provider: string, page: number, endpoint: 'popular' | 'latest') => {
    setBrowseLoading(true)
    try {
      const ext = ExtensionManager.getInstance().extensions.get(provider)
      let data: MangaResult[]
      if (ext) {
        const method = endpoint === 'popular' ? ext.getPopular : ext.getLatest
        data = method ? await method(page) as MangaResult[] : await ext.search('', page) as MangaResult[]
      } else { data = [] }
      setBrowseResults(page === 1 ? data : [...browseResults, ...data])
      setBrowseHasMore(data.length === 20)
    } catch (err) { console.error(err); setBrowseHasMore(false) }
    finally { setBrowseLoading(false) }
  }, [browseResults, setBrowseResults, setBrowseHasMore])

  const selectBrowseProvider = (id: string) => { setBrowseProvider(id); setActiveFilters({}) }

  useEffect(() => {
    if (tab === 'popular' || tab === 'latest') {
      const fetchKey = `${tab}:${browseProvider}`
      if (lastFetchKey !== fetchKey || browseResults.length === 0) {
         
        setLastFetchKey(fetchKey)
         
        setBrowsePage(1)
         
        setBrowseResults([])
         
        setBrowseHasMore(true)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBrowse(browseProvider, 1, tab)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, browseProvider, lastFetchKey, browseResults.length])

  const loadMoreBrowse = () => {
    const nextPage = browsePage + 1
    setBrowsePage(nextPage)
    fetchBrowse(browseProvider, nextPage, tab as 'popular' | 'latest')
  }

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

  const TABS = [
    { id: 'search', label: 'SEARCH', Icon: SearchIcon },
    { id: 'popular', label: 'POPULAR', Icon: TrendingUp },
    { id: 'latest', label: 'LATEST', Icon: Clock },
  ]

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-6 pt-5 pb-28 flex-1">

        {/* Page heading */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: 'var(--fg)', lineHeight: 1.15, marginBottom: 3 }}>Discover Manga</h1>
          <p className="hidden md:block" style={{ fontSize: 13, color: 'var(--muted2)' }}>Search across multiple sources to find your next read.</p>
        </motion.div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999,
                border: `1px solid ${tab === id ? 'var(--accent)' : 'var(--border)'}`,
                background: tab === id ? 'rgba(220,38,38,0.1)' : 'var(--surface)',
                color: tab === id ? 'var(--accent)' : 'var(--muted1)',
                fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Icon style={{ width: 12, height: 12 }} />
              {label}
            </button>
          ))}
        </div>

        {/* Search bar (shown on search tab) */}
        {tab === 'search' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 12 }}>
            <form onSubmit={(e) => { e.preventDefault(); performSearch(searchQuery.trim()) }}
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <SearchIcon style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--muted3)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, author, or genre..."
                  style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary"
                style={{ flexShrink: 0, padding: '11px 22px', borderRadius: 14, fontSize: 13.5, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 7 }}
              >
                {loading ? <ThemedSpinner size="sm" /> : null}
                Search
              </button>
              <button type="button" onClick={() => setShowFilterPanel(true)}
                style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasSearchFilters ? 'var(--accent)' : 'var(--muted2)' }}
              >
                <SlidersHorizontal style={{ width: 15, height: 15 }} />
              </button>
            </form>

            {/* Source filter pills — only show if providers are loaded */}
            {activeProviders.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <button onClick={() => setSelectedProvider(null)} className={cn('filter-pill', !selectedProvider && 'active')}>All</button>
                {activeProviders.map(p => (
                  <button key={p.id} onClick={() => setSelectedProvider(p.id)} className={cn('filter-pill', selectedProvider === p.id && 'active')} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Browse tab source pills */}
        {(tab === 'popular' || tab === 'latest') && activeProviders.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {activeProviders.map(p => (
              <button key={p.id} onClick={() => selectBrowseProvider(p.id)} className={cn('filter-pill', browseProvider === p.id && 'active')} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Search results ── */}
        {tab === 'search' && (
          <>
            {loading ? (
              <ThemedSkeletonGrid count={12} />
            ) : searchResults.length > 0 ? (
              selectedProvider ? (
                <div style={GRID_STYLE}>
                  <AnimatePresence mode="popLayout">
                    {searchResults.map((r, idx) => (
                      <MangaCard key={r.id + r.provider} r={r} idx={idx} onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {Object.entries(searchResults.reduce<Record<string, MangaResult[]>>((acc, r) => { ;(acc[r.provider] ??= []).push(r); return acc }, {}))
                    .filter(([, results]) => results.length > 0)
                    .map(([provider, results]) => (
                      <div key={provider}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>{provider}</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <span style={{ fontSize: 11, color: 'var(--muted3)' }}>{results.length}</span>
                        </div>
                        <div style={GRID_STYLE}>
                          <AnimatePresence mode="popLayout">
                            {results.map((r, idx) => (
                              <MangaCard key={r.id + r.provider} r={r} idx={idx} onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate} />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                </div>
              )
            ) : hasSearched ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 24px', gap: 12 }}>
                <Globe style={{ width: 52, height: 52, color: 'var(--muted3)', opacity: 0.35 }} />
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>No results found</p>
                <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Couldn't find "{searchQuery}". Try another spelling.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '72px 24px', gap: 16 }}>
                <SearchIcon style={{ width: 56, height: 56, color: 'var(--muted3)', opacity: 0.3 }} />
                <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted3)' }}>Type something to search</p>
              </div>
            )}
          </>
        )}

        {/* ── Browse tabs ── */}
        {(tab === 'popular' || tab === 'latest') && (
          <>
            {browseLoading && browseResults.length === 0 ? (
              <ThemedSkeletonGrid count={12} />
            ) : browseResults.length > 0 ? (
              <>
                <div style={{ ...GRID_STYLE, marginBottom: 24 }}>
                  <AnimatePresence mode="popLayout">
                    {browseResults.map((r, idx) => (
                      <MangaCard key={r.id + r.provider} r={r} idx={idx} onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate} />
                    ))}
                  </AnimatePresence>
                </div>
                {browseHasMore && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={loadMoreBrowse} disabled={browseLoading} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {browseLoading ? <ThemedSpinner size="sm" /> : null}
                      Load More
                    </button>
                  </div>
                )}
              </>
            ) : !browseLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 12 }}>
                <Globe style={{ width: 36, height: 36, color: 'var(--muted3)', opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: 'var(--muted2)' }}>No results from {browseProvider}</p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Mobile / shared filter bottom sheet ── */}
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
              {/* Scrollable content */}
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

              {/* Sticky bottom buttons — always visible */}
              <div style={{ padding: '12px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--bg)', flexShrink: 0 }}>
                <button onClick={resetSearchFilters} className="btn-secondary" style={{ flex: 1, padding: '13px 0', fontSize: 14, fontWeight: 700 }}>Reset</button>
                <button onClick={() => setShowFilterPanel(false)} className="btn-primary" style={{ flex: 2, padding: '13px 0', fontSize: 14, fontWeight: 700 }}>
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

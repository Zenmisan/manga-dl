import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { ExtensionManager } from '../lib/extensions'
import { Search as SearchIcon, Globe, Loader2, ChevronRight, BookOpen, Layers, Star, BookMarked, Check, TrendingUp, Clock, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAppStore } from '../lib/store'

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
  onSubscribe: (e: React.MouseEvent, provider: string, id: string) => void
  subscribed: string[]
  subscribing: string[]
  navigate: ReturnType<typeof useNavigate>
}) {
  const key = `${r.provider}:${r.id}`
  const isSubscribed = subscribed.includes(key)
  const isSubscribing = subscribing.includes(key)
  return (
    <motion.div
      layout
      key={r.id + r.provider}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(idx * 0.03, 0.4), ease: 'easeOut' }}
      onClick={() => navigate(`/manga/${r.provider}/${encodeURIComponent(r.id)}`)}
      className="group flex gap-5 glass-card p-4 hover:bg-white/[0.08] hover:border-red-500/30 cursor-pointer relative overflow-hidden"
    >
      <div className="w-24 h-32 md:w-28 md:h-36 glass-panel overflow-hidden shrink-0 relative shadow-xl">
        {r.cover_url ? (
          <img
            src={`${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(r.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`}
            alt={r.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 bg-white/[0.02]">
            <BookOpen className="w-8 h-8" />
          </div>
        )}
        <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-[0.15em] font-black text-white/90 border border-white/10 shadow-lg">
          {r.provider}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-gray-100 line-clamp-2 leading-snug md:text-lg group-hover:text-red-400 transition-colors flex-1">
              {r.title}
            </h3>
            {r.anilist_score && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20 shrink-0">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] font-black">{r.anilist_score}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              r.status === 'ongoing' ? 'bg-emerald-400' : 'bg-sky-400'
            )} />
            <span className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {r.status || 'unknown'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 gap-2">
          <button
            onClick={(e) => onSubscribe(e, r.provider, r.id)}
            disabled={isSubscribed || isSubscribing}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
              isSubscribed
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20"
            )}
          >
            {isSubscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : isSubscribed ? <Check className="w-3 h-3" /> : <BookMarked className="w-3 h-3" />}
            {isSubscribed ? 'In Library' : 'Add'}
          </button>
          <div className="p-2 bg-white/5 rounded-xl text-white/20 group-hover:text-white group-hover:bg-red-600 group-hover:shadow-lg transition-all duration-300">
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
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
    hasSearched, setHasSearched
  } = useAppStore()

  const [tab, setTab] = useState<'search' | 'popular' | 'latest'>('search')
  const [loading, setLoading] = useState(false)
  const [subscribing, setSubscribing] = useState<string[]>([])
  const [subscribed, setSubscribed] = useState<string[]>([])
  const [browseProvider, setBrowseProvider] = useState('mangadex')
  const [browseResults, setBrowseResults] = useState<MangaResult[]>([])
  const [browsePage, setBrowsePage] = useState(1)
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseHasMore, setBrowseHasMore] = useState(true)

  // Dynamic source filters
  interface FilterDef { id: string; label: string; type: string; options: { value: string; label: string }[]; default: string }
  const [sourceFilters, setSourceFilters] = useState<FilterDef[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const handleSubscribe = async (e: React.MouseEvent, provider: string, mangaId: string) => {
    e.stopPropagation()
    const key = `${provider}:${mangaId}`
    if (subscribed.includes(key) || subscribing.includes(key)) return
    setSubscribing(prev => [...prev, key])
    try {
      await api.post(`/manga/subscribe/${provider}/${encodeURIComponent(mangaId)}`)
      setSubscribed(prev => [...prev, key])
    } catch {
      alert('Could not add to library.')
    } finally {
      setSubscribing(prev => prev.filter(k => k !== key))
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return
    setLoading(true)
    setHasSearched(false)
    try {
      const manager = ExtensionManager.getInstance()
      if (selectedProvider) {
        const ext = manager.extensions.get(selectedProvider)
        const results = ext ? await ext.search(searchQuery, 1) as MangaResult[] : []
        setSearchResults(results)
      } else {
        // "All" — search every loaded extension in parallel and merge
        const allExts = Array.from(manager.extensions.values())
        const settled = await Promise.allSettled(allExts.map(ext => ext.search(searchQuery, 1) as Promise<MangaResult[]>))
        const merged = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])
        setSearchResults(merged)
      }
      setHasSearched(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBrowse = useCallback(async (provider: string, page: number, endpoint: 'popular' | 'latest') => {
    setBrowseLoading(true)
    try {
      const ext = ExtensionManager.getInstance().extensions.get(provider)
      let data: MangaResult[]
      if (ext) {
        const method = endpoint === 'popular' ? ext.getPopular : ext.getLatest
        if (method) {
          data = await method(page) as MangaResult[]
        } else {
          data = await ext.search('', page) as MangaResult[]
        }
      } else {
        data = []
      }
      setBrowseResults(prev => page === 1 ? data : [...prev, ...data])
      setBrowseHasMore(data.length === 20)
    } catch (err) {
      console.error(err)
      setBrowseHasMore(false)
    } finally {
      setBrowseLoading(false)
    }
  }, [])

  const selectBrowseProvider = (id: string) => {
    setBrowseProvider(id)
    setSourceFilters([])
    setActiveFilters({})
  }

  useEffect(() => {
    if (tab === 'popular' || tab === 'latest') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBrowsePage(1)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBrowseResults([])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBrowseHasMore(true)
      fetchBrowse(browseProvider, 1, tab)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, browseProvider])

  const loadMoreBrowse = () => {
    const nextPage = browsePage + 1
    setBrowsePage(nextPage)
    fetchBrowse(browseProvider, nextPage, tab as 'popular' | 'latest')
  }

  const applyFilters = () => {
    setBrowsePage(1)
    setBrowseResults([])
    setBrowseHasMore(true)
    fetchBrowse(browseProvider, 1, 'popular')
    setShowFilterPanel(false)
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full">
      <header className="mb-10">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Discover Manga
        </h1>
        <p className="text-white/40 font-medium md:text-lg mb-8">Search across multiple sources to find your next read.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/5 pb-4">
          {[
            { id: 'search', label: 'Search', icon: SearchIcon },
            { id: 'popular', label: 'Popular', icon: TrendingUp },
            { id: 'latest', label: 'Latest', icon: Clock },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest border transition-all",
                tab === t.id
                  ? "bg-white/10 border-white/20 text-white shadow-lg"
                  : "border-transparent text-white/40 hover:text-white/60 hover:bg-white/5"
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'search' && (
          <>
            <form onSubmit={handleSearch} className="relative group max-w-2xl mb-8">
              <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-red-500 transition-colors z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, or genre..."
                className="w-full glass-panel py-4 md:py-5 pl-14 pr-32 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-base md:text-lg placeholder:text-white/20 relative z-0"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-5 md:px-7 h-[calc(100%-1rem)] flex items-center gap-2 z-10 text-sm md:text-base"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setSelectedProvider(null)}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                  !selectedProvider
                    ? "bg-white/10 border-white/20 text-white shadow-lg"
                    : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10"
                )}
              >
                <Layers className="w-3 h-3" />
                All
              </button>
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={cn(
                    "px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                    selectedProvider === p.id
                      ? "bg-white/10 border-white/20 text-white shadow-lg"
                      : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        {(tab === 'popular' || tab === 'latest') && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2.5 items-center">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectBrowseProvider(p.id)}
                  className={cn(
                    "px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                    browseProvider === p.id
                      ? "bg-white/10 border-white/20 text-white shadow-lg"
                      : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10"
                  )}
                >
                  {p.name}
                </button>
              ))}
              {tab === 'popular' && sourceFilters.length > 0 && (
                <button
                  onClick={() => setShowFilterPanel(f => !f)}
                  className={cn(
                    "ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                    showFilterPanel
                      ? "bg-red-500/20 border-red-500/30 text-red-400"
                      : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10"
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                </button>
              )}
            </div>

            {/* Dynamic filter panel */}
            {showFilterPanel && tab === 'popular' && sourceFilters.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-panel p-5 border-white/5 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sourceFilters.map(f => (
                    <div key={f.id} className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{f.label}</label>
                      {f.type === 'select' ? (
                        <div className="relative">
                          <select
                            value={activeFilters[f.id] ?? f.default}
                            onChange={e => setActiveFilters(prev => ({ ...prev, [f.id]: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 appearance-none cursor-pointer"
                          >
                            {f.options.map(o => (
                              <option key={o.value} value={o.value} className="bg-neutral-900">{o.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                        </div>
                      ) : f.type === 'multiselect' ? (
                        <div className="flex flex-wrap gap-1.5">
                          {f.options.map(o => {
                            const current = (activeFilters[f.id] ?? f.default).split(',').filter(Boolean)
                            const active = current.includes(o.value)
                            return (
                              <button
                                key={o.value}
                                onClick={() => {
                                  const next = active ? current.filter(v => v !== o.value) : [...current, o.value]
                                  setActiveFilters(prev => ({ ...prev, [f.id]: next.join(',') }))
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                                  active ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-white/5 border-white/5 text-white/30 hover:border-white/10"
                                )}
                              >
                                {o.label}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  onClick={applyFilters}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Apply Filters
                </button>
              </motion.div>
            )}
          </div>
        )}
      </header>

      {tab === 'search' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            selectedProvider ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <AnimatePresence mode="popLayout">
                  {searchResults.map((r, idx) => (
                    <MangaCard key={r.id + r.provider} r={r} idx={idx}
                      onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              // Grouped by provider when searching all sources
              <div className="space-y-10">
                {Object.entries(
                  searchResults.reduce<Record<string, MangaResult[]>>((acc, r) => {
                    ;(acc[r.provider] ??= []).push(r)
                    return acc
                  }, {})
                ).map(([provider, results]) => (
                  <div key={provider}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-black uppercase tracking-[0.25em] text-white/40 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        {provider}
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-xs text-white/20 font-mono">{results.length} result{results.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      <AnimatePresence mode="popLayout">
                        {results.map((r, idx) => (
                          <MangaCard key={r.id + r.provider} r={r} idx={idx}
                            onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : hasSearched ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 glass-panel border-dashed border-white/5"
            >
              <Globe className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No results found</h3>
              <p className="text-white/30 max-w-xs mx-auto text-sm">Couldn't find "{searchQuery}". Try another spelling or provider.</p>
            </motion.div>
          ) : (
            <div className="text-center py-24 text-white/20">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">Type something to search</p>
            </div>
          )}
        </>
      )}

      {(tab === 'popular' || tab === 'latest') && (
        <>
          {browseLoading && browseResults.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
              ))}
            </div>
          ) : browseResults.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                <AnimatePresence mode="popLayout">
                  {browseResults.map((r, idx) => (
                    <MangaCard key={r.id + r.provider} r={r} idx={idx}
                      onSubscribe={handleSubscribe} subscribed={subscribed} subscribing={subscribing} navigate={navigate}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {browseHasMore && (
                <div className="flex justify-center">
                  <button
                    onClick={loadMoreBrowse}
                    disabled={browseLoading}
                    className="flex items-center gap-2 px-8 py-3 glass-panel border-white/10 hover:bg-white/10 transition-all font-bold text-sm uppercase tracking-widest text-white/60 hover:text-white"
                  >
                    {browseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Load More
                  </button>
                </div>
              )}
            </>
          ) : !browseLoading ? (
            <div className="text-center py-24 text-white/20">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No results from {browseProvider}</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

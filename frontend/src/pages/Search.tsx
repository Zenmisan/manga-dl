import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Search as SearchIcon, Globe, Loader2, ChevronRight, BookOpen, Layers, Star, BookMarked, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAppStore } from '../lib/store'

export default function SearchPage() {
  const navigate = useNavigate()
  const {
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    selectedProvider, setSelectedProvider,
    hasSearched, setHasSearched
  } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [subscribing, setSubscribing] = useState<string[]>([])
  const [subscribed, setSubscribed] = useState<string[]>([])

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

  const providers = [
    { id: 'mangadex', name: 'MangaDex' },
    { id: 'asurascans', name: 'Asura Scans' },
    { id: 'mangakatana', name: 'MangaKatana' },
    { id: 'omegascans', name: 'Omega Scans' },
  ]

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return
    setLoading(true)
    setHasSearched(false)
    try {
      const params: any = { q: searchQuery }
      if (selectedProvider) params.provider = selectedProvider
      const res = await api.get('/manga/search', { params })
      setSearchResults(res.data)
      setHasSearched(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full">
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">

          Discover Manga
        </h1>
        <p className="text-white/40 font-medium md:text-lg mb-10">Search across multiple sources to find your next read.</p>
        
        <form onSubmit={handleSearch} className="relative group max-w-2xl">
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

        <div className="flex flex-wrap gap-2.5 mt-8 no-scrollbar">
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
          {providers.map(p => (
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
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {searchResults.map((r, idx) => (
              <motion.div
                layout
                key={r.id + r.provider}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.03, ease: "easeOut" }}
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
                        "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                        r.status === 'ongoing' ? 'bg-emerald-400 shadow-emerald-400/40' : 'bg-sky-400 shadow-sky-400/40'
                      )} />
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/30">
                        {r.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 gap-2">
                    {(() => {
                      const key = `${r.provider}:${r.id}`
                      const isSubscribed = subscribed.includes(key)
                      const isSubscribing = subscribing.includes(key)
                      return (
                        <button
                          onClick={(e) => handleSubscribe(e, r.provider, r.id)}
                          disabled={isSubscribed || isSubscribing}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                            isSubscribed
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20"
                          )}
                        >
                          {isSubscribing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isSubscribed ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <BookMarked className="w-3 h-3" />
                          )}
                          {isSubscribed ? 'In Library' : 'Add'}
                        </button>
                      )
                    })()}
                    <div className="p-2 bg-white/5 rounded-xl text-white/20 group-hover:text-white group-hover:bg-red-600 group-hover:shadow-lg group-hover:shadow-red-600/30 transition-all duration-300">
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : hasSearched && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24 glass-panel border-dashed border-white/5"
        >
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-white/10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No results found</h3>
          <p className="text-white/30 max-w-xs mx-auto text-sm leading-relaxed">
            We couldn't find "{searchQuery}". Try checking your spelling or switching providers.
          </p>
        </motion.div>
      )}
    </div>
  )
}

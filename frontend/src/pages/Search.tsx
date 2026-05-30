import { useState } from 'react'
import api from '../lib/api'
import { Search as SearchIcon, Globe, Loader2, ChevronRight, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MangaResult {
  id: string
  title: string
  cover_url: string | null
  provider: string
  url: string
  status: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MangaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  const providers = [
    { id: 'mangadex', name: 'MangaDex' },
    { id: 'asurascans', name: 'Asura Scans' },
    { id: 'mangakatana', name: 'MangaKatana' },
    { id: 'omegascans', name: 'Omega Scans' },
  ]

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return
    setLoading(true)
    try {
      const params: any = { q: query }
      if (selectedProvider) params.provider = selectedProvider
      const res = await api.get('/manga/search', { params })
      setResults(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Discover Manga</h1>
        <p className="text-gray-400 text-lg mb-8">Search across multiple sources to find your next read.</p>
        
        <form onSubmit={handleSearch} className="relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-red-500 transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or genre..."
            className="w-full bg-[#16161a] border border-[#27272a] rounded-2xl py-4 pl-12 pr-32 focus:outline-none focus:border-red-600/50 focus:ring-4 focus:ring-red-600/5 transition-all text-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 btn-primary py-2 h-[calc(100%-1.5rem)] flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSelectedProvider(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
              !selectedProvider ? "bg-red-600 border-red-600 text-white" : "bg-[#16161a] border-[#27272a] text-gray-400 hover:border-gray-600"
            )}
          >
            All Providers
          </button>
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProvider(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                selectedProvider === p.id ? "bg-red-600 border-red-600 text-white" : "bg-[#16161a] border-[#27272a] text-gray-400 hover:border-gray-600"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-[#16161a] animate-pulse rounded-2xl border border-[#27272a]" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {results.map((r, idx) => (
              <motion.div
                key={r.id + r.provider}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group flex gap-4 bg-[#16161a] p-4 rounded-2xl border border-[#27272a] hover:border-red-600/30 transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-red-600/5"
              >
                <div className="w-24 h-32 bg-[#27272a] rounded-xl overflow-hidden shrink-0 relative">
                  {r.cover_url ? (
                    <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold text-white border border-white/10">
                    {r.provider}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-bold text-gray-100 line-clamp-2 leading-tight mb-1 group-hover:text-red-500 transition-colors">{r.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        r.status === 'ongoing' ? 'bg-green-500' : 'bg-blue-500'
                      )} />
                      <span className="capitalize">{r.status || 'unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                       {/* Placeholder for tags/genres */}
                    </div>
                    <button className="p-2 bg-[#27272a] rounded-lg text-gray-400 group-hover:text-white group-hover:bg-red-600 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : query && (
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-400">No results found for "{query}"</h3>
          <p className="text-gray-600">Try a different provider or check your spelling.</p>
        </div>
      )}
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}

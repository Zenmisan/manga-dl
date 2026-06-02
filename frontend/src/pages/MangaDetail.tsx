import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { 
  ChevronLeft, 
  Download, 
  Clock, 
  User, 
  Tag, 
  Info, 
  CheckCircle2, 
  Loader2,
  ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

interface Chapter {
  id: string
  title: string
  number: number
  published_at: string | null
}

interface MangaDetail {
  id: string
  title: string
  cover_url: string | null
  description: string | null
  status: string | null
  genres: string[]
  authors: string[]
  provider: string
  url: string
  chapters: Chapter[]
}

export default function MangaDetail() {
  const { provider, '*': mangaId } = useParams()
  const navigate = useNavigate()
  const [manga, setManga] = useState<MangaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string[]>([])
  const [showQueueLink, setShowQueueLink] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    const fetchManga = async () => {
      try {
        const res = await api.get(`/manga/${provider}/${mangaId}/`)
        setManga(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchManga()
  }, [provider, mangaId])

  const handleDownload = async (chapterId: string) => {
    if (downloading.includes(chapterId)) return
    setDownloading(prev => [...prev, chapterId])
    try {
      await api.post('/downloads/queue/', {
        provider_id: provider,
        manga_id: mangaId,
        chapter_id: chapterId
      })
      setShowQueueLink(true)
    } catch (err) {
      console.error(err)
    } finally {
      // Keep in "downloading" state for a bit for feedback
      setTimeout(() => {
        setDownloading(prev => prev.filter(id => id !== chapterId))
      }, 1000)
    }
  }

  const handleBulkDownload = async () => {
    if (!manga || bulkLoading) return
    setBulkLoading(true)
    
    // Enqueue in order (oldest to newest usually)
    const chaptersToDownload = [...manga.chapters].reverse()
    
    for (const chapter of chaptersToDownload) {
      try {
        await api.post('/downloads/queue/', {
          provider_id: provider,
          manga_id: mangaId,
          chapter_id: chapter.id
        })
        // 100ms delay to let the UI react and not spam the server too hard
        await new Promise(r => setTimeout(r, 100))
      } catch (err) {
        console.error(`Error queuing ${chapter.title}:`, err)
      }
    }
    
    setBulkLoading(false)
    setShowQueueLink(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    )
  }

  if (!manga) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Manga not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 btn-secondary">Go Back</button>
      </div>
    )
  }

  return (
    <div className="min-h-full pb-20">
      {/* Hero Header */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110"
          style={{ backgroundImage: `url(${manga.cover_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-6 md:p-12 h-full flex items-end">
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-8 left-6 p-3 glass-panel hover:bg-white/10 transition-all text-white shadow-xl z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <AnimatePresence>
            {showQueueLink && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => navigate('/downloads')}
                className="absolute top-8 right-6 flex items-center gap-2 px-5 py-3 glass-panel bg-emerald-500/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-xl z-10 font-bold text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Queue
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-20 md:-mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Cover Art */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-48 md:w-64 shrink-0 mx-auto md:mx-0"
          >
            <div className="aspect-[3/4.5] glass-panel p-2 shadow-2xl">
              <img 
                src={manga.cover_url || ''} 
                alt={manga.title} 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </motion.div>

          {/* Info Content */}
          <div className="flex-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-red-600/10 text-red-500 text-xs font-black uppercase tracking-[0.2em] border border-red-600/20 rounded-lg">
                  {manga.provider}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    manga.status === 'ongoing' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-sky-400'
                  )} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                    {manga.status || 'unknown'}
                  </span>
                </div>
              </div>
              <h1 className="text-3xl md:text-6xl font-black tracking-tighter leading-tight mb-4 text-white">
                {manga.title}
              </h1>
              
              <div className="flex flex-wrap gap-4 text-white/40 mb-8">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{manga.authors.join(', ') || 'Unknown Author'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">{manga.genres.slice(0, 3).join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{manga.chapters.length} Chapters</span>
                </div>
              </div>

              <div className="glass-panel p-6 border-white/5 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Synopsis
                </h3>
                <p className="text-white/60 leading-relaxed line-clamp-4 md:line-clamp-none text-sm md:text-base font-medium">
                  {manga.description || 'No description available for this series.'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Chapters Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-16"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4">
              Chapters
              <span className="text-sm font-mono bg-white/5 px-2 py-1 rounded-lg text-white/20">
                {manga.chapters.length}
              </span>
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={handleBulkDownload}
                disabled={bulkLoading}
                className="btn-secondary py-2 text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download All
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {manga.chapters.map((chapter) => (
              <div 
                key={chapter.id}
                className="group flex items-center justify-between p-4 glass-card hover:bg-white/5 transition-all border-white/5"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white/90 truncate group-hover:text-red-400 transition-colors">
                    {chapter.title}
                  </h4>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                    {chapter.published_at || 'Recently updated'}
                  </p>
                </div>
                
                <button 
                  onClick={() => handleDownload(chapter.id)}
                  disabled={downloading.includes(chapter.id)}
                  className={cn(
                    "p-3 rounded-xl transition-all border shadow-lg",
                    downloading.includes(chapter.id) 
                      ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400 cursor-default"
                      : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-red-600 hover:border-red-600 hover:shadow-red-600/20"
                  )}
                >
                  {downloading.includes(chapter.id) ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

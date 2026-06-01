import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { 
  ChevronLeft, 
  Settings, 
  Download, 
  Loader2,
  Layout,
  FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

export default function Reader() {
  const { mangaTitle, filename } = useParams()
  const navigate = useNavigate()
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [viewMode, setViewMode] = useState<'vertical' | 'paged'>('vertical')
  const [currentPage, setCurrentPage] = useState(1)
  const [localTitle, setLocalTitle] = useState<string | null>(null)

  useEffect(() => {
    const fetchManifest = async () => {
      // --- Handle Local Sessions ---
      if (mangaTitle === 'local') {
        const session = (window as any).__LOCAL_MANGA_SESSION__
        if (session) {
          setLocalTitle(session.title)
          setPages(session.pages)
          setLoading(false)
          return
        }
      }

      // --- Handle Remote Files ---
      try {
        const res = await api.get(`/library/read/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}`)
        setPages(res.data.pages)
        
        // Restore progress if available
        if (res.data.last_page > 0) {
          setTimeout(() => {
            const el = document.getElementById(`page-${res.data.last_page}`)
            if (el) el.scrollIntoView({ behavior: 'auto' })
          }, 800)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchManifest()
    
    // Hide controls after 3 seconds
    const timer = setTimeout(() => setShowControls(false), 3000)
    return () => clearTimeout(timer)
  }, [mangaTitle, filename])

  // Track scroll position to update current page
  useEffect(() => {
    const handleScroll = () => {
      if (viewMode !== 'vertical') return
      
      const elements = pages.map((_, i) => document.getElementById(`page-${i + 1}`))
      const viewportMid = window.innerHeight / 3
      
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i]
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
            setCurrentPage(i + 1)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pages, viewMode])

  // Sync progress to backend
  useEffect(() => {
    if (currentPage <= 1 || loading) return
    const timer = setTimeout(() => {
      api.post(`/library/progress/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}`, {
        page: currentPage
      }).catch(err => console.error('Failed to sync progress:', err))
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [currentPage, mangaTitle, filename, loading])

  const getImageUrl = (pageName: string) => {
    if (mangaTitle === 'local') return pageName
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    return `${base}/library/image/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}/${encodeURIComponent(pageName)}?api_key=${apiKey}`
  }

  const handleDownload = () => {
    if (mangaTitle === 'local') return
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    window.open(`${base}/library/file/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}?api_key=${apiKey}`, '_blank')
  }

  const handleConvertToPdf = () => {
    if (mangaTitle === 'local') return
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    window.open(`${base}/library/pdf/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}?api_key=${apiKey}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs animate-pulse">Opening Archive...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden select-none">
      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1/4 bg-gradient-to-b from-red-600/10 to-transparent" />
      </div>

      {/* Floating Header Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.header 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <div className="max-w-4xl mx-auto glass-panel p-4 flex items-center justify-between shadow-2xl border-white/5">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate(-1)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="min-w-0">
                  <h1 className="font-bold text-sm md:text-base truncate max-w-[150px] md:max-w-md">
                    {mangaTitle === 'local' ? localTitle : mangaTitle}
                  </h1>
                  <p className="text-[10px] md:text-xs font-bold text-white/30 uppercase tracking-tight truncate">
                    {mangaTitle === 'local' ? 'Local Preview' : filename?.replace('.cbz', '')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                   onClick={handleConvertToPdf}
                   className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                   title="Convert to PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode(v => v === 'vertical' ? 'paged' : 'vertical')}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white hidden sm:block"
                >
                  <Layout className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleDownload}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Reader Area */}
      <main 
        className={cn(
          "relative z-10 mx-auto",
          viewMode === 'vertical' ? "max-w-3xl" : "max-w-5xl h-screen flex items-center justify-center"
        )}
        onClick={() => setShowControls(prev => !prev)}
      >
        <div className="flex flex-col">
          {pages.map((page, idx) => (
            <motion.div 
              key={page}
              id={`page-${idx + 1}`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "400px" }}
              className="relative w-full"
            >
              <img 
                src={getImageUrl(page)} 
                alt={`Page ${idx + 1}`}
                className="w-full h-auto"
                loading={idx < 3 ? "eager" : "lazy"}
              />
              {/* Page Number Overlay */}
              <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] font-mono text-white/40">
                {idx + 1} / {pages.length}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-panel px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase flex items-center gap-4">
          <span>Page {currentPage} of {pages.length}</span>
          <span className="w-1 h-1 bg-white/10 rounded-full" />
          <span className="hidden md:inline">Click to toggle UI</span>
        </div>
      </footer>
    </div>
  )
}

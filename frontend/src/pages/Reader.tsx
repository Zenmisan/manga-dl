import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import { 
  ChevronLeft, 
  Settings, 
  Download, 
  Loader2,
  Layout,
  FileText,
  CloudUpload,
  ChevronRight,
  Play
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAppStore } from '../lib/store'

export default function Reader() {
  const { mangaTitle, filename } = useParams()
  const navigate = useNavigate()
  const { readingMode, setReadingMode } = useAppStore()
  
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

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
        const res = await api.get(`/library/read/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}/`)
        setPages(res.data.pages)
        
        if (res.data.last_page > 0) {
          setCurrentPage(res.data.last_page)
          // Default scroll only for webtoon
          if (readingMode === 'webtoon') {
            setTimeout(() => {
              const el = document.getElementById(`page-${res.data.last_page}`)
              if (el) el.scrollIntoView({ behavior: 'auto' })
            }, 800)
          }
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
  }, [mangaTitle, filename, readingMode])

  // Track scroll position in Webtoon mode
  useEffect(() => {
    if (readingMode !== 'webtoon' || loading) return

    const handleScroll = () => {
      const viewportMid = window.innerHeight / 3
      for (let i = 0; i < pages.length; i++) {
        const el = document.getElementById(`page-${i + 1}`)
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
  }, [pages, readingMode, loading])

  // Sync progress to backend
  useEffect(() => {
    if (currentPage <= 1 || loading || mangaTitle === 'local') return
    const timer = setTimeout(() => {
      api.post(`/library/progress/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}/`, {
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

  const handleCloudUpload = async () => {
    if (mangaTitle !== 'local' || uploading) return
    
    const session = (window as any).__LOCAL_MANGA_SESSION__
    if (!session || !session.rawFile) {
      alert("Original file data lost. Please re-upload from dashboard.")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', session.rawFile)

    try {
      await api.post('/library/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0
      })
      alert("Successfully uploaded to cloud library!")
    } catch (err) {
      console.error(err)
      alert("Cloud upload failed. Check backend logs.")
    } finally {
      setUploading(false)
    }
  }

  const nextPage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentPage < pages.length) setCurrentPage(prev => prev + 1)
  }

  const prevPage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentPage > 1) setCurrentPage(prev => prev - 1)
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
            <div className="max-w-5xl mx-auto glass-panel p-4 flex items-center justify-between shadow-2xl border-white/5">
              <div className="flex items-center gap-4 min-w-0">
                <button 
                  onClick={() => navigate(-1)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white shrink-0"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="min-w-0">
                  <h1 className="font-bold text-sm md:text-base truncate">{mangaTitle === 'local' ? localTitle : mangaTitle}</h1>
                  <p className="text-[10px] md:text-xs font-bold text-white/30 uppercase tracking-tight truncate">
                    {mangaTitle === 'local' ? 'Local Preview' : filename?.replace('.cbz', '')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {mangaTitle === 'local' && (
                  <button 
                    onClick={handleCloudUpload}
                    disabled={uploading}
                    className={cn(
                      "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                      uploading ? "bg-white/5 text-white/20 border-white/5" : "bg-red-600/10 border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white"
                    )}
                    title="Upload to Cloud"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                    <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Save to Cloud</span>
                  </button>
                )}
                
                <button 
                   onClick={handleConvertToPdf}
                   className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                   title="Convert to PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setReadingMode(readingMode === 'webtoon' ? 'manga' : 'webtoon')
                  }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                    readingMode === 'manga' ? "bg-white/10 text-white border-white/20" : "text-white/40 border-transparent hover:bg-white/5"
                  )}
                  title={readingMode === 'webtoon' ? "Switch to Manga Mode" : "Switch to Webtoon Mode"}
                >
                  <Layout className="w-5 h-5" />
                  <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{readingMode}</span>
                </button>
                <button 
                  onClick={handleDownload}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Reader Area */}
      <main 
        className={cn(
          "relative z-10 mx-auto transition-all duration-500",
          readingMode === 'webtoon' ? "max-w-3xl" : "max-w-5xl h-screen flex items-center justify-center overflow-hidden"
        )}
        onClick={() => setShowControls(prev => !prev)}
      >
        {readingMode === 'webtoon' ? (
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
                <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] font-mono text-white/40">
                  {idx + 1} / {pages.length}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Paged Manga Mode (LTR) */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Click regions for paging */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={prevPage} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" onClick={nextPage} />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full flex items-center justify-center p-4"
              >
                <img 
                  src={getImageUrl(pages[currentPage - 1])} 
                  alt={`Page ${currentPage}`}
                  className="max-h-full max-w-full object-contain shadow-2xl"
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation Overlays */}
            <div className="absolute bottom-10 right-10 flex gap-4 z-30">
               <button onClick={prevPage} className={cn("p-4 glass-panel hover:bg-white/10 transition-all", currentPage === 1 && "opacity-0 pointer-events-none")}>
                 <ChevronLeft className="w-6 h-6" />
               </button>
               <button onClick={nextPage} className={cn("p-4 glass-panel hover:bg-white/10 transition-all", currentPage === pages.length && "opacity-0 pointer-events-none")}>
                 <ChevronRight className="w-6 h-6" />
               </button>
            </div>
          </div>
        )}
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

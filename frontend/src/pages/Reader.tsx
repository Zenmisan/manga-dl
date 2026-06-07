import { useState, useEffect, useCallback, useRef } from 'react'
import { loadLocalMangaIntoSession } from '../lib/localLibrary'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
  ChevronLeft,
  Download,
  Loader2,
  Layout,
  FileText,
  BookOpen,
  CloudUpload,
  ChevronRight,
  Sparkles,
  Tv2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FastAverageColor } from 'fast-average-color'
import { cn } from '../lib/utils'
import { useAppStore } from '../lib/store'

const fac = new FastAverageColor()

function withOpacity(rgba: string, opacity: number): string {
  return rgba.replace(/[\d.]+\)$/, `${opacity})`)
}

export default function Reader() {
  const { mangaTitle, filename } = useParams()
  const navigate = useNavigate()
  const { readingMode, setReadingMode, upscaling, setUpscaling } = useAppStore()
  
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [nextChapterId, setNextChapterId] = useState<string | null>(null)
  const [ambilightColor, setAmbilightColor] = useState<string>('rgba(0,0,0,0)')
  const [ambilightEnabled, setAmbilightEnabled] = useState(true)
  const malAutoSyncedRef = useRef(false)

  // Auto-track chapter completion on MAL when last page is reached
  useEffect(() => {
    if (
      pages.length === 0 ||
      currentPage !== pages.length ||
      mangaTitle === 'local' ||
      malAutoSyncedRef.current
    ) return

    const malToken = localStorage.getItem('mal-token')
    if (!malToken) return

    malAutoSyncedRef.current = true

    const chapterMatch = filename?.match(/(\d+)/)
    const chaptersRead = chapterMatch ? parseInt(chapterMatch[1], 10) : 0

    const autoSync = async () => {
      try {
        const searchRes = await api.post('/auth/mal/search', { access_token: malToken, query: mangaTitle })
        const results = searchRes.data?.results
        if (!results?.length) return
        await api.post('/auth/mal/track', {
          access_token: malToken,
          manga_id: results[0].id,
          status: 'reading',
          chapters_read: chaptersRead,
        })
      } catch {
        // silent — auto-sync should never interrupt reading
      }
    }

    autoSync()
  }, [currentPage, pages.length, mangaTitle, filename])

  const handlePageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!ambilightEnabled) return
    fac.getColorAsync(e.currentTarget, { algorithm: 'dominant' })
      .then(color => setAmbilightColor(color.rgba))
      .catch(() => {})
  }, [ambilightEnabled])

  useEffect(() => {
    const fetchManifest = async () => {
      // --- Handle Online Streaming ---
      if (mangaTitle === 'online' && filename) {
        const decoded = decodeURIComponent(filename)
        const sepIdx = decoded.indexOf('|')
        const sep2Idx = decoded.indexOf('|', sepIdx + 1)
        const onlineProvider = decoded.slice(0, sepIdx)
        const onlineMangaId = decoded.slice(sepIdx + 1, sep2Idx)
        const onlineChapterId = decoded.slice(sep2Idx + 1)
        const base = api.defaults.baseURL || ''
        const apiKey = localStorage.getItem('manga-api-key') || ''
        try {
          const res = await api.get(
            `/manga/${encodeURIComponent(onlineProvider)}/${encodeURIComponent(onlineMangaId)}/chapters/${encodeURIComponent(onlineChapterId)}/pages`
          )
          const proxyPages: string[] = res.data.pages.map(
            (url: string) => `${base}/manga/image-proxy?url=${encodeURIComponent(url)}&api_key=${apiKey}`
          )
          setPages(proxyPages)
          setLocalTitle(`Online — Ch. ${onlineChapterId}`)
        } catch (err) {
          console.error('Online read failed:', err)
        } finally {
          setLoading(false)
        }
        return
      }

      // --- Handle Local Sessions ---
      if (mangaTitle === 'local') {
        let session = (window as any).__LOCAL_MANGA_SESSION__
        // If window session is missing (e.g. page refresh), reload from IndexedDB
        if (!session && filename) {
          const ok = await loadLocalMangaIntoSession(filename)
          if (ok) session = (window as any).__LOCAL_MANGA_SESSION__
        }
        if (session) {
          setLocalTitle(session.title)
          setPages(session.pages)
          setLoading(false)
          return
        }
        // No session and not in IndexedDB — show error
        setLoading(false)
        return
      }

      // --- Handle Remote Files ---
      try {
        const res = await api.get(`/library/read/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}`)
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

        // Find next chapter for prefetching
        const libraryRes = await api.get(`/library/${encodeURIComponent(mangaTitle || '')}`)
        const files = libraryRes.data.files
        const currentIdx = files.indexOf(filename)
        if (currentIdx !== -1 && currentIdx < files.length - 1) {
          setNextChapterId(files[currentIdx + 1])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchManifest()
    malAutoSyncedRef.current = false

    // Hide controls after 3 seconds
    const timer = setTimeout(() => setShowControls(false), 3000)
    return () => clearTimeout(timer)
  }, [mangaTitle, filename, readingMode])

  // Predictive Prefetching (Smart Binge)
  useEffect(() => {
    if (!nextChapterId || loading || mangaTitle === 'local') return

    const prefetchNext = async () => {
      try {
        const res = await api.get(`/library/read/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(nextChapterId)}`)
        const nextPages = res.data.pages
        // Prefetch first 5 images of next chapter
        nextPages.slice(0, 5).forEach((page: string) => {
          const img = new Image()
          img.src = getImageUrlForChapter(nextChapterId, page)
        })
        console.log('Smart Binge: Prefetched next chapter')
      } catch (err) {
        console.warn('Prefetch failed:', err)
      }
    }

    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        prefetchNext()
        window.removeEventListener('scroll', handleScroll)
      }
    }

    if (readingMode === 'webtoon') {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    } else if (currentPage > pages.length - 2) {
      prefetchNext()
    }
  }, [nextChapterId, currentPage, pages.length, readingMode, loading])

  const getImageUrlForChapter = (targetFilename: string, pageName: string) => {
    if (mangaTitle === 'local') return pageName
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    const url = `${base}/library/image/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(targetFilename)}/${encodeURIComponent(pageName)}?api_key=${apiKey}`
    return upscaling ? `${url}&upscale=true` : url
  }

  const getImageUrl = (pageName: string) => {
    return getImageUrlForChapter(filename || '', pageName)
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

  const handleConvertToEpub = () => {
    if (mangaTitle === 'local') return
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    window.open(`${base}/library/epub/${encodeURIComponent(mangaTitle || '')}/${encodeURIComponent(filename || '')}?api_key=${apiKey}`, '_blank')
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
      await api.post('/library/upload', formData, {
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
      {/* Ambilight Effect */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-700"
        style={ambilightEnabled ? {
          background: `
            radial-gradient(ellipse 100% 30% at 50% 0%, ${withOpacity(ambilightColor, 0.18)} 0%, transparent 100%),
            radial-gradient(ellipse 100% 30% at 50% 100%, ${withOpacity(ambilightColor, 0.18)} 0%, transparent 100%),
            radial-gradient(ellipse 30% 100% at 0% 50%, ${withOpacity(ambilightColor, 0.12)} 0%, transparent 100%),
            radial-gradient(ellipse 30% 100% at 100% 50%, ${withOpacity(ambilightColor, 0.12)} 0%, transparent 100%)
          `
        } : { background: 'none' }}
      />

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
                <button
                  onClick={(e) => { e.stopPropagation(); setAmbilightEnabled(prev => !prev) }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                    ambilightEnabled ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "text-white/40 border-transparent hover:bg-white/5"
                  )}
                  title="Toggle Ambilight"
                >
                  <Tv2 className="w-5 h-5" />
                  <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Ambilight</span>
                </button>
                <button
                   onClick={(e) => {
                     e.stopPropagation()
                     setUpscaling(!upscaling)
                   }}
                   className={cn(
                     "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                     upscaling ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/10" : "text-white/40 border-transparent hover:bg-white/5"
                   )}
                   title={upscaling ? "Disable Upscaling" : "Enable Upscaling (Beta)"}
                >
                  <Sparkles className={cn("w-5 h-5", upscaling && "fill-current animate-pulse")} />
                  <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Enhance</span>
                </button>

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
                  title="Export as PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button
                  onClick={handleConvertToEpub}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                  title="Export as EPUB"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    if (readingMode === 'webtoon') setReadingMode('manga')
                    else if (readingMode === 'manga') setReadingMode('manga-rtl')
                    else setReadingMode('webtoon')
                  }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all border flex items-center gap-2",
                    readingMode !== 'webtoon' ? "bg-white/10 text-white border-white/20" : "text-white/40 border-transparent hover:bg-white/5"
                  )}
                  title={`Current mode: ${readingMode}. Click to switch.`}
                >
                  <Layout className="w-5 h-5" />
                  <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">
                    {readingMode === 'manga-rtl' ? 'RTL' : readingMode}
                  </span>
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
                  crossOrigin="anonymous"
                  onLoad={idx === 0 ? handlePageLoad : undefined}
                />
                <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] font-mono text-white/40">
                  {idx + 1} / {pages.length}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Paged Manga Mode (LTR / RTL) */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Click regions for paging */}
            <div 
              className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" 
              onClick={readingMode === 'manga' ? prevPage : nextPage} 
            />
            <div 
              className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" 
              onClick={readingMode === 'manga' ? nextPage : prevPage} 
            />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: readingMode === 'manga' ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: readingMode === 'manga' ? -40 : 40 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full flex items-center justify-center p-4"
              >
                <img
                  src={getImageUrl(pages[currentPage - 1])}
                  alt={`Page ${currentPage}`}
                  className="max-h-[90dvh] max-w-full object-contain shadow-2xl rounded-sm"
                  crossOrigin="anonymous"
                  onLoad={handlePageLoad}
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation Overlays */}
            <div className="absolute bottom-10 right-10 flex gap-4 z-30">
               <button onClick={readingMode === 'manga' ? prevPage : nextPage} className={cn("p-4 glass-panel hover:bg-white/10 transition-all", ((readingMode === 'manga' && currentPage === 1) || (readingMode === 'manga-rtl' && currentPage === pages.length)) && "opacity-0 pointer-events-none")}>
                 <ChevronLeft className="w-6 h-6" />
               </button>
               <button onClick={readingMode === 'manga' ? nextPage : prevPage} className={cn("p-4 glass-panel hover:bg-white/10 transition-all", ((readingMode === 'manga' && currentPage === pages.length) || (readingMode === 'manga-rtl' && currentPage === 1)) && "opacity-0 pointer-events-none")}>
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

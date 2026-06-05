import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { 
  Book, 
  MoreVertical, 
  LayoutGrid, 
  List, 
  Sparkles,
  ChevronLeft,
  Download,
  FileText,
  Pin,
  PinOff,
  Upload,
  RefreshCw,
  HardDrive,
  Play
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import JSZip from 'jszip'

interface LibraryItem {
  title: string
  files: string[]
  chapters_downloading: number
  chapters_failed: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedManga, setSelectedManga] = useState<LibraryItem | null>(null)
  const [pinnedFiles, setPinnedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLibrary = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res = await api.get('/library')
      setItems(res.data)
    } catch {}
    finally {
      setLoading(false)
      if (showSpinner) setRefreshing(false)
    }
  }

  useEffect(() => {
    setIsDesktop(!!(window as any).__TAURI_INTERNALS__)
    fetchLibrary()

    // Auto-refresh every 5s while any download is active
    const interval = setInterval(() => {
      setItems(prev => {
        const hasActive = prev.some(i => i.chapters_downloading > 0)
        if (hasActive) fetchLibrary()
        return prev
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleScanFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readDir } = await import('@tauri-apps/plugin-fs')

      const selected = await open({
        multiple: false,
        directory: true,
        title: "Select Manga Folder"
      })

      if (!selected) return

      setUploading(true)
      const entries = await readDir(selected)
      const validArchives = entries.filter(e => e.isFile && (e.name.endsWith('.cbz') || e.name.endsWith('.zip')))

      if (validArchives.length === 0) {
        alert("No .cbz or .zip files found in this folder.")
        setUploading(false)
        return
      }

      const folderName = selected.split(/[\\/]/).pop() || 'Local Folder'
      setItems(prev => [{
        title: `[Local] ${folderName}`,
        files: validArchives.map(a => a.name)
      }, ...prev])

      alert(`Successfully scanned ${validArchives.length} archives!`)
    } catch (err: any) {
      console.error('Tauri scan failed:', err)
      alert(`Could not scan folder: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    try {
      // 1. Load ZIP locally
      const zip = await JSZip.loadAsync(file)
      const imageFiles: string[] = []
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
      
      for (const [path, zipFile] of Object.entries(zip.files)) {
        if (!zipFile.dir && validExtensions.some(ext => path.toLowerCase().endsWith(ext))) {
          imageFiles.push(path)
        }
      }

      if (imageFiles.length === 0) throw new Error("No images found in ZIP")

      // 2. Natural Sort (Human-friendly)
      imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

      // 3. Create Blob URLs
      const blobs: string[] = []
      for (const name of imageFiles) {
        const content = await zip.files[name].async('blob')
        blobs.push(URL.createObjectURL(content))
      }

      // 4. Start Local Session
      const mangaTitle = file.name.replace(/\.[^/.]+$/, "")
      const sessionId = `local-${Date.now()}`
      
      ;(window as any).__LOCAL_MANGA_SESSION__ = {
        title: mangaTitle,
        pages: blobs,
        rawFile: file // For manual cloud sync later
      }

      navigate(`/read/local/${sessionId}`)
    } catch (err: any) {
      console.error('Local parsing failed:', err)
      alert(`Could not open: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadFile = (mangaTitle: string, filename: string) => {
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    window.open(`${base}/library/file/${encodeURIComponent(mangaTitle)}/${encodeURIComponent(filename)}?api_key=${apiKey}`, '_blank')
  }

  const handleConvertToPdf = (mangaTitle: string, filename: string) => {
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    window.open(`${base}/library/pdf/${encodeURIComponent(mangaTitle)}/${encodeURIComponent(filename)}?api_key=${apiKey}`, '_blank')
  }

  const togglePin = async (mangaTitle: string, filename: string) => {
    const id = `${mangaTitle}-${filename}`
    const isPinned = pinnedFiles.includes(id)
    setPinnedFiles(prev => isPinned ? prev.filter(f => f !== id) : [...prev, id])
    
    try {
      await api.post(`/library/pin/${encodeURIComponent(mangaTitle)}/${encodeURIComponent(filename)}`)
    } catch (err) {
      console.error('Pin failed:', err)
    }
  }

  if (selectedManga) {
    return (
      <div className="p-6 md:p-12 max-w-5xl mx-auto min-h-full">
        <button 
          onClick={() => setSelectedManga(null)}
          className="mb-8 p-3 glass-panel hover:bg-white/10 transition-all text-white/60 hover:text-white flex items-center gap-2 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Library
        </button>

        <header className="mb-12">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 text-white uppercase">{selectedManga.title}</h1>
          <p className="text-white/30 font-bold uppercase tracking-[0.2em] text-xs">
            {selectedManga.files.length} Chapters Found
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3">
          {selectedManga.files.map((file, idx) => {
            const isPinned = pinnedFiles.includes(`${selectedManga.title}-${file}`)
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                key={file}
                className="group flex items-center justify-between p-5 glass-card hover:bg-white/5 border-white/5 transition-all"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-gray-200 truncate group-hover:text-red-400 transition-colors">
                      {file.replace('.cbz', '')}
                    </h4>
                    {isPinned && <Pin className="w-3 h-3 text-red-500 fill-current" />}
                  </div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Archive</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); togglePin(selectedManga.title, file); }}
                    className={cn(
                      "p-3 rounded-xl transition-all border",
                      isPinned ? "bg-red-500/20 border-red-500/20 text-red-500" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                    )}
                  >
                    {isPinned ? <Pin className="w-5 h-5 fill-current" /> : <PinOff className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleConvertToPdf(selectedManga.title, file); }}
                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-white"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile(selectedManga.title, file); }}
                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-white"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => navigate(`/read/${encodeURIComponent(selectedManga.title)}/${encodeURIComponent(file)}`)}
                    className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Read
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full flex flex-col">
      <AnimatePresence mode="wait">
          <motion.div
            key="library-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent uppercase">
                  Library
                </h1>
                <p className="text-white/40 font-medium md:text-lg">Your personal cloud collection</p>
              </div>

              <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1.5 backdrop-blur-sm">
                <button
                  onClick={() => fetchLibrary(true)}
                  disabled={refreshing}
                  className="p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 px-4 hover:bg-white/5 text-white/40 hover:text-white"
                  title="Refresh library"
                >
                  <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Refresh</span>
                </button>
                {isDesktop && (
                  <button
                    onClick={handleScanFolder}
                    disabled={uploading}
                    className={cn(
                      "p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 px-4",
                      uploading ? "opacity-50 pointer-events-none" : "hover:bg-white/5 text-emerald-400 hover:text-emerald-300"
                    )}
                    title="Scan Local Manga Directory"
                  >
                    {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" /> : <HardDrive className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Scan Folder</span>
                  </button>
                )}
                <label className={cn(
                  "p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 px-4",
                  uploading ? "opacity-50 pointer-events-none" : "hover:bg-white/5 text-white/40 hover:text-white"
                )}>
                  <input type="file" className="hidden" accept=".zip,.cbz" onChange={handleUpload} />
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-red-500" /> : <Upload className="w-4 h-4" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Upload</span>
                </label>
                <div className="w-px h-4 bg-white/10 my-auto mx-1" />
                <button 
                  onClick={() => setView('grid')}
                  className={`p-2.5 rounded-xl transition-all ${view === 'grid' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setView('list')}
                  className={`p-2.5 rounded-xl transition-all ${view === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </header>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-[3/4.5] bg-white/5 animate-pulse rounded-2xl border border-white/5" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-12 glass-panel border-dashed border-white/10 my-12"
              >
                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8">
                  <Book className="w-10 h-10 text-white/10" />
                </div>
                <h2 className="text-2xl font-bold mb-3">No manga found</h2>
                <p className="text-white/40 max-w-sm mb-10 text-sm">
                  Search for something new or upload your local archives.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => navigate('/search')} className="btn-primary flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Browse Catalog
                  </button>
                  <label className="btn-secondary flex items-center justify-center gap-2 cursor-pointer">
                    <input type="file" className="hidden" accept=".zip,.cbz" onChange={handleUpload} />
                    <Upload className="w-4 h-4" />
                    Upload File
                  </label>
                </div>
              </motion.div>
            ) : (
              <div className={view === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8"
                : "space-y-4"
              }>
                {items.map((item, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={item.title}
                    onClick={() => setSelectedManga(item)}
                    className={cn(
                      "group cursor-pointer transition-all",
                      view === 'grid' ? 'block' : 'flex items-center gap-4 glass-card p-4 hover:bg-white/10'
                    )}
                  >
                    {view === 'grid' ? (
                      <>
                        <div className={cn(
                          "aspect-[3/4.5] glass-card overflow-hidden mb-4 relative shadow-2xl",
                          item.chapters_downloading > 0 ? "border-yellow-500/30 hover:border-yellow-500/50" :
                          item.chapters_failed > 0 ? "border-red-500/30 hover:border-red-500/50" :
                          "hover:border-red-500/50"
                        )}>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity flex items-end p-5">
                            <div className="flex flex-col gap-1 translate-y-2 group-hover:translate-y-0 transition-all">
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                {item.chapters_downloading > 0 ? 'Downloading' : item.chapters_failed > 0 ? 'Some Failed' : 'Collected'}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {item.files.length} ch
                                {item.chapters_downloading > 0 && <span className="text-yellow-400"> +{item.chapters_downloading}</span>}
                                {item.chapters_failed > 0 && <span className="text-red-400"> ✗{item.chapters_failed}</span>}
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-full flex items-center justify-center text-white/5 bg-white/[0.01]">
                            {item.chapters_downloading > 0
                              ? <RefreshCw className="w-16 h-16 animate-spin opacity-20" />
                              : <Book className="w-16 h-16" />
                            }
                          </div>
                        </div>
                        <h3 className="font-bold text-base truncate pr-2 group-hover:text-red-400 transition-colors uppercase tracking-tight">{item.title}</h3>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Local Library</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-20 bg-white/5 rounded-xl flex items-center justify-center text-white/20 border border-white/5">
                          {item.chapters_downloading > 0
                            ? <RefreshCw className="w-7 h-7 animate-spin" />
                            : <Book className="w-7 h-7" />
                          }
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg uppercase tracking-tight">{item.title}</h3>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                            {item.files.length} ch
                            {item.chapters_downloading > 0 && <span className="text-yellow-400"> · {item.chapters_downloading} downloading</span>}
                            {item.chapters_failed > 0 && <span className="text-red-400"> · {item.chapters_failed} failed</span>}
                          </p>
                        </div>
                        <button className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
      </AnimatePresence>
    </div>
  )
}

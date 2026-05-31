import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { 
  Book, 
  FolderOpen, 
  MoreVertical, 
  LayoutGrid, 
  List, 
  Sparkles,
  ChevronLeft,
  Play,
  Download,
  FileText,
  Pin,
  PinOff,
  Upload,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

interface LibraryItem {
  title: string
  files: string[]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedManga, setSelectedManga] = useState<LibraryItem | null>(null)
  const [pinnedFiles, setPinnedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.get('/library').then(res => {
      setItems(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
try {
  const response = await api.post('/library/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0, // Disable timeout for large uploads
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        console.log(`Upload Progress: ${percent}%`)
      }
    }
  })
  // Refresh library
  const res = await api.get('/library')
  setItems(res.data)
} catch (err: any) {
  console.error('Upload failed:', err)
  const msg = err.response?.data?.detail || 'Ensure the file is a .zip or .cbz and under the size limit.'
  alert(`Upload failed: ${msg}`)
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
      console.error('Failed to toggle pin:', err)
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
            {selectedManga.files.length} Chapters Downloaded
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
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Local Archive</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(selectedManga.title, file);
                    }}
                    className={cn(
                      "p-3 rounded-xl transition-all border",
                      isPinned 
                        ? "bg-red-500/20 border-red-500/20 text-red-500" 
                        : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                    )}
                    title={isPinned ? "Unpin" : "Pin to prevent auto-deletion"}
                  >
                    {isPinned ? <Pin className="w-5 h-5 fill-current" /> : <PinOff className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvertToPdf(selectedManga.title, file);
                    }}
                    className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    title="Convert to PDF"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadFile(selectedManga.title, file);
                    }}
                    className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 cursor-pointer active:scale-95"
                    title="Download to device"
                  >
                    <Download className="w-5 h-5 pointer-events-none" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/read/${encodeURIComponent(selectedManga.title)}/${encodeURIComponent(file)}`);
                    }}
                    className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current pointer-events-none" />
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
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                  My Library
                </h1>
                <p className="text-white/40 font-medium md:text-lg">Manage your offline manga collection</p>
              </div>

              <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1.5 backdrop-blur-sm self-start md:self-auto">
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
                className="flex-1 flex flex-col items-center justify-center text-center p-8 glass-panel border-dashed border-white/10 my-12"
              >
                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                  <Book className="w-10 h-10 text-white/20" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Your library is empty</h2>
                <p className="text-white/40 max-w-sm mb-10 leading-relaxed">
                  Start by searching for your favorite manga or upload your own local ZIP/CBZ files.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => navigate('/search')}
                    className="btn-primary flex items-center justify-center gap-2 group"
                  >
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    Browse Providers
                  </button>
                  <label className="btn-secondary flex items-center justify-center gap-2 cursor-pointer">
                    <input type="file" className="hidden" accept=".zip,.cbz" onChange={handleUpload} />
                    <Upload className="w-4 h-4" />
                    Upload Local File
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
                    transition={{ delay: idx * 0.04, ease: "easeOut" }}
                    key={item.title}
                    onClick={() => setSelectedManga(item)}
                    className={`group cursor-pointer ${view === 'grid' ? 'block' : 'flex items-center gap-4 glass-card p-4 hover:bg-white/10'}`}
                  >
                    {view === 'grid' ? (
                      <>
                        <div className="aspect-[3/4.5] glass-card overflow-hidden mb-4 relative group shadow-2xl hover:border-red-500/50 hover:shadow-red-500/10">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity flex items-end p-5">
                            <div className="flex flex-col gap-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Offline</span>
                              <span className="text-sm font-bold text-white">
                                {item.files.length} Chapters
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-full flex items-center justify-center text-white/10 bg-white/[0.02]">
                            <Book className="w-16 h-16" />
                          </div>
                        </div>
                        <h3 className="font-bold text-base truncate pr-2 group-hover:text-red-400 transition-colors">{item.title}</h3>
                        <p className="text-xs font-medium text-white/30 uppercase tracking-tighter mt-1">{item.files.length} volumes available</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-20 bg-white/5 rounded-xl flex items-center justify-center text-white/20 border border-white/5">
                          <Book className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{item.title}</h3>
                          <p className="text-sm font-medium text-white/30 uppercase tracking-widest">{item.files.length} items collected</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedManga(item);
                            }}
                          >
                            <FolderOpen className="w-5 h-5" />
                          </button>
                          <button className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
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

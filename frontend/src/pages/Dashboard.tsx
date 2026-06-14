import { useState, useEffect, useMemo } from 'react'
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
  Play,
  Trash2,
  WifiOff,
  SlidersHorizontal,
  BookOpen,
  ArrowUpDown,
  CheckCircle2,
  Square,
  CheckSquare,
  X,
} from 'lucide-react'
import { useAppStore } from '../lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import JSZip from 'jszip'
import { saveLocalManga, getAllLocalManga, deleteLocalManga, loadLocalMangaIntoSession } from '../lib/localLibrary'
import { getReadCount } from '../lib/readTracking'
import { getMangaCategoryList, getCategories } from '../lib/categories'

interface LibraryItem {
  title: string
  files: string[]
  chapters_downloading: number
  chapters_failed: number
  isLocal?: boolean
  localId?: string
  total_chapters?: number
  provider?: string
  provider_manga_id?: string
  subscribed?: boolean
  cover_url?: string | null
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
  const [backendDown, setBackendDown] = useState(false)
  const [sort, setSort] = useState<'default' | 'title-asc' | 'title-desc' | 'downloaded' | 'last-read' | 'unread-count'>('default')
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'downloading' | 'failed' | 'unread' | 'downloaded-only' | 'started' | 'completed'>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const { gridColumns } = useAppStore()
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [categories] = useState(() => getCategories())
  // map of manga title → last read { provider, mangaId, chapterId, mangaTitle, chapterTitle }
  const [lastReadMap, setLastReadMap] = useState<Record<string, { provider: string; mangaId: string; chapterId: string; mangaTitle: string; chapterTitle: string }>>({})
  const [isDragOver, setIsDragOver] = useState(false)

  const fetchHistory = async () => {
    try {
      const res = await api.get('/users/history')
      const map: typeof lastReadMap = {}
      for (const entry of res.data) {
        const key = entry.manga_title?.toLowerCase().trim()
        if (key && !map[key]) {
          map[key] = {
            provider: entry.provider_id,
            mangaId: entry.manga_id,
            chapterId: entry.chapter_id,
            mangaTitle: entry.manga_title,
            chapterTitle: entry.chapter_title ?? '',
          }
        }
      }
      setLastReadMap(map)
    } catch { /* not logged in or backend down — silent */ }
  }

  const fetchLibrary = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res = await api.get('/library')
      setBackendDown(false)
      setItems(res.data)
    } catch {
      setBackendDown(true)
    }
    finally {
      setLoading(false)
      if (showSpinner) setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!('Capacitor' in window)) return
    import('@capacitor/core').then(({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return
      import('@capacitor/app').then(({ App }) => {
        const handle = App.addListener('backButton', () => {
          if (window.confirm('Exit manga-dl?')) App.exitApp()
        })
        return () => { handle.then((h: { remove(): void }) => h.remove()) }
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  // T4: Drag-and-drop CBZ import (Tauri desktop only)
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    import('@tauri-apps/api/event').then(({ listen }) => {
      const unlistenEnter = listen('tauri://drag-enter', () => setIsDragOver(true))
      const unlistenLeave = listen('tauri://drag-leave', () => setIsDragOver(false))
      const unlistenDrop = listen<{ paths: string[] }>('tauri://drag-drop', async ({ payload }) => {
        setIsDragOver(false)
        const cbzPaths = payload.paths.filter(p => p.endsWith('.cbz') || p.endsWith('.zip') || p.endsWith('.epub'))
        for (const filePath of cbzPaths) {
          try {
            const { readFile } = await import('@tauri-apps/plugin-fs')
            const bytes = await readFile(filePath)
            const filename = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown.cbz'
            const file = new File([bytes], filename, { type: 'application/zip' })
            const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
            await handleUpload(fakeEvent)
          } catch (e) {
            console.warn('Drag-drop import failed:', e)
          }
        }
      })
      return () => {
        unlistenEnter.then(fn => fn())
        unlistenLeave.then(fn => fn())
        unlistenDrop.then(fn => fn())
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setIsDesktop(!!(window as any).__TAURI_INTERNALS__)
    fetchLibrary()
    fetchHistory()

    // Load locally stored manga from IndexedDB
    getAllLocalManga().then(localEntries => {
      if (localEntries.length === 0) return
      const localItems: LibraryItem[] = localEntries
        .sort((a, b) => b.addedAt - a.addedAt)
        .map(e => ({
          title: e.title,
          files: [e.filename],
          chapters_downloading: 0,
          chapters_failed: 0,
          isLocal: true,
          localId: e.id,
        }))
      setItems(prev => {
        const existingTitles = new Set(prev.map(i => i.localId).filter(Boolean))
        const newLocals = localItems.filter(i => !existingTitles.has(i.localId))
        return [...newLocals, ...prev]
      })
    }).catch(() => {})

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
        files: validArchives.map(a => a.name),
        chapters_downloading: 0,
        chapters_failed: 0,
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
      const isEpub = file.name.toLowerCase().endsWith('.epub')
      // 1. Load ZIP locally
      const zip = await JSZip.loadAsync(file)
      const imageFiles: string[] = []
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

      if (isEpub) {
        // Parse EPUB: read OPF spine to get ordered image list
        const containerXml = await zip.files['META-INF/container.xml']?.async('text').catch(() => null)
        let opfPath = 'OEBPS/content.opf'
        if (containerXml) {
          const m = containerXml.match(/full-path="([^"]+\.opf)"/)
          if (m) opfPath = m[1]
        }
        const opfContent = await zip.files[opfPath]?.async('text').catch(() => null)
        if (opfContent) {
          // Extract image hrefs from manifest
          const itemMatches = [...opfContent.matchAll(/href="([^"]+)"/g)]
          const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
          for (const m of itemMatches) {
            const href = m[1]
            if (validExtensions.some(ext => href.toLowerCase().endsWith(ext))) {
              const fullPath = href.startsWith('/') ? href.slice(1) : opfDir + href
              if (zip.files[fullPath]) imageFiles.push(fullPath)
            }
          }
        }
        if (imageFiles.length === 0) {
          // Fallback: all images in epub
          for (const [path, zipFile] of Object.entries(zip.files)) {
            if (!zipFile.dir && validExtensions.some(ext => path.toLowerCase().endsWith(ext))) imageFiles.push(path)
          }
        }
      } else {
        for (const [path, zipFile] of Object.entries(zip.files)) {
          if (!zipFile.dir && validExtensions.some(ext => path.toLowerCase().endsWith(ext))) {
            imageFiles.push(path)
          }
        }
      }

      if (imageFiles.length === 0) throw new Error("No images found in archive")

      // 2. Natural Sort (Human-friendly)
      imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

      // 3. Create Blob URLs
      const blobs: string[] = []
      for (const name of imageFiles) {
        const content = await zip.files[name].async('blob')
        blobs.push(URL.createObjectURL(content))
      }

      // 4. Persist to IndexedDB so it survives page refresh
      const mangaTitle = file.name.replace(/\.[^/.]+$/, "")
      const localId = `local-${Date.now()}`

      await saveLocalManga({
        id: localId,
        title: mangaTitle,
        filename: file.name,
        fileSize: file.size,
        addedAt: Date.now(),
        file: file,
      })

      // Add to library state
      setItems(prev => [{
        title: mangaTitle,
        files: [file.name],
        chapters_downloading: 0,
        chapters_failed: 0,
        isLocal: true,
        localId,
      }, ...prev.filter(i => i.localId !== localId)])

      // Start session and navigate
      ;(window as any).__LOCAL_MANGA_SESSION__ = {
        title: mangaTitle,
        pages: blobs,
        rawFile: file,
        localId,
      }

      navigate(`/read/local/${localId}`)
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

  const displayedItems = useMemo(() => {
    let result = [...items]
    if (filter === 'subscribed') result = result.filter(i => i.subscribed)
    else if (filter === 'downloading') result = result.filter(i => i.chapters_downloading > 0)
    else if (filter === 'failed') result = result.filter(i => i.chapters_failed > 0)
    else if (filter === 'unread') result = result.filter(i => {
      const read = getReadCount(i.provider ?? '', i.provider_manga_id ?? '')
      const total = i.total_chapters ?? i.files.length
      return total > read
    })
    else if (filter === 'downloaded-only') result = result.filter(i => i.files.length > 0 && !i.isLocal)
    else if (filter === 'started') result = result.filter(i => {
      const read = getReadCount(i.provider ?? '', i.provider_manga_id ?? '')
      return read > 0
    })
    else if (filter === 'completed') result = result.filter(i => {
      const read = getReadCount(i.provider ?? '', i.provider_manga_id ?? '')
      const total = i.total_chapters ?? i.files.length
      return total > 0 && read >= total
    })
    if (activeCategory) {
      result = result.filter(i => getMangaCategoryList(i.title).includes(activeCategory))
    }
    if (sort === 'title-asc') result.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'title-desc') result.sort((a, b) => b.title.localeCompare(a.title))
    else if (sort === 'downloaded') result.sort((a, b) => b.files.length - a.files.length)
    else if (sort === 'last-read') {
      result.sort((a, b) => {
        const aHas = !!lastReadMap[a.title.toLowerCase().trim()]
        const bHas = !!lastReadMap[b.title.toLowerCase().trim()]
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        return 0
      })
    }
    else if (sort === 'unread-count') {
      result.sort((a, b) => {
        const aUnread = (a.total_chapters ?? a.files.length) - getReadCount(a.provider ?? '', a.provider_manga_id ?? '')
        const bUnread = (b.total_chapters ?? b.files.length) - getReadCount(b.provider ?? '', b.provider_manga_id ?? '')
        return bUnread - aUnread
      })
    }
    return result
  }, [items, sort, filter, activeCategory, lastReadMap])

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
                    onClick={async () => {
                      if (selectedManga.isLocal && selectedManga.localId) {
                        const ok = await loadLocalMangaIntoSession(selectedManga.localId)
                        if (!ok) { alert('File not found. Please re-upload.'); return }
                        navigate(`/read/local/${selectedManga.localId}`)
                      } else {
                        navigate(`/read/${encodeURIComponent(selectedManga.title)}/${encodeURIComponent(file)}`)
                      }
                    }}
                    className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Read
                  </button>
                  {selectedManga.isLocal && selectedManga.localId && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await deleteLocalManga(selectedManga.localId!)
                        setItems(prev => prev.filter(i => i.localId !== selectedManga.localId))
                        setSelectedManga(null)
                      }}
                      className="p-3 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-red-400 hover:border-red-500/20"
                      title="Remove from local library"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full flex flex-col relative">
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm border-4 border-dashed border-blue-400/60 pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-black text-blue-400">Drop CBZ to import</p>
            <p className="text-sm text-white/40 mt-2">.cbz, .zip and .epub files supported</p>
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
          <motion.div
            key="library-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {backendDown && (
              <div className="mb-6 flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Backend unreachable</p>
                  {!!(window as any).__TAURI_INTERNALS__ ? (
                    <p className="text-xs text-amber-300/70 mt-0.5">Desktop app requires Python 3.10+ in PATH. Install Python, then restart the app. Or set a custom backend URL in Settings.</p>
                  ) : (
                    <p className="text-xs text-amber-300/70 mt-0.5">Server may be starting up (cold start takes ~30s). Check Settings → API Key and Backend URL, then tap Refresh.</p>
                  )}
                </div>
              </div>
            )}
            {/* Category tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setActiveCategory(null)}
                className={cn("px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all shrink-0",
                  !activeCategory ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/30 hover:border-white/10"
                )}
              >All</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={cn("px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all shrink-0",
                    activeCategory === cat ? "bg-red-500/20 border-red-500/30 text-red-400" : "border-white/5 text-white/30 hover:border-white/10"
                  )}
                >{cat}</button>
              ))}
            </div>

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
                  <input type="file" className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} />
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-red-500" /> : <Upload className="w-4 h-4" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Upload</span>
                </label>
                <div className="w-px h-4 bg-white/10 my-auto mx-1" />
                <button
                  onClick={() => setShowSortPanel(p => !p)}
                  className={cn("p-2.5 rounded-xl transition-all flex items-center gap-2", showSortPanel || sort !== 'default' || filter !== 'all' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}
                  title="Sort & Filter"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
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
                <div className="w-px h-4 bg-white/10 my-auto mx-1" />
                <button
                  onClick={() => { setSelectMode(p => !p); setSelectedItems(new Set()) }}
                  title="Select multiple"
                  className={cn("p-2.5 rounded-xl transition-all", selectMode ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/60")}
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Batch action bar */}
            {selectMode && (
              <div className="mb-4 flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-bold text-blue-400">{selectedItems.size} selected</span>
                <button
                  onClick={() => setSelectedItems(new Set(displayedItems.map(i => i.title)))}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors"
                >Select All</button>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors"
                >Clear</button>
                <div className="flex-1" />
                {selectedItems.size > 0 && (
                  <>
                    <button
                      onClick={async () => {
                        if (!confirm(`Download all chapters for ${selectedItems.size} manga?`)) return
                        for (const title of selectedItems) {
                          const item = items.find(i => i.title === title)
                          if (!item?.provider || !item.provider_manga_id) continue
                          try {
                            await api.post('/downloads/queue-manga', { provider: item.provider, manga_id: item.provider_manga_id })
                          } catch {}
                        }
                        setSelectMode(false); setSelectedItems(new Set())
                        alert(`Queued downloads for ${selectedItems.size} manga`)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Remove ${selectedItems.size} manga from library?`)) return
                        for (const title of selectedItems) {
                          const item = items.find(i => i.title === title)
                          if (!item) continue
                          if (item.isLocal && item.localId) {
                            await deleteLocalManga(item.localId).catch(() => {})
                          } else {
                            await api.delete(`/library/${encodeURIComponent(title)}`).catch(() => {})
                          }
                        }
                        setItems(prev => prev.filter(i => !selectedItems.has(i.title)))
                        setSelectMode(false); setSelectedItems(new Set())
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                    <select
                      defaultValue=""
                      onChange={async (e) => {
                        const cat = e.target.value
                        if (!cat) return
                        for (const title of selectedItems) {
                          const raw = JSON.parse(localStorage.getItem('manga-dl-manga-categories') || '{}')
                          const cats: string[] = raw[title] || []
                          if (!cats.includes(cat)) { raw[title] = [...cats, cat]; localStorage.setItem('manga-dl-manga-categories', JSON.stringify(raw)) }
                        }
                        setSelectMode(false); setSelectedItems(new Set())
                        e.target.value = ''
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold"
                    >
                      <option value="">Move to Category…</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </>
                )}
                <button onClick={() => { setSelectMode(false); setSelectedItems(new Set()) }}>
                  <X className="w-4 h-4 text-white/40 hover:text-white" />
                </button>
              </div>
            )}

            {/* Sort / Filter Panel */}
            {showSortPanel && (
              <div className="mb-6 p-4 glass-panel border-white/5 flex flex-wrap gap-6 items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 flex items-center gap-1.5"><ArrowUpDown className="w-3 h-3" />Sort</p>
                  <div className="flex gap-2 flex-wrap">
                    {([['default','Default'],['title-asc','A → Z'],['title-desc','Z → A'],['downloaded','Most Downloaded'],['last-read','Last Read'],['unread-count','Most Unread']] as const).map(([v, label]) => (
                      <button key={v} onClick={() => setSort(v)}
                        className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                          sort === v ? "bg-white/10 text-white border-white/20" : "text-white/30 border-white/10 hover:border-white/20"
                        )}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />Filter</p>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      ['all','All'],['subscribed','Subscribed'],['downloading','Downloading'],['failed','Has Errors'],
                      ['unread','Has Unread'],['downloaded-only','Downloaded'],['started','Started'],['completed','Completed'],
                    ] as const).map(([v, label]) => (
                      <button key={v} onClick={() => setFilter(v)}
                        className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                          filter === v ? "bg-red-500/20 text-red-400 border-red-500/30" : "text-white/30 border-white/10 hover:border-white/20"
                        )}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                {(sort !== 'default' || filter !== 'all') && (
                  <button onClick={() => { setSort('default'); setFilter('all') }}
                    className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all px-3 py-1 border border-white/5 rounded-lg self-end"
                  >Reset</button>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid gap-4 md:gap-8" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-[3/4.5] bg-white/5 animate-pulse rounded-2xl border border-white/5" />
                ))}
              </div>
            ) : displayedItems.length === 0 && items.length > 0 ? (
              <div className="text-center py-20 text-white/30">
                <SlidersHorizontal className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="font-bold uppercase tracking-widest text-xs">No manga match this filter</p>
                <button onClick={() => { setSort('default'); setFilter('all') }} className="mt-4 text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-widest">Clear filters</button>
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
                    <input type="file" className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} />
                    <Upload className="w-4 h-4" />
                    Upload File
                  </label>
                </div>
              </motion.div>
            ) : (
              <div
                className={view === 'grid' ? "grid gap-4 md:gap-8" : "space-y-4"}
                style={view === 'grid' ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` } : undefined}
              >
                {displayedItems.map((item, idx) => {
                  const lastRead = lastReadMap[item.title.toLowerCase().trim()]
                  return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={item.title}
                    onClick={() => {
                      if (selectMode) {
                        setSelectedItems(prev => {
                          const n = new Set(prev)
                          n.has(item.title) ? n.delete(item.title) : n.add(item.title)
                          return n
                        })
                      } else {
                        setSelectedManga(item)
                      }
                    }}
                    className={cn(
                      "group cursor-pointer transition-all relative",
                      view === 'grid' ? 'block' : 'flex items-center gap-4 glass-card p-4 hover:bg-white/10',
                      selectMode && selectedItems.has(item.title) && 'ring-2 ring-blue-500 rounded-2xl'
                    )}
                  >
                    {selectMode && view === 'grid' && (
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        {selectedItems.has(item.title)
                          ? <CheckSquare className="w-5 h-5 text-blue-400 drop-shadow-lg" />
                          : <Square className="w-5 h-5 text-white/40 drop-shadow-lg" />
                        }
                      </div>
                    )}
                    {view === 'grid' ? (
                      <>
                        <div className={cn(
                          "aspect-[3/4.5] glass-card overflow-hidden mb-4 relative shadow-2xl",
                          item.chapters_downloading > 0 ? "border-yellow-500/30 hover:border-yellow-500/50" :
                          item.chapters_failed > 0 ? "border-red-500/30 hover:border-red-500/50" :
                          "hover:border-red-500/50"
                        )}>
                          {item.cover_url ? (
                            <img
                              src={`${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(item.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              loading="lazy"
                            />
                          ) : (
                            <></>
                          )}
                          {/* Unread badge */}
                          {(() => {
                            if (!item.provider || !item.provider_manga_id || !item.total_chapters) return null
                            const unread = item.total_chapters - getReadCount(item.provider, item.provider_manga_id)
                            if (unread <= 0) return null
                            return (
                              <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black leading-tight shadow-lg shadow-red-600/30">
                                {unread > 99 ? '99+' : unread}
                              </div>
                            )
                          })()}
                          {!item.cover_url && (
                            <div className="w-full h-full flex items-center justify-center text-white/5 bg-white/[0.01]">
                              {item.chapters_downloading > 0
                                ? <RefreshCw className="w-16 h-16 animate-spin opacity-20" />
                                : <Book className="w-16 h-16" />
                              }
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <div className="flex flex-col gap-1 translate-y-2 group-hover:translate-y-0 transition-all w-full">
                              <span className="text-sm font-bold text-white">
                                {item.files.length} ch
                                {item.chapters_downloading > 0 && <span className="text-yellow-400"> +{item.chapters_downloading}</span>}
                                {item.chapters_failed > 0 && <span className="text-red-400"> ✗{item.chapters_failed}</span>}
                              </span>
                              {lastRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const param = encodeURIComponent(`${lastRead.provider}|${lastRead.mangaId}|${lastRead.chapterId}|${lastRead.mangaTitle}|${lastRead.chapterTitle}`)
                                    navigate(`/read/online/${param}`)
                                  }}
                                  className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-red-600/80 hover:bg-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all w-fit"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  Continue
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <h3 className="font-bold text-base truncate pr-2 group-hover:text-red-400 transition-colors uppercase tracking-tight">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.files.length > 0 && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-white/30">
                              {item.files.length}{item.total_chapters ? `/${item.total_chapters}` : ''} ch
                            </span>
                          )}
                          {item.subscribed && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                              Subscribed
                            </span>
                          )}
                          {(() => {
                            if (!item.provider || !item.provider_manga_id || !item.total_chapters) return null
                            const readCount = getReadCount(item.provider, item.provider_manga_id)
                            const unread = item.total_chapters - readCount
                            if (unread <= 0) return null
                            return (
                              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">
                                {unread} new
                              </span>
                            )
                          })()}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-20 bg-white/5 rounded-xl flex items-center justify-center text-white/20 border border-white/5 overflow-hidden shrink-0">
                          {item.cover_url ? (
                            <img
                              src={`${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(item.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : item.chapters_downloading > 0 ? (
                            <RefreshCw className="w-7 h-7 animate-spin" />
                          ) : (
                            <Book className="w-7 h-7" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg uppercase tracking-tight">{item.title}</h3>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                            {item.files.length}{item.total_chapters ? `/${item.total_chapters}` : ''} ch downloaded
                            {item.subscribed && <span className="text-emerald-400"> · subscribed</span>}
                            {item.chapters_downloading > 0 && <span className="text-yellow-400"> · {item.chapters_downloading} downloading</span>}
                            {item.chapters_failed > 0 && <span className="text-red-400"> · {item.chapters_failed} failed</span>}
                            {(() => {
                              if (!item.provider || !item.provider_manga_id || !item.total_chapters) return null
                              const rc = getReadCount(item.provider, item.provider_manga_id)
                              const unread = item.total_chapters - rc
                              if (unread <= 0) return null
                              return <span className="text-blue-400"> · {unread} unread</span>
                            })()}
                          </p>
                          {lastRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const param = encodeURIComponent(`${lastRead.provider}|${lastRead.mangaId}|${lastRead.chapterId}|${lastRead.mangaTitle}|${lastRead.chapterTitle}`)
                                navigate(`/read/online/${param}`)
                              }}
                              className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400 transition-all"
                            >
                              <BookOpen className="w-3 h-3" />
                              Continue reading
                            </button>
                          )}
                        </div>
                        <button className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white shrink-0">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                )})}
              </div>
            )}
          </motion.div>
      </AnimatePresence>
    </div>
  )
}

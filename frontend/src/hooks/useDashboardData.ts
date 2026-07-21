import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useLibrary, useHistory, QK } from '../lib/queries'
import api from '../lib/api'
import { useAppStore } from '../lib/store'
import { saveLocalManga, getAllLocalManga, deleteLocalManga, type LocalMangaEntry } from '../lib/localLibrary'
import { getReadCount } from '../lib/readTracking'
import { getMangaCategoryList, getCategories } from '../lib/categories'
import { supabase } from '../lib/supabase'

export interface LibraryItem {
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

function buildLocalMangaEntry(file: File): LocalMangaEntry {
  const title = file.name.replace(/\.(cbz|zip|epub)$/i, '')
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    filename: file.name,
    fileSize: file.size,
    addedAt: Date.now(),
    file,
  }
}

export type LastReadEntry = { provider: string; mangaId: string; chapterId: string; mangaTitle: string; chapterTitle: string }

export function useDashboardData() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: libraryRaw, isLoading: loading, isFetching: refreshing, isError: backendDown, refetch: refetchLibrary } = useLibrary()
  const { data: historyRaw } = useHistory()
  const backendDownRef = useRef(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedManga, setSelectedManga] = useState<LibraryItem | null>(null)
  const [pinnedFiles, setPinnedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [sort, setSort] = useState<'default' | 'title-asc' | 'title-desc' | 'downloaded' | 'last-read' | 'unread-count'>('default')
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'downloading' | 'failed' | 'unread' | 'downloaded-only' | 'started' | 'completed'>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const { gridColumns } = useAppStore()
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [categories] = useState(() => getCategories())
  const [localItems, setLocalItems] = useState<LibraryItem[]>([])
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const isAdmin = userEmail === 'zenmisan@gmail.com'

  const items = useMemo<LibraryItem[]>(() => {
    const backend = (libraryRaw as LibraryItem[] ?? []).map(item => ({
      ...item,
      title: item.title ?? '',
      files: item.files ?? [],
      chapters_downloading: item.chapters_downloading ?? 0,
      chapters_failed: item.chapters_failed ?? 0,
    }))
    return [...localItems, ...backend]
  }, [libraryRaw, localItems])

  const lastReadMap = useMemo<Record<string, LastReadEntry>>(() => {
    const map: Record<string, LastReadEntry> = {}
    for (const entry of (historyRaw ?? []) as Array<{ manga_title?: string; provider_id: string; manga_id: string; chapter_id: string; chapter_title?: string }>) {
      const key = entry.manga_title?.toLowerCase().trim()
      if (key && !map[key]) {
        map[key] = {
          provider: entry.provider_id,
          mangaId: entry.manga_id,
          chapterId: entry.chapter_id,
          mangaTitle: entry.manga_title ?? '',
          chapterTitle: entry.chapter_title ?? '',
        }
      }
    }
    return map
  }, [historyRaw])

  useEffect(() => {
    backendDownRef.current = backendDown
    if (!backendDown) setBannerDismissed(false)
  }, [backendDown])

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    setUploading(true)

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]

      if (backendDownRef.current) {
        try {
          const entry = buildLocalMangaEntry(file)
          await saveLocalManga(entry)
          const newItem: LibraryItem = {
            title: entry.title,
            files: [entry.filename],
            chapters_downloading: 0,
            chapters_failed: 0,
            isLocal: true,
            localId: entry.id,
          }
          setLocalItems(prev => [newItem, ...prev.filter(x => x.localId !== entry.id)])
        } catch (err) {
          alert(`Failed to save ${file.name} locally: ${err instanceof Error ? err.message : String(err)}`)
        }
        continue
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        alert(`Failed to upload ${file.name}: ${msg || 'Check network / server logs.'}`)
      }
    }

    setUploading(false)
    if (!backendDownRef.current) {
      refetchLibrary()
    }
  }

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
    setIsDesktop(!!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__)

    getAllLocalManga().then(localEntries => {
      if (localEntries.length === 0) return
      const localItemsList: LibraryItem[] = localEntries
        .sort((a, b) => b.addedAt - a.addedAt)
        .map(e => ({
          title: e.title,
          files: [e.filename],
          chapters_downloading: 0,
          chapters_failed: 0,
          isLocal: true,
          localId: e.id,
        }))
      setLocalItems(localItemsList)
    }).catch(() => {})

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email || null)
    })

    const interval = setInterval(() => {
      const hasActive = (queryClient.getQueryData(QK.library) as LibraryItem[] | undefined)
        ?.some(i => i.chapters_downloading > 0)
      if (hasActive || backendDownRef.current) {
        queryClient.invalidateQueries({ queryKey: QK.library })
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [queryClient])

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
      
      let importedCount = 0
      for (const entry of validArchives) {
        const fullPath = `${selected}/${entry.name}`
        try {
          const { readFile } = await import('@tauri-apps/plugin-fs')
          const bytes = await readFile(fullPath)
          const file = new File([bytes], entry.name, { type: 'application/zip' })
          const localEntry = buildLocalMangaEntry(file)
          await saveLocalManga(localEntry)
          setLocalItems(prev => [{
            title: localEntry.title,
            files: [localEntry.filename],
            chapters_downloading: 0,
            chapters_failed: 0,
            isLocal: true,
            localId: localEntry.id,
          }, ...prev])
          importedCount++
        } catch (e) {
          console.warn(`Failed to import ${entry.name}:`, e)
        }
      }
      setUploading(false)
      alert(`Imported ${importedCount} local manga archive(s) into your session library.`)
    } catch (e) {
      setUploading(false)
      console.error('Scan folder failed:', e)
    }
  }

  const handleDeleteItem = async (item: LibraryItem) => {
    if (!window.confirm(`Remove "${item.title}" from your library?`)) return
    if (item.isLocal && item.localId) {
      await deleteLocalManga(item.localId)
      setLocalItems(prev => prev.filter(i => i.localId !== item.localId))
    } else if (item.provider && item.provider_manga_id) {
      try {
        await api.delete(`/subscriptions/${item.provider}/${item.provider_manga_id}`)
        refetchLibrary()
      } catch {
        alert('Failed to remove item.')
      }
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!window.confirm(`Remove ${selectedItems.size} selected item(s)?`)) return
    for (const title of selectedItems) {
      const item = items.find(i => i.title === title)
      if (item) {
        if (item.isLocal && item.localId) {
          await deleteLocalManga(item.localId)
          setLocalItems(prev => prev.filter(i => i.localId !== item.localId))
        } else if (item.provider && item.provider_manga_id) {
          try {
            await api.delete(`/subscriptions/${item.provider}/${item.provider_manga_id}`)
          } catch { /* ignore */ }
        }
      }
    }
    setSelectedItems(new Set())
    setSelectMode(false)
    refetchLibrary()
  }

  const togglePin = (title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedFiles(prev => {
      const next = prev.includes(title) ? prev.filter(f => f !== title) : [...prev, title]
      localStorage.setItem('manga-dl-pinned', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('manga-dl-pinned')
      if (stored) setPinnedFiles(JSON.parse(stored))
    } catch { /* non-fatal */ }
  }, [])

  const displayedItems = useMemo(() => {
    let list = items

    if (activeCategory) {
      list = list.filter(i => getMangaCategoryList(i.title).includes(activeCategory))
    }

    if (filter === 'subscribed') list = list.filter(i => i.subscribed)
    else if (filter === 'downloading') list = list.filter(i => i.chapters_downloading > 0)
    else if (filter === 'failed') list = list.filter(i => i.chapters_failed > 0)
    else if (filter === 'downloaded-only') list = list.filter(i => i.files.length > 0)
    else if (filter === 'unread') list = list.filter(i => {
      const read = getReadCount(i.provider || '', i.provider_manga_id || '')
      return (i.total_chapters || i.files.length) - read > 0
    })
    else if (filter === 'started') list = list.filter(i => {
      const read = getReadCount(i.provider || '', i.provider_manga_id || '')
      return read > 0
    })
    else if (filter === 'completed') list = list.filter(i => {
      const total = i.total_chapters || i.files.length
      const read = getReadCount(i.provider || '', i.provider_manga_id || '')
      return total > 0 && read >= total
    })

    const pinned = list.filter(i => pinnedFiles.includes(i.title))
    const unpinned = list.filter(i => !pinnedFiles.includes(i.title))

    const sortFn = (a: LibraryItem, b: LibraryItem) => {
      switch (sort) {
        case 'title-asc': return a.title.localeCompare(b.title)
        case 'title-desc': return b.title.localeCompare(a.title)
        case 'downloaded': return b.files.length - a.files.length
        case 'unread-count': {
          const unreadA = (a.total_chapters || a.files.length) - getReadCount(a.provider || '', a.provider_manga_id || '')
          const unreadB = (b.total_chapters || b.files.length) - getReadCount(b.provider || '', b.provider_manga_id || '')
          return unreadB - unreadA
        }
        default: return 0
      }
    }

    return [...pinned.sort(sortFn), ...unpinned.sort(sortFn)]
  }, [items, activeCategory, filter, pinnedFiles, sort])

  return {
    navigate, queryClient, libraryRaw, loading, refreshing, backendDown, refetchLibrary,
    historyRaw, view, setView, selectedManga, setSelectedManga, pinnedFiles,
    uploading, isDesktop, sort, setSort, filter, setFilter, selectMode, setSelectMode,
    selectedItems, setSelectedItems, gridColumns, showSortPanel, setShowSortPanel,
    activeCategory, setActiveCategory, categories, localItems, bannerDismissed,
    setBannerDismissed, isDragOver, isAdmin, items, lastReadMap, handleUpload,
    handleScanFolder, handleDeleteItem, handleBulkDelete, togglePin, displayedItems,
  }
}

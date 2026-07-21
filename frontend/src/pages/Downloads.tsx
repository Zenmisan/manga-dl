import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Download as DownloadIcon, CheckCircle2, XCircle, Pause, Play, Trash2, FolderOpen, Activity, X, RotateCcw, HardDrive } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { Capacitor } from '@capacitor/core'
import { fetchCbzAsBase64, saveToDeviceStorage, getCbzUrl } from '../lib/nativeDownload'
import { supabase } from '../lib/supabase'


interface DownloadItem {
  id: string
  provider: string
  manga_title: string
  chapter_title: string
  status: 'queued' | 'downloading' | 'done' | 'failed'
  progress: number
  downloaded_pages: number
  total_pages: number
  output_path?: string
  error?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTauri = !!(window as any).__TAURI_INTERNALS__

async function revealFile(outputPath: string | undefined) {
  if (!outputPath || !isTauri) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('reveal_in_file_manager', { path: outputPath })
  } catch (e) {
    console.warn('reveal_in_file_manager failed:', e)
  }
}

const isNative = Capacitor.isNativePlatform()

export default function DownloadsPage() {
  const [active, setActive] = useState<DownloadItem[]>([])
  const [history, setHistory] = useState<DownloadItem[]>([])
  const [paused, setPaused] = useState(false)
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [savingToDevice, setSavingToDevice] = useState<Set<string>>(new Set())
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  
  const isAdmin = userEmail === 'zenmisan@gmail.com'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null)
      setLoadingSession(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email || null)
      setLoadingSession(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loadingSession || !isAdmin) return

    const fetchData = async () => {
      try {
        const [activeRes, historyRes] = await Promise.all([
          api.get('/downloads/active'),
          api.get('/downloads/history')
        ])
        setActive(activeRes.data)
        setHistory(historyRes.data)
      } catch (err) {
        console.error(err)
      }
    }

    fetchData()
    api.get('/downloads/queue-status').then(res => setPaused(res.data.paused)).catch(() => {})

    // Setup WebSocket for real-time updates
    const getWsUrl = () => {
      const apiKey = localStorage.getItem('manga-api-key') || ''
      // Get the base API URL (e.g., https://manga-dl.onrender.com/api)
      const apiBase = api.defaults.baseURL || ''
      
      let wsBase: string
      if (apiBase.startsWith('http')) {
        // Production: convert https://.../api to wss://.../api/downloads/ws
        wsBase = apiBase.replace(/^http/, 'ws') + '/downloads/ws'
      } else {
        // Local dev: assume relative path or localhost
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host.includes('localhost') ? 'localhost:8000' : window.location.host
        wsBase = `${protocol}//${host}/api/downloads/ws`
      }
      
      return `${wsBase}?api_key=${apiKey}`
    }

    const ws = new WebSocket(getWsUrl())
    
    ws.onopen = () => console.log('WebSocket connected to backend')
    ws.onerror = (err) => console.error('WebSocket error:', err)
    ws.onclose = () => console.log('WebSocket disconnected')

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'progress' || data.type === 'started' || data.type === 'queued') {
        setActive(prev => {
          const idx = prev.findIndex(i => i.id === data.download.id)
          if (idx > -1) {
            const next = [...prev]
            next[idx] = data.download
            return next
          }
          return [data.download, ...prev]
        })
      } else if (data.type === 'completed') {
        setActive(prev => prev.filter(i => i.id !== data.download.id))
        setHistory(prev => {
          if (prev.some(i => i.id === data.download.id)) return prev
          return [data.download, ...prev].slice(0, 100)
        })
        if (isNative) {
          import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
            LocalNotifications.requestPermissions().then(({ display }) => {
              if (display === 'granted') {
                LocalNotifications.schedule({
                  notifications: [{
                    id: Math.floor(Math.random() * 100000),
                    title: 'Download Complete',
                    body: `${data.download.manga_title} — ${data.download.chapter_title} downloaded`,
                    schedule: { at: new Date(Date.now() + 100) },
                  }]
                }).catch(() => {})
              }
            }).catch(() => {})
          }).catch(() => {})
        }
      }
    }

    return () => ws.close()
  }, [loadingSession, isAdmin])

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#09090b]">
        <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-6">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-white/40 max-w-sm text-sm">
          Download queue and history management is restricted to the administrator account.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto min-h-full">
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Queue
        </h1>
        <p className="text-white/40 font-medium md:text-lg">Monitor active downloads and history</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Active Downloads */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-3">
              <Activity className="w-5 h-5 text-red-500" />
              Active Tasks
              <span className="ml-2 px-2 py-0.5 bg-white/5 rounded-lg text-xs font-mono text-white/40">
                {active.length}
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const endpoint = paused ? '/downloads/resume' : '/downloads/pause'
                  await api.post(endpoint)
                  setPaused(!paused)
                }}
                title={paused ? 'Resume downloads' : 'Pause downloads'}
                className={cn(
                  "p-2.5 rounded-xl transition-all border",
                  paused
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                    : "hover:bg-white/10 border-white/5 text-white/40 hover:text-white"
                )}
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Cancel all queued downloads and clear history?')) return
                  await Promise.allSettled(active.map(i => api.post(`/downloads/cancel/${i.id}`)))
                  await api.delete('/downloads/history')
                  setActive([])
                  setHistory([])
                }}
                title="Cancel all downloads and clear history"
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {active.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-dashed border-white/10 rounded-3xl p-16 text-center bg-white/[0.01]"
              >
                <DownloadIcon className="w-12 h-12 text-white/5 mx-auto mb-6" />
                <p className="text-white/20 font-bold uppercase tracking-widest text-xs">No active downloads</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {active.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="glass-card p-6 shadow-xl relative overflow-hidden group"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 rounded-md">
                            {item.provider}
                          </span>
                          <h3 className="font-bold text-gray-100 truncate group-hover:text-red-400 transition-colors">
                            {item.manga_title}
                          </h3>
                        </div>
                        <p className="text-xs text-white/30 font-bold uppercase tracking-tight">
                          {item.chapter_title}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-baseline sm:items-end gap-2 shrink-0">
                        <span className="text-lg font-black font-mono text-red-500">{item.progress}%</span>
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.1em]">
                          {item.downloaded_pages} / {item.total_pages} pages
                        </p>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await api.post(`/downloads/cancel/${item.id}`)
                            setActive(prev => prev.filter(i => i.id !== item.id))
                          }}
                          title="Cancel this download"
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        className="absolute h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* History */}
        <div className="space-y-8">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-white/20" />
            History
          </h2>
          
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/10 text-center py-12">Nothing here yet</p>
            ) : (
              history.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  className="flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] p-4 rounded-2xl border border-white/5 group transition-all"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                    item.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-red-500/5 border-red-500/10 text-red-500'
                  )}>
                    {item.status === 'done' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                      {item.manga_title}
                    </h4>
                    <p className="text-[10px] font-bold text-white/20 truncate uppercase tracking-tight">
                      {item.chapter_title}
                    </p>
                  </div>
                  {item.status === 'failed' && (
                    <button
                      onClick={async () => {
                        setRetrying(prev => new Set(prev).add(item.id))
                        try {
                          await api.post(`/downloads/retry/${item.id}`)
                          setHistory(prev => prev.filter(i => i.id !== item.id))
                        } catch { /* non-fatal */ }
                        setRetrying(prev => { const s = new Set(prev); s.delete(item.id); return s })
                      }}
                      disabled={retrying.has(item.id)}
                      title="Retry download"
                      className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-amber-500/20 rounded-xl transition-all text-white/20 hover:text-amber-400 disabled:opacity-40"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  {isNative && item.status === 'done' && (
                    <button
                      onClick={async () => {
                        setSavingToDevice(prev => new Set(prev).add(item.id))
                        try {
                          const url = getCbzUrl(item.manga_title, item.chapter_title + '.cbz')
                          const b64 = await fetchCbzAsBase64(url)
                          await saveToDeviceStorage(item.manga_title, item.chapter_title + '.cbz', b64)
                          alert('Saved to Documents/manga-dl/')
                        } catch (e) {
                          alert('Save failed: ' + (e as Error).message)
                        } finally {
                          setSavingToDevice(prev => { const s = new Set(prev); s.delete(item.id); return s })
                        }
                      }}
                      disabled={savingToDevice.has(item.id)}
                      title="Save to device storage"
                      className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-emerald-500/20 rounded-xl transition-all text-white/20 hover:text-emerald-400 disabled:opacity-40"
                    >
                      <HardDrive className="w-4 h-4" />
                    </button>
                  )}
                  {isTauri && item.output_path && (
                    <button
                      onClick={() => revealFile(item.output_path)}
                      className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/20 hover:text-white"
                      title="Reveal in file manager"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

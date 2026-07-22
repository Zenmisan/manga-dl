import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Download as DownloadIcon, CheckCircle2, XCircle, Pause, Play, Trash2, FolderOpen, X, RotateCcw, HardDrive } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
      <div className="min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-red-500 rounded-full animate-spin" style={{ borderColor: 'var(--surface-hover)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-full flex flex-col">
        <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Downloads</h1>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle style={{ width: 28, height: 28, color: 'var(--accent)' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>Access Denied</p>
          <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Download management is restricted to the administrator.</p>
        </div>
      </div>
    )
  }

  const activeCount = active.filter(i => i.status === 'downloading').length
  const queuedCount = active.filter(i => i.status === 'queued').length

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Downloads</h1>
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>
            {activeCount > 0 || queuedCount > 0
              ? `${activeCount} active · ${queuedCount} queued`
              : 'Nothing downloading'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={async () => {
              const endpoint = paused ? '/downloads/resume' : '/downloads/pause'
              await api.post(endpoint)
              setPaused(!paused)
            }}
            title={paused ? 'Resume downloads' : 'Pause all'}
            className="icon-btn"
            style={paused ? { color: 'rgb(74,222,128)', borderColor: 'rgba(74,222,128,0.3)' } : {}}
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
            title="Clear all"
            className="icon-btn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1" style={{ maxWidth: 720 }}>
        {/* In Progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>In Progress</div>
          {active.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 24px', gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DownloadIcon style={{ width: 22, height: 22, color: 'var(--muted3)' }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 600 }}>No active downloads</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.manga_title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>{item.chapter_title}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{item.progress}%</span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await api.post(`/downloads/cancel/${item.id}`)
                            setActive(prev => prev.filter(i => i.id !== item.id))
                          }}
                          title="Cancel"
                          className="icon-btn"
                          style={{ width: 28, height: 28, borderRadius: 8 }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: 'var(--surface-hover)', overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', background: '#dc2626', borderRadius: 4 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                      />
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted3)', marginTop: 6 }}>{item.downloaded_pages} / {item.total_pages} pages</div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>Completed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.status === 'done' ? 'rgba(74,222,128,0.1)' : 'rgba(220,38,38,0.1)' }}>
                    {item.status === 'done'
                      ? <CheckCircle2 style={{ width: 16, height: 16, color: 'rgb(74,222,128)' }} />
                      : <XCircle style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.manga_title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted3)' }}>{item.chapter_title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
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
                        title="Retry"
                        className="icon-btn"
                        style={{ width: 30, height: 30, borderRadius: 8 }}
                      >
                        <RotateCcw className="w-3 h-3" />
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
                        title="Save to device"
                        className="icon-btn"
                        style={{ width: 30, height: 30, borderRadius: 8 }}
                      >
                        <HardDrive className="w-3 h-3" />
                      </button>
                    )}
                    {isTauri && item.output_path && (
                      <button
                        onClick={() => revealFile(item.output_path)}
                        title="Reveal in file manager"
                        className="icon-btn"
                        style={{ width: 30, height: 30, borderRadius: 8 }}
                      >
                        <FolderOpen className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

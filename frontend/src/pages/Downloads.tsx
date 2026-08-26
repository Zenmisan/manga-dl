import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Download as DownloadIcon, CheckCircle2, XCircle, Pause, Play, Trash2, FolderOpen, X, RotateCcw, HardDrive, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import { fetchCbzAsBase64, saveToDeviceStorage, getCbzUrl } from '../lib/nativeDownload'
import { ThemedSpinner } from '../components/common/ThemedLoader'
import { preCacheChapter, outputPathToParts, isChapterCached } from '../lib/offlineCache'


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

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
  'linear-gradient(135deg, #3d1a1a, #8b2c2c)',
  'linear-gradient(135deg, #1a3d2b, #2d6b4a)',
  'linear-gradient(135deg, #2d1a4d, #5b3a8a)',
  'linear-gradient(135deg, #3d2e1a, #8b6b2c)',
]

function coverGradient(title: string): string {
  const idx = (title.charCodeAt(0) + (title.charCodeAt(1) || 0)) % COVER_GRADIENTS.length
  return COVER_GRADIENTS[idx]
}

type Tab = 'active' | 'completed' | 'failed'

export default function DownloadsPage() {
  const [active, setActive] = useState<DownloadItem[]>([])
  const [history, setHistory] = useState<DownloadItem[]>([])
  const [paused, setPaused] = useState(false)
  const [tab, setTab] = useState<Tab>('active')
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [savingToDevice, setSavingToDevice] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeRes, historyRes] = await Promise.all([
          api.get('/downloads/active'),
          api.get('/downloads/history')
        ])
        setActive(activeRes.data || [])
        setHistory(historyRes.data || [])
      } catch (err) {
        console.error(err)
      }
    }

    fetchData()
    api.get('/downloads/queue-status').then(res => setPaused(res.data?.paused ?? false)).catch(() => {})

    let ws: WebSocket | null = null
    let closed = false

    const connectWs = async () => {
      const apiKey = localStorage.getItem('manga-api-key') || ''
      const apiBase = api.defaults.baseURL || ''
      let wsBase: string
      if (apiBase.startsWith('http')) {
        wsBase = apiBase.replace(/^http/, 'ws') + '/downloads/ws'
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host.includes('localhost') ? 'localhost:8000' : window.location.host
        wsBase = `${protocol}//${host}/api/downloads/ws`
      }
      const params = new URLSearchParams()
      if (apiKey) params.set('api_key', apiKey)
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) params.set('token', session.access_token)
      if (closed) return
      ws = new WebSocket(`${wsBase}?${params.toString()}`)
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
          // Pre-cache all images for offline reading
          if (data.download.output_path) {
            const parts = outputPathToParts(data.download.output_path)
            if (parts) preCacheChapter(parts.mangaTitle, parts.filename).catch(() => {})
          }
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
    }

    connectWs().catch(console.error)

    return () => {
      closed = true
      ws?.close()
    }
  }, [])

  const completed = history.filter(i => i.status === 'done')
  const failed = history.filter(i => i.status === 'failed')

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: active.length },
    { id: 'completed', label: 'Completed', count: completed.length },
    { id: 'failed', label: 'Failed', count: failed.length },
  ]

  const renderHistoryItem = (item: DownloadItem) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        borderLeft: item.status === 'failed' ? '4px solid #dc2626' : '1px solid var(--border)',
      }}
    >
      <div style={{ width: 48, height: 64, borderRadius: 8, flexShrink: 0, background: coverGradient(item.manga_title), overflow: 'hidden' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.manga_title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.chapter_title}</div>
        {item.status === 'failed' && item.error && (
          <div style={{ fontSize: 10.5, color: '#dc2626', marginTop: 4 }}>{item.error}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {item.status === 'failed' && (
          <>
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
              {retrying.has(item.id) ? <ThemedSpinner size="xs" /> : <RotateCcw className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setHistory(prev => prev.filter(i => i.id !== item.id))}
              title="Remove"
              className="icon-btn"
              style={{ width: 30, height: 30, borderRadius: 8 }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
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
        {item.status === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <CheckCircle2 style={{ width: 16, height: 16, color: 'rgb(74,222,128)', margin: '7px 4px' }} />
            {item.output_path && (() => {
              const parts = outputPathToParts(item.output_path)
              return parts && isChapterCached(parts.mangaTitle, parts.filename) ? (
                <span title="Available offline" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted3)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <WifiOff style={{ width: 9, height: 9 }} /> offline
                </span>
              ) : null
            })()}
          </div>
        )}
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-full flex flex-col">
      <style>{`
        @keyframes dl-stripe {
          from { background-position: 0 0; }
          to { background-position: 28px 0; }
        }
      `}</style>
      <header className="sticky-header border-b px-4 md:px-6 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Downloads</h1>
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>
            {active.length > 0 ? `${active.filter(i => i.status === 'downloading').length} active · ${active.filter(i => i.status === 'queued').length} queued` : 'Nothing downloading'}
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
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 20, width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 999,
                border: 'none',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                boxShadow: tab === t.id ? '0 0 12px rgba(220,38,38,0.3)' : 'none',
                fontSize: 12, fontWeight: 800,
                color: tab === t.id ? '#fff' : 'var(--muted2)',
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 999, padding: '0 5px',
                  background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--surface-hover)',
                  color: tab === t.id ? '#fff' : 'var(--muted2)',
                  fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Active tab */}
        {tab === 'active' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>
              Currently Downloading
            </div>
            {active.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 10 }}>
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}
                    >
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 48, height: 64, borderRadius: 8, flexShrink: 0, background: coverGradient(item.manga_title) }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
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
                          <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <motion.div
                              style={{
                                height: '100%', borderRadius: 4, background: '#dc2626', position: 'relative', overflow: 'hidden',
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.progress}%` }}
                              transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                            >
                              {item.status === 'downloading' && (
                                <div style={{
                                  position: 'absolute', inset: 0,
                                  background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 10px, transparent 10px, transparent 20px)',
                                  backgroundSize: '28px 100%',
                                  animation: 'dl-stripe 0.6s linear infinite',
                                }} />
                              )}
                            </motion.div>
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted3)', marginTop: 5 }}>{item.downloaded_pages} / {item.total_pages} pages</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Completed tab */}
        {tab === 'completed' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>Completed</div>
            {completed.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 style={{ width: 22, height: 22, color: 'var(--muted3)' }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 600 }}>No completed downloads</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {completed.map(item => renderHistoryItem(item))}
              </div>
            )}
          </div>
        )}

        {/* Failed tab */}
        {tab === 'failed' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>Failed</div>
            {failed.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle style={{ width: 22, height: 22, color: 'var(--muted3)' }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 600 }}>No failed downloads</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {failed.map(item => renderHistoryItem(item))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

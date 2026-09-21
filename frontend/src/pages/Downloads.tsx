import { useState } from 'react'
import { useToast } from '../components/common/Toast'
import { Download as DownloadIcon, CheckCircle2, XCircle, Pause, Play, Trash2, X, RotateCcw, ShieldCheck, FileArchive } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemedSpinner } from '../components/common/ThemedLoader'
import { usePageTitle } from '../lib/usePageTitle'
import { useClientDownloader, type ClientDownloadTask } from '../lib/clientDownloader'

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

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getStatusLabel(task: ClientDownloadTask): string {
  switch (task.status) {
    case 'fetching-pages':
      return 'Fetching chapter manifest...'
    case 'downloading':
      return `Downloading pages: ${task.downloadedPages} / ${task.totalPages || '?'}`
    case 'packaging':
      return 'Packaging CBZ archive in browser...'
    case 'queued':
      return 'Waiting in queue (concurrency protected)...'
    case 'paused':
      return 'Download paused'
    default:
      return ''
  }
}

type Tab = 'active' | 'completed' | 'failed'

export default function DownloadsPage() {
  usePageTitle('Downloads')
  const { show: toast, confirm } = useToast()
  const [tab, setTab] = useState<Tab>('active')
  const [exportingId, setExportingId] = useState<string | null>(null)

  const {
    active,
    completed,
    failed,
    isPaused,
    pause,
    resume,
    cancel,
    retry,
    clearAll,
    saveOrExportFile,
  } = useClientDownloader()

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: active.length },
    { id: 'completed', label: 'Completed', count: completed.length },
    { id: 'failed', label: 'Failed', count: failed.length },
  ]

  const handleExport = async (task: ClientDownloadTask) => {
    setExportingId(task.id)
    try {
      await saveOrExportFile(task)
      toast(`Exported "${task.fileName || task.chapterTitle}" to device`, 'success')
    } catch (err) {
      toast((err as Error).message || 'Export failed', 'error')
    } finally {
      setExportingId(null)
    }
  }

  const renderHistoryItem = (item: ClientDownloadTask) => (
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
      <div style={{ width: 48, height: 64, borderRadius: 8, flexShrink: 0, background: coverGradient(item.mangaTitle), overflow: 'hidden' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.mangaTitle}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.chapterTitle}
        </div>
        {item.status === 'done' && (
          <div style={{ fontSize: 10.5, color: 'var(--muted3)', marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
            <FileArchive style={{ width: 11, height: 11 }} />
            <span>{item.fileName || 'Archive.cbz'}</span>
            {item.fileSizeBytes ? <span>· {formatBytes(item.fileSizeBytes)}</span> : null}
          </div>
        )}
        {item.status === 'failed' && item.error && (
          <div style={{ fontSize: 10.5, color: '#dc2626', marginTop: 4 }}>{item.error}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {item.status === 'failed' && (
          <>
            <button
              onClick={() => retry(item.id)}
              title="Retry download"
              className="icon-btn"
              style={{ width: 40, height: 40, borderRadius: 10 }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => cancel(item.id)}
              title="Remove"
              className="icon-btn"
              style={{ width: 40, height: 40, borderRadius: 10 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {item.status === 'done' && (
          <>
            <button
              onClick={() => handleExport(item)}
              disabled={exportingId === item.id}
              title="Save or Export CBZ"
              className="icon-btn"
              style={{ width: 40, height: 40, borderRadius: 10 }}
            >
              {exportingId === item.id ? <ThemedSpinner size="xs" /> : <DownloadIcon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => cancel(item.id)}
              title="Remove from history"
              className="icon-btn"
              style={{ width: 40, height: 40, borderRadius: 10 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
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
            {active.length > 0
              ? `${active.filter(i => i.status !== 'queued').length} active · ${active.filter(i => i.status === 'queued').length} queued`
              : 'Nothing downloading'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => (isPaused ? resume() : pause())}
            title={isPaused ? 'Resume queue' : 'Pause queue'}
            className="icon-btn"
            style={isPaused ? { color: 'rgb(74,222,128)', borderColor: 'rgba(74,222,128,0.3)' } : {}}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={async () => {
              const ok = await confirm({
                message: 'Cancel all queued downloads and clear history?',
                confirmLabel: 'Clear All',
                danger: true,
              })
              if (!ok) return
              clearAll()
            }}
            title="Clear all"
            className="icon-btn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1" style={{ maxWidth: 720 }}>
        {/* Concurrency protection banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            marginBottom: 16,
            fontSize: 11.5,
            color: 'var(--muted2)',
            lineHeight: 1.4,
          }}
        >
          <ShieldCheck style={{ width: 16, height: 16, color: 'rgb(74,222,128)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: 'var(--fg)', fontWeight: 700 }}>Client-Side Fast Downloads Active:</strong> Chapters are packaged directly into CBZ comic archives in your browser with strict concurrency limiting (1 chapter at a time, 2 pages per batch) to keep memory low and prevent browser slowdowns.
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 20, width: 'fit-content' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                borderRadius: 999,
                border: 'none',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                boxShadow: tab === t.id ? '0 0 12px rgba(220,38,38,0.3)' : 'none',
                fontSize: 12,
                fontWeight: 800,
                color: tab === t.id ? '#fff' : 'var(--muted2)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    padding: '0 5px',
                    background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--surface-hover)',
                    color: tab === t.id ? '#fff' : 'var(--muted2)',
                    fontSize: 10,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
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
              Active Queue ({active.length})
            </div>
            {active.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DownloadIcon style={{ width: 22, height: 22, color: 'var(--muted3)' }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 600 }}>No active downloads</p>
                <p style={{ fontSize: 11.5, color: 'var(--muted3)', maxWidth: 300 }}>
                  Tap the download icon on any manga chapter to queue it for client-side CBZ packaging.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {active.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}
                    >
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 48, height: 64, borderRadius: 8, flexShrink: 0, background: coverGradient(item.mangaTitle) }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.mangaTitle}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>{item.chapterTitle}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                                {item.progress}%
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  cancel(item.id)
                                }}
                                title="Cancel"
                                className="icon-btn"
                                style={{ width: 40, height: 40, borderRadius: 10 }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <motion.div
                              style={{
                                height: '100%',
                                borderRadius: 4,
                                background: '#dc2626',
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.progress}%` }}
                              transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                            >
                              {(item.status === 'downloading' || item.status === 'packaging') && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background:
                                      'repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 10px, transparent 10px, transparent 20px)',
                                    backgroundSize: '28px 100%',
                                    animation: 'dl-stripe 0.6s linear infinite',
                                  }}
                                />
                              )}
                            </motion.div>
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted3)', marginTop: 5, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{getStatusLabel(item)}</span>
                            {item.totalPages > 0 && item.status === 'downloading' && (
                              <span>{item.downloadedPages} / {item.totalPages} pages</span>
                            )}
                          </div>
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
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>
              Completed ({completed.length})
            </div>
            {completed.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 style={{ width: 22, height: 22, color: 'var(--muted3)' }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 600 }}>No completed downloads</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {completed.map((item) => renderHistoryItem(item))}
              </div>
            )}
          </div>
        )}

        {/* Failed tab */}
        {tab === 'failed' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>
              Failed ({failed.length})
            </div>
            {failed.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle style={{ width: 22, height: 22, color: 'var(--muted3)' }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 600 }}>No failed downloads</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {failed.map((item) => renderHistoryItem(item))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

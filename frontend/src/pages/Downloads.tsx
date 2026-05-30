import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Download as DownloadIcon, CheckCircle2, XCircle, Clock, Pause, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DownloadItem {
  id: string
  provider: string
  manga_title: string
  chapter_title: string
  status: 'queued' | 'downloading' | 'done' | 'failed'
  progress: number
  downloaded_pages: number
  total_pages: number
  error?: string
}

export default function DownloadsPage() {
  const [active, setActive] = useState<DownloadItem[]>([])
  const [history, setHistory] = useState<DownloadItem[]>([])

  useEffect(() => {
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
    
    // Setup WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    
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
        setActive(prev => prev.filter(i => i.id === data.download.id))
        setHistory(prev => [data.download, ...prev].slice(0, 100))
      }
    }

    return () => ws.close()
  }, [])

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Queue</h1>
        <p className="text-gray-400">Monitor active downloads and history</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Active Downloads */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              Active Tasks
            </h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-[#16161a] rounded-lg transition-colors border border-[#27272a]">
                <Pause className="w-4 h-4 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-[#16161a] rounded-lg transition-colors border border-[#27272a]">
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {active.length === 0 ? (
              <div className="border border-dashed border-[#27272a] rounded-2xl p-12 text-center">
                <DownloadIcon className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No active downloads</p>
              </div>
            ) : (
              <AnimatePresence>
                {active.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#16161a] border border-[#27272a] rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-red-600/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-600/20 rounded">
                            {item.provider}
                          </span>
                          <h3 className="font-bold text-gray-100">{item.manga_title}</h3>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{item.chapter_title}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-red-500">{item.progress}%</span>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                          {item.downloaded_pages}/{item.total_pages} pages
                        </p>
                      </div>
                    </div>

                    <div className="relative h-2 bg-[#27272a] rounded-full overflow-hidden">
                      <motion.div
                        className="absolute h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* History */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-gray-400" />
            Recently Completed
          </h2>
          
          <div className="space-y-3">
            {history.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-[#16161a]/50 p-4 rounded-xl border border-[#27272a] group hover:bg-[#16161a] transition-all">
                <div className="w-10 h-10 rounded-full bg-[#16161a] border border-[#27272a] flex items-center justify-center shrink-0">
                  {item.status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-200 truncate group-hover:text-red-500 transition-colors">{item.manga_title}</h4>
                  <p className="text-[10px] text-gray-500 truncate">{item.chapter_title}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[#27272a] rounded-lg transition-all">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FolderOpen(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.69.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

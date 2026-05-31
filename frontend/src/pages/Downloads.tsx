import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Download as DownloadIcon, CheckCircle2, XCircle, Pause, Trash2, FolderOpen, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

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
    const wsUrl = import.meta.env.PROD 
      ? `wss://${window.location.host}/ws` 
      : `ws://localhost:8000/ws`
    const ws = new WebSocket(wsUrl)
    
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
        setHistory(prev => [data.download, ...prev].slice(0, 100))
      }
    }

    return () => ws.close()
  }, [])

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full">
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
              <button className="p-2.5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-white">
                <Pause className="w-4 h-4" />
              </button>
              <button className="p-2.5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-red-400">
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
                  <button className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/20 hover:text-white">
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

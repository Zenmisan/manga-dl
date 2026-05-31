import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Book, FolderOpen, MoreVertical, LayoutGrid, List, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface LibraryItem {
  title: string
  files: string[]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    api.get('/library').then(res => {
      setItems(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
            My Library
          </h1>
          <p className="text-white/40 font-medium md:text-lg">Manage your offline manga collection</p>
        </div>

        <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1.5 backdrop-blur-sm self-start md:self-auto">
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
            Start by searching for your favorite manga and adding them to your queue.
          </p>
          <button 
            onClick={() => navigate('/search')}
            className="btn-primary flex items-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Browse Providers
          </button>
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
                    <button className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white">
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
    </div>
  )
}

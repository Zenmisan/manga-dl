import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Book, FolderOpen, MoreVertical, LayoutGrid, List } from 'lucide-react'
import { motion } from 'framer-motion'

interface LibraryItem {
  title: string
  files: string[]
}

export default function Dashboard() {
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
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">My Library</h1>
          <p className="text-gray-400">Manage your offline manga collection</p>
        </div>

        <div className="flex bg-[#16161a] border border-[#27272a] rounded-lg p-1">
          <button 
            onClick={() => setView('grid')}
            className={`p-2 rounded ${view === 'grid' ? 'bg-[#27272a] text-white' : 'text-gray-500'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setView('list')}
            className={`p-2 rounded ${view === 'list' ? 'bg-[#27272a] text-white' : 'text-gray-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-3/4 bg-[#16161a] animate-pulse rounded-xl border border-[#27272a]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="h-[50vh] flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-[#16161a] rounded-full flex items-center justify-center mb-6">
            <Book className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Your library is empty</h2>
          <p className="text-gray-400 max-w-xs mb-8">
            Start by searching for your favorite manga and adding them to your queue.
          </p>
          <button className="btn-primary">Browse Providers</button>
        </div>
      ) : (
        <div className={view === 'grid' 
          ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
          : "space-y-4"
        }>
          {items.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={item.title}
              className={`group cursor-pointer ${view === 'grid' ? 'block' : 'flex items-center gap-4 bg-[#16161a] p-4 rounded-xl border border-[#27272a]'}`}
            >
              {view === 'grid' ? (
                <>
                  <div className="aspect-3/4 bg-[#16161a] rounded-xl border border-[#27272a] overflow-hidden mb-3 relative group shadow-lg transition-all hover:border-red-600/50">
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-xs font-medium text-white bg-red-600 px-2 py-1 rounded">
                        {item.files.length} Chapters
                      </span>
                    </div>
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                      <Book className="w-12 h-12" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.files.length} volumes offline</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-16 bg-[#27272a] rounded flex items-center justify-center text-gray-500">
                    <Book className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.files.length} items in folder</p>
                  </div>
                  <button className="p-2 hover:bg-[#27272a] rounded-lg transition-colors">
                    <FolderOpen className="w-5 h-5 text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-[#27272a] rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

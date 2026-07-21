import { motion } from 'framer-motion'
import { ArrowUpDown, Filter } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  show: boolean;
  sort: 'default' | 'title-asc' | 'title-desc' | 'downloaded' | 'last-read' | 'unread-count';
  setSort: (val: 'default' | 'title-asc' | 'title-desc' | 'downloaded' | 'last-read' | 'unread-count') => void;
  filter: 'all' | 'subscribed' | 'downloading' | 'failed' | 'unread' | 'downloaded-only' | 'started' | 'completed';
  setFilter: (val: 'all' | 'subscribed' | 'downloading' | 'failed' | 'unread' | 'downloaded-only' | 'started' | 'completed') => void;
}

export function DashboardSortFilterPanel({ show, sort, setSort, filter, setFilter }: Props) {
  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-8 p-6 glass-panel border-white/10 space-y-6 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowUpDown className="w-4 h-4 text-white/40" />
          <span className="text-xs font-black uppercase tracking-widest text-white/40">Sort By</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="select-styled text-xs"
          >
            <option value="default">Default</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="downloaded">Downloaded Count</option>
            <option value="unread-count">Unread Count</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-white/40 mr-1" />
          {(['all', 'subscribed', 'downloading', 'unread', 'started', 'completed', 'downloaded-only'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer",
                filter === f ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/30 hover:border-white/10"
              )}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

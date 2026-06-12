import { useState, useEffect } from 'react'
import api from '../lib/api'
import { BarChart2, Book, Download, Layers, HardDrive, Flame, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsData {
  total_chapters: number
  total_manga: number
  total_pages: number
  storage_bytes: number
  daily_downloads: { day: string; count: number }[]
  yearly_downloads: { day: string; count: number }[]
  provider_breakdown: { provider: string; count: number }[]
  streak_days: number
}

function buildHeatmapGrid(data: { day: string; count: number }[]): { day: string; count: number; label: string }[][] {
  const map = new Map(data.map(d => [d.day, d.count]))
  const today = new Date()
  // Align to Sunday of last week
  const endDay = new Date(today)
  endDay.setDate(endDay.getDate() + (6 - endDay.getDay()))
  const startDay = new Date(endDay)
  startDay.setDate(startDay.getDate() - 364)

  const cols: { day: string; count: number; label: string }[][] = []
  const cur = new Date(startDay)
  while (cur <= endDay) {
    const col: { day: string; count: number; label: string }[] = []
    for (let dow = 0; dow < 7; dow++) {
      const key = cur.toISOString().split('T')[0]
      const label = cur.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
      col.push({ day: key, count: map.get(key) ?? 0, label })
      cur.setDate(cur.getDate() + 1)
    }
    cols.push(col)
  }
  return cols
}

function heatColor(count: number): string {
  if (count === 0) return 'bg-white/5'
  if (count <= 2) return 'bg-emerald-900/60'
  if (count <= 5) return 'bg-emerald-700/70'
  if (count <= 10) return 'bg-emerald-500/80'
  return 'bg-emerald-400'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// Fill in missing days for the last 30 days
function fillDays(data: { day: string; count: number }[]): { day: string; count: number; label: string }[] {
  const map = new Map(data.map(d => [d.day, d.count]))
  const result = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    result.push({ day: key, count: map.get(key) ?? 0, label })
  }
  return result
}

const PROVIDER_COLORS: Record<string, string> = {
  mangadex: '#3b82f6',
  asurascans: '#f59e0b',
  mangakatana: '#10b981',
  omegascans: '#8b5cf6',
  upload: '#6b7280',
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/library/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-12 text-center text-white/40">
        <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-xs">Could not load stats</p>
      </div>
    )
  }

  const daily = fillDays(stats.daily_downloads)
  const maxDaily = Math.max(...daily.map(d => d.count), 1)
  const heatmapCols = buildHeatmapGrid(stats.yearly_downloads ?? [])

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto min-h-full">
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Statistics
        </h1>
        <p className="text-white/40 font-medium md:text-lg">Your reading activity at a glance</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Book, label: 'Manga', value: formatNum(stats.total_manga), color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Download, label: 'Chapters', value: formatNum(stats.total_chapters), color: 'text-red-400', bg: 'bg-red-500/10' },
          { icon: Layers, label: 'Pages', value: formatNum(stats.total_pages), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: HardDrive, label: 'Storage', value: formatBytes(stats.storage_bytes), color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-5 border-white/5"
          >
            <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className={`text-2xl md:text-3xl font-black font-mono ${card.color} mb-1`}>{card.value}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Streak */}
      {stats.streak_days > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 glass-panel p-5 border-orange-500/20 bg-orange-500/5 mb-10"
        >
          <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-orange-400">{stats.streak_days} day streak</div>
            <p className="text-xs text-white/30 font-medium">Keep it going — download something today</p>
          </div>
        </motion.div>
      )}

      {/* Reading Heatmap */}
      {heatmapCols.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel border-white/5 overflow-hidden mb-8"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold">Reading Heatmap — Last Year</h2>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold">
              <span>Less</span>
              {['bg-white/5','bg-emerald-900/60','bg-emerald-700/70','bg-emerald-500/80','bg-emerald-400'].map((c, i) => (
                <span key={i} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
              <span>More</span>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-[3px] min-w-max">
              {heatmapCols.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((cell) => (
                    <div
                      key={cell.day}
                      className={`w-3 h-3 rounded-sm transition-all duration-150 hover:scale-125 ${heatColor(cell.count)}`}
                      title={`${cell.label}: ${cell.count} chapter${cell.count !== 1 ? 's' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Activity Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel border-white/5 overflow-hidden mb-8"
      >
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <BarChart2 className="w-5 h-5 text-red-500" />
          <h2 className="font-bold">Activity — Last 30 Days</h2>
        </div>
        <div className="p-6">
          <div className="flex items-end gap-1 h-32">
            {daily.map((d) => (
              <div
                key={d.day}
                className="flex-1 group relative flex items-end"
                title={`${d.label}: ${d.count} chapter${d.count !== 1 ? 's' : ''}`}
              >
                <div
                  className="w-full rounded-t-sm transition-all duration-300 bg-red-500/60 hover:bg-red-500"
                  style={{ height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 4 : 0)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-white/20 font-mono">
            <span>{daily[0]?.label}</span>
            <span>{daily[14]?.label}</span>
            <span>{daily[29]?.label}</span>
          </div>
        </div>
      </motion.section>

      {/* Provider Breakdown */}
      {stats.provider_breakdown.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel border-white/5 overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <h2 className="font-bold">Sources</h2>
          </div>
          <div className="p-6 space-y-4">
            {(() => {
              const total = stats.provider_breakdown.reduce((s, p) => s + p.count, 0)
              return stats.provider_breakdown.map((p) => (
                <div key={p.provider}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">{p.provider}</span>
                    <span className="text-xs font-mono text-white/40">{p.count} ({Math.round((p.count / total) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(p.count / total) * 100}%`,
                        backgroundColor: PROVIDER_COLORS[p.provider] ?? '#6b7280',
                      }}
                    />
                  </div>
                </div>
              ))
            })()}
          </div>
        </motion.section>
      )}
    </div>
  )
}

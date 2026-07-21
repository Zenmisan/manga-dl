import { useState } from 'react'
import { useLibraryStats } from '../lib/queries'
import { BarChart2, Book, Download, Layers, HardDrive, Flame, Loader2, Target, CheckCircle2, Edit3, Clock, TrendingUp, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { getCategories } from '../lib/categories'

const GOALS_KEY = 'manga-dl-reading-goals'

interface ReadingGoals {
  monthlyChapters: number
  yearlyManga: number
}

function getGoals(): ReadingGoals {
  try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '{}') as ReadingGoals }
  catch { return { monthlyChapters: 0, yearlyManga: 0 } }
}

function saveGoals(g: ReadingGoals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(g))
}

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
  const { data: rawStats, isLoading: loading } = useLibraryStats()
  const stats = rawStats as StatsData | undefined
  const [goals, setGoals] = useState<ReadingGoals>(() => getGoals())
  const [editGoals, setEditGoals] = useState(false)
  const [goalDraft, setGoalDraft] = useState<ReadingGoals>(() => getGoals())

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

  // Reading time estimate (avg 45s/page)
  const totalReadSecs = stats.total_pages * 45
  const readHours = Math.floor(totalReadSecs / 3600)
  const readMins = Math.floor((totalReadSecs % 3600) / 60)
  const readTimeStr = readHours > 0 ? `${readHours}h ${readMins}m` : `${readMins}m`

  // Reading pace: chapters in last 7 days
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const last7 = (stats.daily_downloads || [])
    .filter(d => {
      const diff = (now - new Date(d.day).getTime()) / 86_400_000
      return diff <= 7
    })
    .reduce((s, d) => s + d.count, 0)
  const chapPerWeek = last7

  // Per-category breakdown from localStorage
  const allCategories = getCategories()
  const mangaCatMap: Record<string, string[]> = JSON.parse(localStorage.getItem('manga-dl-manga-categories') || '{}')
  const catCounts: Record<string, number> = {}
  for (const cats of Object.values(mangaCatMap)) {
    for (const c of cats) { catCounts[c] = (catCounts[c] || 0) + 1 }
  }
  const categoryStats = allCategories
    .map(cat => ({ name: cat, count: catCounts[cat] || 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-5xl mx-auto min-h-full">
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Statistics
        </h1>
        <p className="text-white/40 font-medium md:text-lg">Your reading activity at a glance</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {[
          { icon: Book, label: 'Manga', value: formatNum(stats.total_manga), color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Download, label: 'Chapters', value: formatNum(stats.total_chapters), color: 'text-red-400', bg: 'bg-red-500/10' },
          { icon: Layers, label: 'Pages', value: formatNum(stats.total_pages), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: HardDrive, label: 'Storage', value: formatBytes(stats.storage_bytes), color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { icon: Clock, label: 'Read Time', value: readTimeStr, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: TrendingUp, label: 'This Week', value: `${chapPerWeek} ch`, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
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
            <p className="text-xs text-white/30 font-medium">Keep it going — download a chapter today</p>
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

      {/* Reading Goals */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-panel border-white/5 overflow-hidden mb-8"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-violet-400" />
            <h2 className="font-bold">Reading Goals</h2>
          </div>
          <button
            onClick={() => setEditGoals(e => !e)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {editGoals ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">Monthly Chapter Goal</label>
                <input
                  type="number"
                  min="0"
                  value={goalDraft.monthlyChapters}
                  onChange={(e) => setGoalDraft(g => ({ ...g, monthlyChapters: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-white text-sm"
                  placeholder="e.g. 100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">Yearly Manga Goal</label>
                <input
                  type="number"
                  min="0"
                  value={goalDraft.yearlyManga}
                  onChange={(e) => setGoalDraft(g => ({ ...g, yearlyManga: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-white text-sm"
                  placeholder="e.g. 20"
                />
              </div>
              <button
                onClick={() => { saveGoals(goalDraft); setGoals(goalDraft); setEditGoals(false) }}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Goals
              </button>
            </div>
          ) : (
            <>
              {goals.monthlyChapters > 0 && stats && (() => {
                const now = new Date()
                const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                const thisMonthCount = (stats.daily_downloads || [])
                  .filter(d => d.day.startsWith(thisMonth))
                  .reduce((s, d) => s + d.count, 0)
                const pct = Math.min(Math.round((thisMonthCount / goals.monthlyChapters) * 100), 100)
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white/70">Monthly chapters</span>
                      <span className="text-xs font-mono text-white/40">{thisMonthCount} / {goals.monthlyChapters}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] font-bold text-white/30 mt-1">{pct}% complete this month</div>
                  </div>
                )
              })()}
              {goals.yearlyManga > 0 && stats && (() => {
                const pct = Math.min(Math.round((stats.total_manga / goals.yearlyManga) * 100), 100)
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white/70">Yearly manga</span>
                      <span className="text-xs font-mono text-white/40">{stats.total_manga} / {goals.yearlyManga}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-pink-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] font-bold text-white/30 mt-1">{pct}% of goal reached</div>
                  </div>
                )
              })()}
              {goals.monthlyChapters === 0 && goals.yearlyManga === 0 && (
                <div className="text-center py-6 text-white/20">
                  <Target className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-bold uppercase tracking-widest">No goals set — click the edit icon to add some</p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.section>

      {/* Provider Breakdown */}
      {stats.provider_breakdown.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel border-white/5 overflow-hidden mb-8"
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

      {/* Per-Category Breakdown */}
      {categoryStats.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-panel border-white/5 overflow-hidden mb-8"
        >
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <BookOpen className="w-5 h-5 text-pink-400" />
            <h2 className="font-bold">By Category</h2>
          </div>
          <div className="p-6 space-y-4">
            {(() => {
              const total = categoryStats.reduce((s, c) => s + c.count, 0) || 1
              return categoryStats.map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white/60">{c.name}</span>
                    <span className="text-xs font-mono text-white/40">{c.count} ({Math.round((c.count / total) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-pink-500/70 transition-all duration-700" style={{ width: `${(c.count / total) * 100}%` }} />
                  </div>
                </div>
              ))
            })()}
          </div>
        </motion.section>
      )}

      {/* Reading Pace */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel border-white/5 overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold">Reading Pace</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-black text-cyan-400 font-mono">{chapPerWeek}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Ch / Week</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-amber-400 font-mono">{readTimeStr}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Est. Read Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-emerald-400 font-mono">
              {stats.total_chapters > 0 ? Math.round(stats.total_pages / stats.total_chapters) : 0}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Avg Pages/Ch</div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

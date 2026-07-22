import { useState } from 'react'
import { useLibraryStats } from '../lib/queries'
import { BarChart2, Flame, Loader2, CheckCircle2, Edit3 } from 'lucide-react'
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
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-full flex flex-col">
        <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Statistics</h1>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 16 }}>
          <BarChart2 style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
          <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Could not load stats</p>
        </div>
      </div>
    )
  }

  const daily = fillDays(stats.daily_downloads)
  const maxDaily = Math.max(...daily.map(d => d.count), 1)
  const heatmapCols = buildHeatmapGrid(stats.yearly_downloads ?? [])

  const totalReadSecs = stats.total_pages * 45
  const readHours = Math.floor(totalReadSecs / 3600)
  const readMins = Math.floor((totalReadSecs % 3600) / 60)
  const readTimeStr = readHours > 0 ? `${readHours}h ${readMins}m` : `${readMins}m`

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const last7 = (stats.daily_downloads || [])
    .filter(d => { const diff = (now - new Date(d.day).getTime()) / 86_400_000; return diff <= 7 })
    .reduce((s, d) => s + d.count, 0)
  const chapPerWeek = last7

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

  const CARD_STYLE = { padding: '20px 22px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 12 }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
        <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Statistics</h1>
        <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>Your reading habits, at a glance</p>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1" style={{ maxWidth: 720 }}>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Manga', value: formatNum(stats.total_manga) },
          { label: 'Chapters', value: formatNum(stats.total_chapters) },
          { label: 'Pages', value: formatNum(stats.total_pages) },
          { label: 'Storage', value: formatBytes(stats.storage_bytes) },
          { label: 'Read Time', value: readTimeStr },
          { label: 'This Week', value: `${chapPerWeek} ch` },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ padding: '18px 18px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Anton, sans-serif', color: '#ef4444', letterSpacing: '-0.01em', lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginTop: 6 }}>{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Streak */}
      {stats.streak_days > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, ...CARD_STYLE, borderColor: 'rgba(251,146,60,0.25)', background: 'rgba(251,146,60,0.06)' }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(251,146,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Flame style={{ width: 22, height: 22, color: 'rgb(251,146,60)' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'rgb(251,146,60)' }}>{stats.streak_days} day streak</div>
            <p style={{ fontSize: 12, color: 'var(--muted3)', marginTop: 2 }}>Keep it going — download a chapter today</p>
          </div>
        </motion.div>
      )}

      {/* Activity Chart */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={CARD_STYLE}
      >
        <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 16 }}>Activity — Last 30 Days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
          {daily.map((d) => (
            <div
              key={d.day}
              style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}
              title={`${d.label}: ${d.count}`}
            >
              <div
                style={{
                  width: '100%',
                  borderRadius: '3px 3px 0 0',
                  background: 'var(--surface-hover)',
                  height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 5 : 0)}%`,
                  transition: 'background 0.15s',
                  minHeight: d.count > 0 ? 5 : 0,
                }}
                className="hover:[background:#dc2626]"
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--muted3)' }}>
          <span>{daily[0]?.label}</span>
          <span>{daily[14]?.label}</span>
          <span>{daily[29]?.label}</span>
        </div>
      </motion.section>

      {/* Reading Heatmap */}
      {heatmapCols.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={CARD_STYLE}
        >
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 12 }}>Heatmap — Last Year</div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
              {heatmapCols.map((col, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {col.map((cell) => (
                    <div
                      key={cell.day}
                      className={`w-3 h-3 rounded-sm ${heatColor(cell.count)}`}
                      title={`${cell.label}: ${cell.count}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Reading Goals */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={CARD_STYLE}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>Reading Goals</div>
          <button onClick={() => setEditGoals(e => !e)} className="icon-btn" style={{ width: 30, height: 30, borderRadius: 8 }}>
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
        {editGoals ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', display: 'block', marginBottom: 6 }}>Monthly Chapter Goal</label>
              <input
                type="number" min="0" value={goalDraft.monthlyChapters}
                onChange={(e) => setGoalDraft(g => ({ ...g, monthlyChapters: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 13, color: 'var(--fg)', outline: 'none' }}
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', display: 'block', marginBottom: 6 }}>Yearly Manga Goal</label>
              <input
                type="number" min="0" value={goalDraft.yearlyManga}
                onChange={(e) => setGoalDraft(g => ({ ...g, yearlyManga: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 13, color: 'var(--fg)', outline: 'none' }}
                placeholder="e.g. 20"
              />
            </div>
            <button
              onClick={() => { saveGoals(goalDraft); setGoals(goalDraft); setEditGoals(false) }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content', fontSize: 12 }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Goals
            </button>
          </div>
        ) : (
          <>
            {goals.monthlyChapters > 0 && (() => {
              const d = new Date()
              const thisMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
              const count = (stats.daily_downloads || []).filter(x => x.day.startsWith(thisMonth)).reduce((s, x) => s + x.count, 0)
              const pct = Math.min(Math.round((count / goals.monthlyChapters) * 100), 100)
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--fg)' }}>
                    <span>Monthly chapters</span><span style={{ color: 'var(--muted3)' }}>{count} / {goals.monthlyChapters}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-hover)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#dc2626', borderRadius: 4, width: `${pct}%`, transition: 'width 0.7s' }} />
                  </div>
                </div>
              )
            })()}
            {goals.yearlyManga > 0 && (() => {
              const pct = Math.min(Math.round((stats.total_manga / goals.yearlyManga) * 100), 100)
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--fg)' }}>
                    <span>Yearly manga</span><span style={{ color: 'var(--muted3)' }}>{stats.total_manga} / {goals.yearlyManga}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-hover)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#8b5cf6', borderRadius: 4, width: `${pct}%`, transition: 'width 0.7s' }} />
                  </div>
                </div>
              )
            })()}
            {goals.monthlyChapters === 0 && goals.yearlyManga === 0 && (
              <p style={{ fontSize: 12, color: 'var(--muted3)', textAlign: 'center', padding: '12px 0' }}>No goals set — tap the edit icon to add some</p>
            )}
          </>
        )}
      </motion.section>

      {/* Provider Breakdown */}
      {stats.provider_breakdown.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={CARD_STYLE}
        >
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 14 }}>By Source</div>
          {(() => {
            const total = stats.provider_breakdown.reduce((s, p) => s + p.count, 0)
            return stats.provider_breakdown.map((p) => (
              <div key={p.provider} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{p.provider}</span>
                  <span style={{ color: 'var(--muted3)' }}>{p.count} ({Math.round((p.count / total) * 100)}%)</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-hover)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: PROVIDER_COLORS[p.provider] ?? '#6b7280', width: `${(p.count / total) * 100}%`, transition: 'width 0.7s' }} />
                </div>
              </div>
            ))
          })()}
        </motion.section>
      )}

      {/* Per-Category Breakdown */}
      {categoryStats.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={CARD_STYLE}
        >
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 14 }}>By Category</div>
          {(() => {
            const total = categoryStats.reduce((s, c) => s + c.count, 0) || 1
            return categoryStats.map(c => (
              <div key={c.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{c.name}</span>
                  <span style={{ color: 'var(--muted3)' }}>{c.count} ({Math.round((c.count / total) * 100)}%)</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-hover)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: '#ec4899', width: `${(c.count / total) * 100}%`, transition: 'width 0.7s' }} />
                </div>
              </div>
            ))
          })()}
        </motion.section>
      )}

      {/* Reading Pace */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={CARD_STYLE}
      >
        <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 16 }}>Reading Pace</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, textAlign: 'center' }}>
          {[
            { val: chapPerWeek, label: 'Ch / Week' },
            { val: readTimeStr, label: 'Est. Read Time' },
            { val: stats.total_chapters > 0 ? Math.round(stats.total_pages / stats.total_chapters) : 0, label: 'Avg Pages/Ch' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Anton, sans-serif', color: '#ef4444', lineHeight: 1 }}>{item.val}</div>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)', marginTop: 6 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      </div>
    </div>
  )
}

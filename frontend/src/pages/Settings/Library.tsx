import { useState } from 'react'
import { useAppStore } from '../../lib/store'
import { LayoutGrid, Shuffle, Loader2, CheckCircle2 } from 'lucide-react'
import api from '../../lib/api'

export default function LibrarySettings() {
  const { gridColumns, setGridColumns } = useAppStore()
  
  // Source migration state
  const [migrationSearch, setMigrationSearch] = useState('')
  const [migrationResults, setMigrationResults] = useState<{ id: string; title: string; cover_url?: string; provider: string }[]>([])
  const [migrationSearching, setMigrationSearching] = useState(false)
  const [migrationSource, setMigrationSource] = useState<{ old_provider: string; old_manga_id: string; title: string } | null>(null)
  const [migrationTarget, setMigrationTarget] = useState<{ id: string; title: string; provider: string } | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [migrationDone, setMigrationDone] = useState(false)

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Grid Section */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="font-bold text-lg">Library Layout</h2>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-3">
              Library Grid Columns — {gridColumns} col{gridColumns !== 1 ? 's' : ''}
            </label>
            <input
              type="range"
              min={2} max={6} step={1}
              value={gridColumns}
              onChange={e => setGridColumns(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-white/20 font-bold mt-1">
              {[2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* Source Migration */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-violet-500/10 rounded-lg">
            <Shuffle className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Source Migration</h2>
            <p className="text-xs text-white/30">Move a manga entry from one source to another</p>
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-4">
          {migrationDone && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Migration complete!
            </div>
          )}
          {/* Step 1: pick manga from library */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Step 1 — Select manga to migrate</label>
            <div className="flex gap-2">
              <input
                value={migrationSearch}
                onChange={e => setMigrationSearch(e.target.value)}
                placeholder="Search your library..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
              />
              <button
                onClick={async () => {
                  if (!migrationSearch.trim()) return
                  setMigrationSearching(true)
                  try {
                    const res = await api.get('/library/')
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const items: any[] = res.data
                    setMigrationResults(items.filter(i => i.title.toLowerCase().includes(migrationSearch.toLowerCase())).slice(0, 10).map(i => ({ id: i.provider_manga_id, title: i.title, cover_url: i.cover_url, provider: i.provider })))
                  } catch { setMigrationResults([]) }
                  setMigrationSearching(false)
                }}
                disabled={migrationSearching}
                className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30 transition-all text-xs font-bold uppercase tracking-widest"
              >
                {migrationSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </div>
            {migrationResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {migrationResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setMigrationSource({ old_provider: r.provider, old_manga_id: r.id, title: r.title }); setMigrationResults([]); setMigrationSearch(r.title); setMigrationTarget(null) }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all border ${migrationSource?.old_manga_id === r.id ? 'bg-violet-500/20 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    <span className="font-bold">{r.title}</span>
                    <span className="text-[10px] text-white/30 ml-2">{r.provider}</span>
                  </button>
                ))}
              </div>
            )}
            {migrationSource && (
              <div className="mt-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm">
                Selected: <span className="font-bold text-violet-400">{migrationSource.title}</span>
                <span className="text-[10px] text-white/30 ml-2">from {migrationSource.old_provider}</span>
              </div>
            )}
          </div>

          {/* Step 2: pick target */}
          {migrationSource && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Step 2 — Search for it on another source</label>
              <div className="flex gap-2">
                <input
                  defaultValue={migrationSource.title}
                  id="mig-target-search"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                />
                <button
                  onClick={async () => {
                    const q = (document.getElementById('mig-target-search') as HTMLInputElement)?.value || migrationSource.title
                    setMigrationSearching(true)
                    try {
                      const res = await api.get('/manga/search', { params: { q, providers: 'all' } })
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      setMigrationResults(res.data.filter((r: any) => r.provider !== migrationSource.old_provider).slice(0, 15))
                    } catch { setMigrationResults([]) }
                    setMigrationSearching(false)
                  }}
                  disabled={migrationSearching}
                  className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-bold uppercase tracking-widest"
                >
                  {migrationSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
                </button>
              </div>
              {migrationResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {migrationResults.map((r: any) => (
                    <button
                      key={`${r.provider}:${r.id}`}
                      onClick={() => { setMigrationTarget({ id: r.id, title: r.title, provider: r.provider }); setMigrationResults([]) }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all border ${migrationTarget?.id === r.id && migrationTarget?.provider === r.provider ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      <span className="font-bold">{r.title}</span>
                      <span className="text-[10px] text-white/30 ml-2">{r.provider}</span>
                    </button>
                  ))}
                </div>
              )}
              {migrationTarget && (
                <div className="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                  Target: <span className="font-bold text-blue-400">{migrationTarget.title}</span>
                  <span className="text-[10px] text-white/30 ml-2">on {migrationTarget.provider}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: confirm */}
          {migrationSource && migrationTarget && (
            <button
              onClick={async () => {
                if (!confirm(`Migrate "${migrationSource.title}" from ${migrationSource.old_provider} to "${migrationTarget.title}" on ${migrationTarget.provider}?`)) return
                setMigrating(true)
                try {
                  await api.post('/manga/migrate', {
                    old_provider: migrationSource.old_provider,
                    old_manga_id: migrationSource.old_manga_id,
                    new_provider: migrationTarget.provider,
                    new_manga_id: migrationTarget.id,
                  })
                  setMigrationDone(true)
                  setMigrationSource(null); setMigrationTarget(null); setMigrationSearch('')
                  setTimeout(() => setMigrationDone(false), 4000)
                } catch {
                  alert('Migration failed. Check server logs.')
                }
                setMigrating(false)
              }}
              disabled={migrating}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
              {migrating ? 'Migrating…' : 'Confirm Migration'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

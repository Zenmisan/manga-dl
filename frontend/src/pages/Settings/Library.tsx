import { useState } from 'react'
import { Shuffle, CheckCircle2 } from 'lucide-react'
import { ThemedSpinner } from '../../components/common/ThemedLoader'
import { motion } from 'framer-motion'
import api from '../../lib/api'

const INPUT_STYLE: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-hover)', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }

function CardLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 14, height: 14, color: 'var(--accent)' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted2)' }}>{title}</span>
    </div>
  )
}

export default function LibrarySettings() {
  const [migrationSearch, setMigrationSearch] = useState('')
  const [migrationResults, setMigrationResults] = useState<{ id: string; title: string; cover_url?: string; provider: string }[]>([])
  const [migrationSearching, setMigrationSearching] = useState(false)
  const [migrationSource, setMigrationSource] = useState<{ old_provider: string; old_manga_id: string; title: string } | null>(null)
  const [migrationTarget, setMigrationTarget] = useState<{ id: string; title: string; provider: string } | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [migrationDone, setMigrationDone] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="hidden md:block" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Library & Migration</h1>
        <p style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2 }}>Manage library layout and migrate manga across sources.</p>
      </div>

      <motion.section className="glass-card" style={{ padding: '22px 20px', marginBottom: 14 }}>
        <CardLabel icon={Shuffle} title="Migrate Manga Source" />
        <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 16 }}>
          Move a manga from one source provider to another without losing your read history or bookmarks.
        </p>

        {migrationDone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: 'rgb(74,222,128)', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            <CheckCircle2 style={{ width: 16, height: 16 }} /> Migration completed successfully!
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>Step 1 — Find the manga to migrate</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={migrationSearch}
              onChange={e => setMigrationSearch(e.target.value)}
              placeholder="Search library manga..."
              style={{ ...INPUT_STYLE, flex: 1, width: 'auto' }}
            />
            <button
              onClick={async () => {
                if (!migrationSearch.trim()) return
                setMigrationSearching(true)
                try {
                  const res = await api.get('/manga/subscriptions')
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const items = (res.data?.subscriptions || []) as any[]
                  setMigrationResults(items.filter(i => i.title.toLowerCase().includes(migrationSearch.toLowerCase())).slice(0, 10).map(i => ({ id: i.provider_manga_id, title: i.title, cover_url: i.cover_url, provider: i.provider })))
                } catch { setMigrationResults([]) }
                setMigrationSearching(false)
              }}
              disabled={migrationSearching}
              className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
            >
              {migrationSearching ? <ThemedSpinner size="xs" /> : 'Search'}
            </button>
          </div>
          {migrationResults.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {migrationResults.map((r: { id: string; title: string; provider: string }) => (
                <button key={r.id}
                  onClick={() => { setMigrationSource({ old_provider: r.provider, old_manga_id: r.id, title: r.title }); setMigrationResults([]); setMigrationSearch(r.title); setMigrationTarget(null) }}
                  style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: migrationSource?.old_manga_id === r.id ? 'rgba(220,38,38,0.1)' : 'var(--surface)', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: 700 }}>{r.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted3)', marginLeft: 8 }}>{r.provider}</span>
                </button>
              ))}
            </div>
          )}
          {migrationSource && (
            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.07)', fontSize: 13 }}>
              Selected: <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{migrationSource.title}</span>
              <span style={{ fontSize: 11, color: 'var(--muted3)', marginLeft: 8 }}>from {migrationSource.old_provider}</span>
            </div>
          )}
        </div>

        {migrationSource && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>Step 2 — Search on another source</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input defaultValue={migrationSource.title} id="mig-target-search" style={{ ...INPUT_STYLE, flex: 1, width: 'auto' }} />
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
                disabled={migrationSearching} className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
              >
                {migrationSearching ? <ThemedSpinner size="xs" /> : 'Find'}
              </button>
            </div>
            {migrationResults.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {migrationResults.map((r: any) => (
                  <button key={`${r.provider}:${r.id}`}
                    onClick={() => { setMigrationTarget({ id: r.id, title: r.title, provider: r.provider }); setMigrationResults([]) }}
                    style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: migrationTarget?.id === r.id && migrationTarget?.provider === r.provider ? 'rgba(220,38,38,0.1)' : 'var(--surface)', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' }}
                  >
                    <span style={{ fontWeight: 700 }}>{r.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted3)', marginLeft: 8 }}>{r.provider}</span>
                  </button>
                ))}
              </div>
            )}
            {migrationTarget && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(56,189,248,0.25)', background: 'rgba(56,189,248,0.07)', fontSize: 13 }}>
                Target: <span style={{ fontWeight: 700, color: 'rgb(56,189,248)' }}>{migrationTarget.title}</span>
                <span style={{ fontSize: 11, color: 'var(--muted3)', marginLeft: 8 }}>on {migrationTarget.provider}</span>
              </div>
            )}
          </div>
        )}

        {migrationSource && migrationTarget && (
          <button
            onClick={async () => {
              if (!confirm(`Migrate "${migrationSource.title}" from ${migrationSource.old_provider} to "${migrationTarget.title}" on ${migrationTarget.provider}?`)) return
              setMigrating(true)
              try {
                await api.post('/manga/migrate', { old_provider: migrationSource.old_provider, old_manga_id: migrationSource.old_manga_id, new_provider: migrationTarget.provider, new_manga_id: migrationTarget.id })
                setMigrationDone(true); setMigrationSource(null); setMigrationTarget(null); setMigrationSearch('')
                setTimeout(() => setMigrationDone(false), 4000)
              } catch { alert('Migration failed. Check server logs.') }
              setMigrating(false)
            }}
            disabled={migrating} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
          >
            {migrating ? <ThemedSpinner size="sm" /> : <Shuffle style={{ width: 14, height: 14 }} />}
            {migrating ? 'Migrating…' : 'Confirm Migration'}
          </button>
        )}
      </motion.section>
    </div>
  )
}

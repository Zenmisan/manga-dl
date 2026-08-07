import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, RefreshCw, CheckCircle2, DownloadCloud, UploadCloud, BookOpen, Cloud, Save, User, LogOut, UserPlus, Wifi, Server } from 'lucide-react'
import { ThemedSpinner } from '../../components/common/ThemedLoader'
import { motion } from 'framer-motion'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import api from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../lib/store'

const SECTION: React.CSSProperties = { padding: '22px 20px', marginBottom: 14 }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--border)', minHeight: 52 }
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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      style={{ width: 48, height: 28, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--surface-hover)', border: 'none', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
    >
      <span style={{ position: 'absolute', top: 4, width: 20, height: 20, borderRadius: 999, background: '#fff', left: on ? 24 : 4, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
    </button>
  )
}

const ease = [0.16, 1, 0.3, 1] as const

export default function SystemSettings() {
  const navigate = useNavigate()
  const { syncWifiOnly, setSyncWifiOnly } = useAppStore()
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [cloudBackupLoading, setCloudBackupLoading] = useState(false)
  const [cloudBackupDone, setCloudBackupDone] = useState(false)
  const [komgaUrl, setKomgaUrl] = useState(localStorage.getItem('komga-url') || '')
  const [komgaUser, setKomgaUser] = useState(localStorage.getItem('komga-username') || '')
  const [komgaPass, setKomgaPass] = useState('')
  const [komgaSaving, setKomgaSaving] = useState(false)
  const [suwayomiUrl, setSuwayomiUrl] = useState(localStorage.getItem('suwayomi-url') || '')
  const [suwayomiSaving, setSuwayomiSaving] = useState(false)
  const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  const [downloadPath, setDownloadPath] = useState(localStorage.getItem('manga-dl-download-path') || '')
  const [syncEnabled, setSyncEnabled] = useState(localStorage.getItem('desktop-sync-enabled') === 'true')
  const [syncInterval, setSyncInterval] = useState(Number(localStorage.getItem('desktop-sync-interval') || '60'))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSupabaseUser(data.session?.user ?? null) })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => { setSupabaseUser(session?.user ?? null) })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleRunSync = async () => {
    if (syncing) return
    setSyncing(true); setSyncDone(false)
    try { await api.post('/manga/sync'); setSyncDone(true); setTimeout(() => setSyncDone(false), 3000) }
    catch (err) { console.error(err) }
    finally { setSyncing(false) }
  }

  const handleExportBackup = async () => {
    try {
      const [libraryRes, historyRes, cloudHistoryRes] = await Promise.allSettled([api.get('/library'), api.get('/users/history'), api.get('/backup/export/manual')])
      const backup = { version: '2.0', app: 'manga-dl', exported_at: new Date().toISOString(), library: libraryRes.status === 'fulfilled' ? libraryRes.value.data : [], cloud_history: cloudHistoryRes.status === 'fulfilled' ? cloudHistoryRes.value.data?.cloud_history ?? [] : [], reading_history: historyRes.status === 'fulfilled' ? historyRes.value.data : [], local: { read_tracking: localStorage.getItem('manga-dl-read'), bookmarks: localStorage.getItem('manga-dl-bookmarks'), categories: localStorage.getItem('manga-dl-categories'), manga_categories: localStorage.getItem('manga-dl-manga-categories'), notes: localStorage.getItem('manga-dl-notes'), reading_goals: localStorage.getItem('manga-dl-reading-goals'), tracker_links: localStorage.getItem('manga-dl-tracker-links'), reader_prefs: localStorage.getItem('manga-dl-prefs') }, settings: { backend_url: localStorage.getItem('manga-backend-url'), anilist_client_id: localStorage.getItem('anilist-client-id'), mal_client_id: localStorage.getItem('mal-client-id'), notifications_enabled: localStorage.getItem('notifications-enabled') } }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `manga-dl-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url)
    } catch { alert('Export failed.') }
  }

  const handleImportBackup = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
      try {
        const text = await file.text(); const backup = JSON.parse(text); const restored: string[] = []; const local = backup.local ?? {}
        if (local.read_tracking) { localStorage.setItem('manga-dl-read', local.read_tracking); restored.push('read tracking') }
        if (local.bookmarks) { localStorage.setItem('manga-dl-bookmarks', local.bookmarks); restored.push('bookmarks') }
        if (local.categories) { localStorage.setItem('manga-dl-categories', local.categories); restored.push('categories') }
        if (local.manga_categories) { localStorage.setItem('manga-dl-manga-categories', local.manga_categories); restored.push('manga categories') }
        if (local.notes) { localStorage.setItem('manga-dl-notes', local.notes); restored.push('notes') }
        if (local.reading_goals) { localStorage.setItem('manga-dl-reading-goals', local.reading_goals); restored.push('reading goals') }
        if (local.tracker_links) { localStorage.setItem('manga-dl-tracker-links', local.tracker_links); restored.push('tracker links') }
        if (local.reader_prefs) { localStorage.setItem('manga-dl-prefs', local.reader_prefs); restored.push('reader preferences') }
        alert(`Restored: ${restored.join(', ') || 'nothing'}\n\nReload to apply.`)
      } catch { alert('Import failed.') }
    }
    input.click()
  }

  const handleTachiyomiImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.tachibk,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed: any
        if (file.name.endsWith('.tachibk')) { const form = new FormData(); form.append('file', file); const res = await api.post('/backup/import/tachibk', form, { headers: { 'Content-Type': 'multipart/form-data' } }); parsed = res.data }
        else { const text = await file.text(); const data = JSON.parse(text); parsed = { manga: data.backupManga || data.manga || data.library || [], categories: data.backupCategories || data.categories || [] } }
        alert(`Parsed ${parsed.manga.length} manga. Import logic would go here.`)
      } catch { alert('Tachiyomi import failed.') }
    }
    input.click()
  }

  const handleCloudBackup = async () => {
    if (!supabaseUser) return
    setCloudBackupLoading(true); setCloudBackupDone(false)
    try {
      const [libraryRes, historyRes] = await Promise.allSettled([api.get('/library'), api.get('/users/history')])
      const backup = { version: 1, exportedAt: new Date().toISOString(), library: libraryRes.status === 'fulfilled' ? libraryRes.value.data : [], readingHistory: historyRes.status === 'fulfilled' ? historyRes.value.data : [], settings: { readerPrefs: localStorage.getItem('manga-dl-prefs'), categories: localStorage.getItem('manga-dl-categories'), mangaCategories: localStorage.getItem('manga-dl-manga-categories'), readTracking: localStorage.getItem('manga-dl-read'), bookmarks: localStorage.getItem('manga-dl-bookmarks') } }
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const path = `backups/${supabaseUser.id}/backup-${Date.now()}.json`
      const { error } = await supabase.storage.from('manga-backups').upload(path, blob, { upsert: true })
      if (error) throw error
      setCloudBackupDone(true); setTimeout(() => setCloudBackupDone(false), 3000)
    } catch { alert('Cloud backup failed.') } finally { setCloudBackupLoading(false) }
  }

  const handleCloudRestore = async () => {
    if (!supabaseUser) return
    try {
      const { data: files, error } = await supabase.storage.from('manga-backups').list(`backups/${supabaseUser.id}`, { sortBy: { column: 'created_at', order: 'desc' } })
      if (error || !files?.length) { alert('No cloud backups found.'); return }
      const latest = files[0]
      const { data: fileData } = await supabase.storage.from('manga-backups').download(`backups/${supabaseUser.id}/${latest.name}`)
      if (!fileData) throw new Error('Download failed')
      const text = await fileData.text(); const backup = JSON.parse(text); const s = backup.settings ?? {}
      if (s.readerPrefs) localStorage.setItem('manga-dl-prefs', s.readerPrefs)
      if (s.categories) localStorage.setItem('manga-dl-categories', s.categories)
      if (s.mangaCategories) localStorage.setItem('manga-dl-manga-categories', s.mangaCategories)
      if (s.readTracking) localStorage.setItem('manga-dl-read', s.readTracking)
      if (s.bookmarks) localStorage.setItem('manga-dl-bookmarks', s.bookmarks)
      alert(`Restored from cloud backup: ${latest.name}\nReload to apply.`)
    } catch { alert('Restore failed.') }
  }

  const handleKomgaSave = async () => {
    if (!komgaUrl.trim()) return
    setKomgaSaving(true)
    try { await api.post('/sources/configure/komga', { base_url: komgaUrl.trim(), username: komgaUser, password: komgaPass }); localStorage.setItem('komga-url', komgaUrl.trim()); localStorage.setItem('komga-username', komgaUser); setKomgaPass(''); alert('Komga connected!') }
    catch { alert('Failed to connect to Komga.') }
    setKomgaSaving(false)
  }

  const handleSuwayomiSave = async () => {
    if (!suwayomiUrl.trim()) return
    setSuwayomiSaving(true)
    try { await api.post('/sources/configure/suwayomi', { base_url: suwayomiUrl.trim() }); localStorage.setItem('suwayomi-url', suwayomiUrl.trim()); alert('Suwayomi connected!') }
    catch { alert('Failed to connect to Suwayomi.') }
    setSuwayomiSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="hidden md:block" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--fg)', marginBottom: 4 }}>System</h2>
        <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Account, sync, backup, and advanced configuration.</p>
      </div>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.4, ease }}
      >
        <CardLabel icon={User} title="Account" />
        {supabaseUser ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 52 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Signed in</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>{supabaseUser.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate(`/profile/${supabaseUser.id}`)} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <User style={{ width: 13, height: 13 }} /> Profile
              </button>
              <button onClick={async () => { try { await supabase.auth.signOut() } catch (e) { console.error(e) } }} className="icon-btn" style={{ width: 36, height: 36, borderRadius: 10 }} title="Sign out">
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/login')} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              <User style={{ width: 14, height: 14 }} /> Sign In
            </button>
            <button onClick={() => navigate('/register')} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              <UserPlus style={{ width: 14, height: 14 }} /> Create Account
            </button>
          </div>
        )}
      </motion.section>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, duration: 0.4, ease }}
      >
        <CardLabel icon={Wifi} title="Sync & Backup" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 52 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Synchronize</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Check for new chapters across all subscribed manga</div>
          </div>
          <button onClick={handleRunSync} disabled={syncing} className="btn-secondary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            {syncing ? <ThemedSpinner size="xs" /> : syncDone ? <CheckCircle2 style={{ width: 13, height: 13, color: 'rgb(74,222,128)' }} /> : <RefreshCw style={{ width: 13, height: 13 }} />}
            {syncing ? 'Syncing...' : syncDone ? 'Done' : 'Run Sync'}
          </button>
        </div>

        <div style={ROW}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>WiFi Only</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Only sync when on WiFi</div>
          </div>
          <Toggle on={syncWifiOnly} onToggle={() => setSyncWifiOnly(!syncWifiOnly)} />
        </div>

        <div style={ROW}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>Backup & Restore</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleExportBackup} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><DownloadCloud style={{ width: 13, height: 13 }} /> Export</button>
              <button onClick={handleImportBackup} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><UploadCloud style={{ width: 13, height: 13 }} /> Import</button>
              <button onClick={handleTachiyomiImport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><BookOpen style={{ width: 13, height: 13 }} /> Tachiyomi</button>
            </div>
          </div>
        </div>

        <div style={ROW}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Cloud style={{ width: 14, height: 14, color: '#8b5cf6' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Cloud Backup</div>
              {!supabaseUser && <span style={{ fontSize: 10, color: 'var(--muted3)', fontWeight: 700 }}>(sign in required)</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCloudBackup} disabled={!supabaseUser || cloudBackupLoading} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: !supabaseUser ? 0.4 : 1 }}>
                {cloudBackupLoading ? <ThemedSpinner size="xs" /> : cloudBackupDone ? <CheckCircle2 style={{ width: 13, height: 13, color: 'rgb(74,222,128)' }} /> : <Cloud style={{ width: 13, height: 13 }} />}
                {cloudBackupDone ? 'Saved!' : 'Backup'}
              </button>
              <button onClick={handleCloudRestore} disabled={!supabaseUser} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: !supabaseUser ? 0.4 : 1 }}>
                <DownloadCloud style={{ width: 13, height: 13 }} /> Restore
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.4, ease }}
      >
        <CardLabel icon={Server} title="Self-Hosted Sources" />

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>Komga</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <input value={komgaUrl} onChange={e => setKomgaUrl(e.target.value)} placeholder="http://localhost:25600" style={INPUT_STYLE} />
            <input value={komgaUser} onChange={e => setKomgaUser(e.target.value)} placeholder="Username" style={INPUT_STYLE} />
          </div>
          <button onClick={handleKomgaSave} disabled={komgaSaving || !komgaUrl.trim()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            {komgaSaving ? <ThemedSpinner size="xs" /> : <Save style={{ width: 13, height: 13 }} />} {localStorage.getItem('komga-url') ? 'Update' : 'Connect'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>Suwayomi</div>
          <input value={suwayomiUrl} onChange={e => setSuwayomiUrl(e.target.value)} placeholder="http://localhost:4567" style={{ ...INPUT_STYLE, marginBottom: 10 }} />
          <button onClick={handleSuwayomiSave} disabled={suwayomiSaving || !suwayomiUrl.trim()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            {suwayomiSaving ? <ThemedSpinner size="xs" /> : <Save style={{ width: 13, height: 13 }} />} {localStorage.getItem('suwayomi-url') ? 'Update' : 'Connect'}
          </button>
        </div>
      </motion.section>

      {isTauri && (
        <motion.section className="glass-card" style={SECTION}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21, duration: 0.4, ease }}
        >
          <CardLabel icon={Database} title="Desktop System" />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>Download Location</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={downloadPath} readOnly placeholder="Default" style={{ ...INPUT_STYLE, flex: 1, width: 'auto', color: 'var(--muted2)' }} />
              <button
                onClick={async () => { const { invoke } = await import('@tauri-apps/api/core'); const path = await invoke<string | null>('pick_folder'); if (path) { setDownloadPath(path); localStorage.setItem('manga-dl-download-path', path) } }}
                className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
              >
                Choose
              </button>
            </div>
          </div>

          <div style={ROW}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Background Sync</div>
            <Toggle on={syncEnabled} onToggle={async () => {
              const next = !syncEnabled; setSyncEnabled(next); localStorage.setItem('desktop-sync-enabled', String(next))
              const { invoke } = await import('@tauri-apps/api/core')
              if (next) invoke('start_background_sync', { intervalMinutes: syncInterval }); else invoke('stop_background_sync')
            }} />
          </div>

          {syncEnabled && (
            <div style={{ ...ROW, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--muted3)', fontWeight: 700 }}>Sync Interval — {syncInterval} min</div>
              <input type="range" min={15} max={720} step={15} value={syncInterval}
                onChange={e => { const val = Number(e.target.value); setSyncInterval(val); localStorage.setItem('desktop-sync-interval', String(val)); import('@tauri-apps/api/core').then(({ invoke }) => invoke('start_background_sync', { intervalMinutes: val })).catch(() => {}) }}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11, color: 'var(--muted3)' }}>
                <span>15m</span><span>12h</span>
              </div>
            </div>
          )}
        </motion.section>
      )}
    </div>
  )
}

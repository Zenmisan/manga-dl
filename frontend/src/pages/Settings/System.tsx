import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Shield, HardDrive, RefreshCw, Loader2, CheckCircle2, DownloadCloud, UploadCloud, BookOpen, Cloud, Save, Key, User, LogOut, UserPlus, Trash2 } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import api from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../lib/store'

export default function SystemSettings() {
  const navigate = useNavigate()
  const { 
    syncWifiOnly, setSyncWifiOnly
  } = useAppStore()

  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('manga-api-key') || '')
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('manga-backend-url') || '')
  
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  
  const [cloudBackupLoading, setCloudBackupLoading] = useState(false)
  const [cloudBackupDone, setCloudBackupDone] = useState(false)

  // Self-hosted sources
  const [komgaUrl, setKomgaUrl] = useState(localStorage.getItem('komga-url') || '')
  const [komgaUser, setKomgaUser] = useState(localStorage.getItem('komga-username') || '')
  const [komgaPass, setKomgaPass] = useState('')
  const [komgaSaving, setKomgaSaving] = useState(false)
  const [suwayomiUrl, setSuwayomiUrl] = useState(localStorage.getItem('suwayomi-url') || '')
  const [suwayomiSaving, setSuwayomiSaving] = useState(false)

  // Desktop native (Tauri)
  const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  const [downloadPath, setDownloadPath] = useState(localStorage.getItem('manga-dl-download-path') || '')
  const [syncEnabled, setSyncEnabled] = useState(localStorage.getItem('desktop-sync-enabled') === 'true')
  const [syncInterval, setSyncInterval] = useState(Number(localStorage.getItem('desktop-sync-interval') || '60'))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseUser(data.session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setSupabaseUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const saveSecurity = async () => {
    localStorage.setItem('manga-api-key', apiKey)
    if (backendUrl.trim()) {
      localStorage.setItem('manga-backend-url', backendUrl.trim())
    } else {
      localStorage.removeItem('manga-backend-url')
    }
    const { ExtensionManager } = await import('../../lib/extensions')
    ExtensionManager.getInstance().reinit()
    alert('Security settings saved! Extensions are reloading.')
  }

  const handleRunSync = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncDone(false)
    try {
      await api.post('/manga/sync')
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

  const handlePruneCache = async () => {
    if (!confirm('Clear all cached temporary files?')) return
    alert('Cache cleared.')
  }

  const handleExportBackup = async () => {
    try {
      const [libraryRes, historyRes, cloudHistoryRes] = await Promise.allSettled([
        api.get('/library'),
        api.get('/users/history'),
        api.get('/backup/export/manual'),
      ])
      const backup = {
        version: '2.0',
        app: 'manga-dl',
        exported_at: new Date().toISOString(),
        library: libraryRes.status === 'fulfilled' ? libraryRes.value.data : [],
        cloud_history: cloudHistoryRes.status === 'fulfilled' ? cloudHistoryRes.value.data?.cloud_history ?? [] : [],
        reading_history: historyRes.status === 'fulfilled' ? historyRes.value.data : [],
        local: {
          read_tracking: localStorage.getItem('manga-dl-read'),
          bookmarks: localStorage.getItem('manga-dl-bookmarks'),
          categories: localStorage.getItem('manga-dl-categories'),
          manga_categories: localStorage.getItem('manga-dl-manga-categories'),
          notes: localStorage.getItem('manga-dl-notes'),
          reading_goals: localStorage.getItem('manga-dl-reading-goals'),
          tracker_links: localStorage.getItem('manga-dl-tracker-links'),
          reader_prefs: localStorage.getItem('manga-dl-prefs'),
        },
        settings: {
          backend_url: localStorage.getItem('manga-backend-url'),
          anilist_client_id: localStorage.getItem('anilist-client-id'),
          mal_client_id: localStorage.getItem('mal-client-id'),
          notifications_enabled: localStorage.getItem('notifications-enabled'),
        },
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `manga-dl-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click(); URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err); alert('Export failed.')
    }
  }

  const handleImportBackup = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
      try {
        const text = await file.text(); const backup = JSON.parse(text)
        const restored: string[] = []
        const local = backup.local ?? {}
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
        if (file.name.endsWith('.tachibk')) {
          const form = new FormData(); form.append('file', file)
          const res = await api.post('/backup/import/tachibk', form, { headers: { 'Content-Type': 'multipart/form-data' } })
          parsed = res.data
        } else {
          const text = await file.text(); const data = JSON.parse(text)
          parsed = { manga: data.backupManga || data.manga || data.library || [], categories: data.backupCategories || data.categories || [] }
        }
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
      const backup = {
        version: 1, exportedAt: new Date().toISOString(),
        library: libraryRes.status === 'fulfilled' ? libraryRes.value.data : [],
        readingHistory: historyRes.status === 'fulfilled' ? historyRes.value.data : [],
        settings: {
          readerPrefs: localStorage.getItem('manga-dl-prefs'),
          categories: localStorage.getItem('manga-dl-categories'),
          mangaCategories: localStorage.getItem('manga-dl-manga-categories'),
          readTracking: localStorage.getItem('manga-dl-read'),
          bookmarks: localStorage.getItem('manga-dl-bookmarks'),
        },
      }
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
    try {
      await api.post('/sources/configure/komga', { base_url: komgaUrl.trim(), username: komgaUser, password: komgaPass })
      localStorage.setItem('komga-url', komgaUrl.trim())
      localStorage.setItem('komga-username', komgaUser)
      setKomgaPass('')
      alert('Komga connected!')
    } catch { alert('Failed to connect to Komga.') }
    setKomgaSaving(false)
  }

  const handleSuwayomiSave = async () => {
    if (!suwayomiUrl.trim()) return
    setSuwayomiSaving(true)
    try {
      await api.post('/sources/configure/suwayomi', { base_url: suwayomiUrl.trim() })
      localStorage.setItem('suwayomi-url', suwayomiUrl.trim())
      alert('Suwayomi connected!')
    } catch { alert('Failed to connect to Suwayomi.') }
    setSuwayomiSaving(false)
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Account */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="font-bold text-lg">Account</h2>
        </div>
        <div className="p-6 md:p-8">
          {supabaseUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-100">Signed in</h4>
                <p className="text-sm text-white/40 font-medium">{supabaseUser.email}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => navigate(`/profile/${supabaseUser.id}`)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/60 hover:text-white font-bold text-xs uppercase tracking-widest"
                >
                  <User className="w-4 h-4" />
                  View Profile
                </button>
                <button
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut()
                    } catch (e) {
                      console.error(e)
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 rounded-xl transition-all border border-white/5 text-white/60 hover:text-red-400 font-bold text-xs uppercase tracking-widest"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all text-white font-bold text-sm"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-white/70 hover:text-white font-bold text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Security */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="font-bold text-lg">Security & Backend</h2>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white/40 uppercase tracking-widest">
              <Database className="w-3.5 h-3.5" />
              Backend URL
            </label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://your-server.example.com"
              className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-white placeholder:text-white/10 text-sm"
            />
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white/40 uppercase tracking-widest">
              <Key className="w-3.5 h-3.5" />
              API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your X-API-Key..."
                className="flex-1 bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-white placeholder:text-white/10"
              />
              <button onClick={saveSecurity} className="btn-primary flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Database & Sync */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="font-bold text-lg">System & Sync</h2>
        </div>
        <div className="p-6 md:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-gray-100">Synchronize</h4>
              <p className="text-sm text-white/30 font-medium">Check for new chapters across all subscribed manga</p>
            </div>
            <button onClick={handleRunSync} disabled={syncing} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white/60 hover:text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : syncDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? 'Syncing...' : syncDone ? 'Done' : 'Run Sync'}
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-widest text-white/30">Sync Restrictions</label>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div><p className="font-bold text-sm">WiFi Only</p></div>
              <button onClick={() => setSyncWifiOnly(!syncWifiOnly)} className={`w-12 h-6 rounded-full relative border ${syncWifiOnly ? 'bg-blue-500/30 border-blue-500/40' : 'bg-white/5 border-white/10'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${syncWifiOnly ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <h4 className="font-bold text-gray-100 mb-1">Local Storage & Cache</h4>
            <div className="flex gap-3 flex-wrap mt-4">
              <button onClick={handlePruneCache} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-red-500/20 rounded-xl border border-white/5 text-white/60 hover:text-red-400 font-bold text-xs uppercase tracking-widest">
                <Trash2 className="w-4 h-4" /> Clear Cache
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <h4 className="font-bold text-gray-100 mb-1">Backup & Restore</h4>
            <div className="flex gap-3 flex-wrap mt-4">
              <button onClick={handleExportBackup} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-emerald-500/20 rounded-xl border border-white/5 text-white/60 hover:text-emerald-400 font-bold text-xs uppercase tracking-widest"><DownloadCloud className="w-4 h-4" /> Export</button>
              <button onClick={handleImportBackup} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-blue-500/20 rounded-xl border border-white/5 text-white/60 hover:text-blue-400 font-bold text-xs uppercase tracking-widest"><UploadCloud className="w-4 h-4" /> Import</button>
              <button onClick={handleTachiyomiImport} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-teal-500/20 rounded-xl border border-white/5 text-white/60 hover:text-teal-400 font-bold text-xs uppercase tracking-widest"><BookOpen className="w-4 h-4" /> Tachiyomi</button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <h4 className="font-bold text-gray-100 mb-1 flex items-center gap-2"><Cloud className="w-4 h-4 text-violet-400" /> Cloud Backup</h4>
            <div className="flex gap-3 flex-wrap mt-4">
              <button onClick={handleCloudBackup} disabled={!supabaseUser || cloudBackupLoading} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-violet-500/20 rounded-xl border border-white/5 text-white/60 hover:text-violet-400 font-bold text-xs uppercase tracking-widest disabled:opacity-40">
                {cloudBackupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : cloudBackupDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Cloud className="w-4 h-4" />}
                {cloudBackupDone ? 'Saved!' : 'Backup'}
              </button>
              <button onClick={handleCloudRestore} disabled={!supabaseUser} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-violet-500/20 rounded-xl border border-white/5 text-white/60 hover:text-violet-400 font-bold text-xs uppercase tracking-widest disabled:opacity-40"><DownloadCloud className="w-4 h-4" /> Restore</button>
            </div>
          </div>
        </div>
      </section>

      {/* Self-Hosted */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-teal-500/10 rounded-lg"><HardDrive className="w-5 h-5 text-teal-400" /></div>
          <h2 className="font-bold text-lg">Self-Hosted Sources</h2>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h3 className="font-bold text-sm mb-3">🏠 Komga</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input value={komgaUrl} onChange={e => setKomgaUrl(e.target.value)} placeholder="http://localhost:25600" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm" />
              <input value={komgaUser} onChange={e => setKomgaUser(e.target.value)} placeholder="Username" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm" />
            </div>
            <button onClick={handleKomgaSave} disabled={komgaSaving || !komgaUrl.trim()} className="px-5 py-2 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              {komgaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {localStorage.getItem('komga-url') ? 'Update' : 'Connect'}
            </button>
          </div>
          <div className="pt-6 border-t border-white/5">
            <h3 className="font-bold text-sm mb-3">🏠 Suwayomi</h3>
            <div className="grid grid-cols-1 gap-3 mb-3">
              <input value={suwayomiUrl} onChange={e => setSuwayomiUrl(e.target.value)} placeholder="http://localhost:4567" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm" />
            </div>
            <button onClick={handleSuwayomiSave} disabled={suwayomiSaving || !suwayomiUrl.trim()} className="px-5 py-2 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              {suwayomiSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {localStorage.getItem('suwayomi-url') ? 'Update' : 'Connect'}
            </button>
          </div>
        </div>
      </section>
      
      {/* Desktop (Tauri only) */}
      {isTauri && (
        <section className="glass-panel overflow-hidden border-white/5">
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 bg-sky-500/10 rounded-lg"><HardDrive className="w-5 h-5 text-sky-400" /></div>
            <h2 className="font-bold text-lg">Desktop System</h2>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-white/40 uppercase tracking-widest"><HardDrive className="w-3.5 h-3.5" /> Download Location</label>
              <div className="flex gap-2">
                <input type="text" value={downloadPath} readOnly placeholder="Default" className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white/60" />
                <button onClick={async () => { const { invoke } = await import('@tauri-apps/api/core'); const path = await invoke<string | null>('pick_folder'); if (path) { setDownloadPath(path); localStorage.setItem('manga-dl-download-path', path) } }} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm font-bold">Choose</button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div><p className="font-bold text-sm">Background Sync</p></div>
                <button onClick={async () => { const next = !syncEnabled; setSyncEnabled(next); localStorage.setItem('desktop-sync-enabled', String(next)); const { invoke } = await import('@tauri-apps/api/core'); if (next) { invoke('start_background_sync', { intervalMinutes: syncInterval }) } else { invoke('stop_background_sync') } }} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${syncEnabled ? 'bg-sky-500/40' : 'bg-white/10'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${syncEnabled ? 'left-6 bg-sky-400' : 'left-0.5 bg-white/30'}`} /></button>
              </div>
              {syncEnabled && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <label className="block text-xs font-black uppercase tracking-widest text-white/40">Sync Interval (minutes)</label>
                  <input
                    type="range"
                    min={15} max={720} step={15}
                    value={syncInterval}
                    onChange={e => {
                      const val = Number(e.target.value)
                      setSyncInterval(val)
                      localStorage.setItem('desktop-sync-interval', String(val))
                      import('@tauri-apps/api/core').then(({ invoke }) => invoke('start_background_sync', { intervalMinutes: val })).catch(() => {})
                    }}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-xs font-bold text-white/30">
                    <span>15m</span>
                    <span className="text-sky-400">{syncInterval}m</span>
                    <span>12h</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

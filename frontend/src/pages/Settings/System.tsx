import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, RefreshCw, CheckCircle2, DownloadCloud, UploadCloud, BookOpen, Cloud, Save, User, LogOut, UserPlus, Wifi, Server, HardDrive, Trash2 } from 'lucide-react'
import { ThemedSpinner } from '../../components/common/ThemedLoader'
import { motion } from 'framer-motion'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { QK } from '../../lib/queries'
import api from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../lib/store'
import { batchAddSubscriptions } from '../../lib/supabaseSubscriptions'
import { getStorageEstimate, clearImageAndReadingCaches, clearLocalUploadedArchives, clearAllOfflineStorage, type StorageEstimateInfo } from '../../lib/storageManager'

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
  const queryClient = useQueryClient()
  const { syncWifiOnly, setSyncWifiOnly } = useAppStore()
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [cloudBackupLoading, setCloudBackupLoading] = useState(false)
  const [cloudBackupDone, setCloudBackupDone] = useState(false)
  const [tachiyomiLoading, setTachiyomiLoading] = useState(false)
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
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo | null>(null)
  const [clearingCache, setClearingCache] = useState(false)
  const [clearingUploads, setClearingUploads] = useState(false)
  const [purgingAll, setPurgingAll] = useState(false)
  const [storageNotice, setStorageNotice] = useState<string | null>(null)

  const refreshStorage = useCallback(async () => {
    try {
      const info = await getStorageEstimate()
      setStorageInfo(info)
    } catch {
      // Non-fatal
    }
  }, [])

  useEffect(() => {
    refreshStorage()
  }, [refreshStorage])

  const handleClearCache = async () => {
    if (!window.confirm('Clear temporary reading and image cache? Your offline archives and reading progress will remain intact.')) return
    setClearingCache(true)
    setStorageNotice(null)
    try {
      await clearImageAndReadingCaches()
      await refreshStorage()
      setStorageNotice('Image and reading cache successfully cleared.')
      setTimeout(() => setStorageNotice(null), 4000)
    } catch (e) {
      alert('Failed to clear cache: ' + String(e))
    } finally {
      setClearingCache(false)
    }
  }

  const handleClearUploads = async () => {
    if (!window.confirm(`Delete all ${storageInfo?.localArchivesCount || 0} local uploaded archives from browser storage? This cannot be undone.`)) return
    setClearingUploads(true)
    setStorageNotice(null)
    try {
      await clearLocalUploadedArchives()
      await refreshStorage()
      queryClient.invalidateQueries({ queryKey: QK.library })
      setStorageNotice('All local uploaded archives removed from browser storage.')
      setTimeout(() => setStorageNotice(null), 4000)
    } catch (e) {
      alert('Failed to delete uploads: ' + String(e))
    } finally {
      setClearingUploads(false)
    }
  }

  const handlePurgeAll = async () => {
    if (!window.confirm('Purge all offline data, image caches, and uploaded archives? This will free up all browser storage used by manga-dl.')) return
    setPurgingAll(true)
    setStorageNotice(null)
    try {
      await clearAllOfflineStorage()
      await refreshStorage()
      queryClient.invalidateQueries({ queryKey: QK.library })
      setStorageNotice('All offline data and caches purged.')
      setTimeout(() => setStorageNotice(null), 4000)
    } catch (e) {
      alert('Failed to purge data: ' + String(e))
    } finally {
      setPurgingAll(false)
    }
  }

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
      const [libraryRes, historyRes, cloudHistoryRes] = await Promise.allSettled([
        api.get('/library'),
        api.get('/users/history'),
        api.get('/backup/export/manual')
      ])

      const rawLibrary = libraryRes.status === 'fulfilled' && Array.isArray(libraryRes.value.data) ? libraryRes.value.data : []
      const rawHistory = historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data) ? historyRes.value.data : []
      const cloudHistory = cloudHistoryRes.status === 'fulfilled' ? cloudHistoryRes.value.data?.cloud_history ?? [] : []

      const readTrackingStr = localStorage.getItem('manga-dl-read') || '{}'
      let readTracking: Record<string, string[]> = {}
      try { readTracking = JSON.parse(readTrackingStr) } catch {}

      const bookmarksStr = localStorage.getItem('manga-dl-bookmarks') || '{}'
      const categoriesStr = localStorage.getItem('manga-dl-categories') || '[]'
      let categories: string[] = []
      try { categories = JSON.parse(categoriesStr) } catch {}

      const mangaCategoriesStr = localStorage.getItem('manga-dl-manga-categories') || '{}'
      let mangaCategories: Record<string, string[]> = {}
      try { mangaCategories = JSON.parse(mangaCategoriesStr) } catch {}

      const trackerLinksStr = localStorage.getItem('manga-dl-tracker-links') || '{}'
      let trackerLinks: Record<string, Record<string, any>> = {}
      try { trackerLinks = JSON.parse(trackerLinksStr) } catch {}

      const userScope = supabaseUser?.id ?? 'anon'
      const localMeta: Record<string, any> = JSON.parse(localStorage.getItem(`manga-dl-local-sub-meta:${userScope}`) || '{}')
      const mergedMangaMap = new Map<string, any>()

      // 1. Add backend library items
      for (const m of rawLibrary) {
        const id = m.provider_manga_id || m.manga_id || m.id || ''
        const prov = m.provider || 'mangadex'
        const compKey = `${prov}:${id}`
        const title = m.title || ''
        const cats = mangaCategories[title.toLowerCase().trim()] || mangaCategories[id] || mangaCategories[compKey] || []
        mergedMangaMap.set(compKey, {
          id,
          title,
          coverUrl: m.cover_url || m.coverUrl || '',
          provider: prov,
          url: m.url || '',
          type: m.type || (prov === 'royalroad' || prov === 'novelbin' ? 'novel' : 'manga'),
          addedAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
          lastReadChapterId: m.last_read_chapter_id || m.lastReadChapterId || null,
          lastReadAt: m.last_read_at ? new Date(m.last_read_at).getTime() : null,
          totalChapters: m.total_chapters || m.totalChapters || 0,
          readCount: (readTracking[compKey] || []).length,
          categories: cats,
        })
      }

      // 2. Merge local / guest items if not already added
      for (const [k, meta] of Object.entries(localMeta)) {
        if (!mergedMangaMap.has(k)) {
          const prov = meta.provider || k.split(':')[0] || 'mangadex'
          const id = meta.mangaId || k.slice(prov.length + 1) || ''
          const title = meta.title || ''
          const cats = mangaCategories[title.toLowerCase().trim()] || mangaCategories[id] || mangaCategories[k] || []
          mergedMangaMap.set(k, {
            id,
            title,
            coverUrl: meta.cover_url || '',
            provider: prov,
            url: meta.url || '',
            type: prov === 'royalroad' || prov === 'novelbin' ? 'novel' : 'manga',
            addedAt: Date.now(),
            totalChapters: 0,
            readCount: (readTracking[k] || []).length,
            categories: cats,
          })
        }
      }

      const backupLibrary = Array.from(mergedMangaMap.values())

      // 3. Build universal reading progress entries (matches Windows & Android)
      const backupProgress: any[] = []
      for (const [compKey, chIds] of Object.entries(readTracking)) {
        const sepIdx = compKey.indexOf(':')
        const prov = sepIdx > 0 ? compKey.slice(0, sepIdx) : 'mangadex'
        const mangaId = sepIdx > 0 ? compKey.slice(sepIdx + 1) : compKey
        for (const chId of chIds) {
          const parsedNum = parseFloat(chId.replace(/[^0-9.]/g, '')) || 0
          backupProgress.push({
            mangaId,
            chapterId: chId,
            provider: prov,
            page: 1,
            totalPages: 1,
            readAt: Date.now(),
            completed: true,
            chapterNumber: parsedNum,
          })
        }
      }

      // 4. Build universal tracker bindings
      const backupTrackerBinds: any[] = []
      for (const [compKey, tMap] of Object.entries(trackerLinks)) {
        const sepIdx = compKey.indexOf(':')
        const prov = sepIdx > 0 ? compKey.slice(0, sepIdx) : 'mangadex'
        const mangaId = sepIdx > 0 ? compKey.slice(sepIdx + 1) : compKey
        for (const [tName, tData] of Object.entries(tMap)) {
          backupTrackerBinds.push({
            provider: prov,
            mangaId,
            tracker: tName === 'mal' ? 'MyAnimeList' : tName === 'anilist' ? 'AniList' : tName,
            remoteId: tData.id || 0,
            remoteTitle: tData.title || '',
            lastChapterRead: tData.progress || 0,
            score: tData.score || 0,
            status: tData.status || '',
          })
        }
      }

      const now = new Date()
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const backup = {
        version: '1.0',
        app: 'manga-dl',
        exportedAt: now.getTime(),
        library: backupLibrary,
        progress: backupProgress,
        categories,
        mangaCategories,
        trackerBinds: backupTrackerBinds,
        cloud_history: cloudHistory,
        reading_history: rawHistory,
        local: {
          read_tracking: readTrackingStr,
          bookmarks: bookmarksStr,
          categories: categoriesStr,
          manga_categories: mangaCategoriesStr,
          notes: localStorage.getItem('manga-dl-notes'),
          reading_goals: localStorage.getItem('manga-dl-reading-goals'),
          tracker_links: trackerLinksStr,
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
      a.href = url
      a.download = `manga-dl-backup-${timestamp}.mangadl`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Export failed.')
    }
  }

  const executeTachiyomiImport = async (file: File) => {
    setTachiyomiLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = null

      try {
        const form = new FormData()
        form.append('file', file)
        const res = await api.post('/backup/import/tachibk', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        data = res.data
      } catch (apiErr) {
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          const raw = JSON.parse(text)
          const mangaRaw = raw.backupManga || raw.manga || raw.library || []
          const catsRaw = raw.backupCategories || raw.categories || []
          const sourcesRaw = raw.backupSources || raw.sources || []

          const catMap: Record<number, string> = {}
          catsRaw.forEach((c: any, i: number) => {
            catMap[i + 1] = typeof c === 'string' ? c : c.name || ''
          })
          const sourceMap: Record<number, string> = {}
          sourcesRaw.forEach((s: any) => {
            if (s.sourceId || s.source_id) sourceMap[s.sourceId || s.source_id] = s.name || ''
          })

          const categories: string[] = catsRaw.map((c: any) => typeof c === 'string' ? c : c.name || '').filter(Boolean)
          const mangaCategories: Record<string, string[]> = {}
          const readTracking: Record<string, string[]> = {}
          const bookmarks: Record<string, string[]> = {}
          const trackerLinks: Record<string, Record<string, any>> = {}
          const localSubMeta: Record<string, any> = {}

          const trackerNameMap: Record<number, string> = {
            1: 'mal', 2: 'anilist', 3: 'kitsu', 4: 'shikimori', 5: 'bangumi', 6: 'mangaupdates',
          }

          for (const m of mangaRaw) {
            const title = (m.title || '').trim()
            if (!title) continue

            const srcName = sourceMap[m.source] || (typeof m.source === 'string' ? m.source : '')
            const url = m.url || ''
            let prov = 'mangadex'
            const lowerTarget = `${srcName} ${url}`.toLowerCase()
            if (lowerTarget.includes('asura')) prov = 'asurascans'
            else if (lowerTarget.includes('omega')) prov = 'omegascans'
            else if (lowerTarget.includes('flame')) prov = 'flamescans'
            else if (lowerTarget.includes('katana')) prov = 'mangakatana'
            else if (lowerTarget.includes('kakalot')) prov = 'mangakakalot'
            else if (lowerTarget.includes('nato')) prov = 'manganato'
            else if (lowerTarget.includes('bato')) prov = 'bato'
            else if (lowerTarget.includes('pill')) prov = 'mangapill'
            else if (lowerTarget.includes('tcb')) prov = 'tcbscans'
            else if (lowerTarget.includes('webtoon')) prov = 'webtoons'
            else if (lowerTarget.includes('royalroad')) prov = 'royalroad'
            else if (lowerTarget.includes('novelbin')) prov = 'novelbin'
            else if (srcName) prov = srcName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'tachiyomi'

            let mangaId = url.replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^[/?#]+|[/?#]+$/g, '')
            const mdMatch = mangaId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
            if (prov === 'mangadex' && mdMatch) mangaId = mdMatch[0].toLowerCase()
            else {
              for (const pfx of ['manga/', 'series/', 'title/', 'comic/']) {
                if (mangaId.startsWith(pfx)) { mangaId = mangaId.slice(pfx.length); break }
              }
            }
            mangaId = mangaId || 'unknown'
            const compKey = `${prov}:${mangaId}`

            const mCatIds = m.categories || m.category_ids || []
            const mCats: string[] = []
            for (const cid of mCatIds) {
              if (typeof cid === 'string') mCats.push(cid)
              else if (catMap[cid]) mCats.push(catMap[cid])
            }
            if (mCats.length > 0) {
              mangaCategories[title.toLowerCase().trim()] = mCats
              mCats.forEach(c => { if (!categories.includes(c)) categories.push(c) })
            }

            const readIds: string[] = []
            const bmIds: string[] = []
            for (const ch of (m.chapters || [])) {
              let chId = (ch.url || '').split('?')[0].split('#')[0].replace(/\/+$/, '')
              if (chId.includes('/')) chId = chId.split('/').pop() || chId
              chId = chId || String(ch.chapterNumber || ch.chapter_number || 'ch-1')
              if (ch.read) readIds.push(chId)
              if (ch.bookmark) bmIds.push(chId)
            }
            if (readIds.length > 0) readTracking[compKey] = readIds
            if (bmIds.length > 0) bookmarks[compKey] = bmIds

            const mTrackers: Record<string, any> = {}
            for (const tr of (m.tracking || [])) {
              const sId = tr.syncId || tr.sync_id || 0
              const tName = trackerNameMap[sId]
              const mId = tr.mediaId || tr.media_id || 0
              if (tName && mId) {
                mTrackers[tName] = {
                  id: mId,
                  title: tr.title || title,
                  score: Number(tr.score || 0),
                  status: String(tr.status || 0),
                  progress: Math.floor(Number(tr.lastChapterRead || tr.last_chapter_read || 0)),
                }
              }
            }
            if (Object.keys(mTrackers).length > 0) trackerLinks[compKey] = mTrackers

            localSubMeta[compKey] = {
              title,
              cover_url: m.thumbnailUrl || m.thumbnail_url || null,
              provider: prov,
              mangaId,
            }
          }

          data = {
            success: true,
            imported_manga_count: Object.keys(localSubMeta).length,
            imported_categories_count: categories.length,
            imported_chapters_count: Object.values(readTracking).reduce((acc, c) => acc + c.length, 0),
            imported_bookmarks_count: Object.values(bookmarks).reduce((acc, b) => acc + b.length, 0),
            categories,
            manga_categories: mangaCategories,
            read_tracking: readTracking,
            bookmarks,
            tracker_links: trackerLinks,
            local_sub_meta: localSubMeta,
            local_subs: Object.keys(localSubMeta),
          }
        } else {
          throw apiErr
        }
      }

      if (!data || !data.local_sub_meta) {
        throw new Error('No manga found in backup file.')
      }

      if (data.categories && Array.isArray(data.categories)) {
        const existingCats: string[] = JSON.parse(localStorage.getItem('manga-dl-categories') || '["Reading","Completed","On Hold","Plan to Read","Dropped"]')
        const mergedCats = [...new Set([...existingCats, ...data.categories])].filter(Boolean)
        localStorage.setItem('manga-dl-categories', JSON.stringify(mergedCats))
      }

      if (data.manga_categories && typeof data.manga_categories === 'object') {
        const existingAssigns: Record<string, string[]> = JSON.parse(localStorage.getItem('manga-dl-manga-categories') || '{}')
        for (const [titleKey, cats] of Object.entries(data.manga_categories as Record<string, string[]>)) {
          const existing = new Set(existingAssigns[titleKey] || [])
          cats.forEach(c => existing.add(c))
          existingAssigns[titleKey] = Array.from(existing)
        }
        localStorage.setItem('manga-dl-manga-categories', JSON.stringify(existingAssigns))
      }

      const userScope = supabaseUser?.id ?? 'anon'
      const scopedSubsKey = `manga-dl-local-subs:${userScope}`
      const scopedMetaKey = `manga-dl-local-sub-meta:${userScope}`

      const existingSubs: string[] = JSON.parse(localStorage.getItem(scopedSubsKey) || '[]')
      const existingMeta: Record<string, { title: string; cover_url: string | null; provider: string; mangaId: string }> =
        JSON.parse(localStorage.getItem(scopedMetaKey) || '{}')

      const subsSet = new Set(existingSubs)
      for (const [k, meta] of Object.entries(data.local_sub_meta as Record<string, any>)) {
        subsSet.add(k)
        existingMeta[k] = {
          title: meta.title,
          cover_url: meta.cover_url ?? null,
          provider: meta.provider,
          mangaId: meta.mangaId,
        }
      }
      localStorage.setItem(scopedSubsKey, JSON.stringify(Array.from(subsSet)))
      localStorage.setItem(scopedMetaKey, JSON.stringify(existingMeta))

      if (userScope !== 'anon') {
        const anonSubs: string[] = JSON.parse(localStorage.getItem('manga-dl-local-subs:anon') || '[]')
        const anonMeta: Record<string, any> = JSON.parse(localStorage.getItem('manga-dl-local-sub-meta:anon') || '{}')
        const anonSet = new Set(anonSubs)
        for (const [k, meta] of Object.entries(data.local_sub_meta as Record<string, any>)) {
          anonSet.add(k)
          anonMeta[k] = {
            title: meta.title,
            cover_url: meta.cover_url ?? null,
            provider: meta.provider,
            mangaId: meta.mangaId,
          }
        }
        localStorage.setItem('manga-dl-local-subs:anon', JSON.stringify(Array.from(anonSet)))
        localStorage.setItem('manga-dl-local-sub-meta:anon', JSON.stringify(anonMeta))
      }

      if (data.read_tracking && typeof data.read_tracking === 'object') {
        const existingRead: Record<string, string[]> = JSON.parse(localStorage.getItem('manga-dl-read') || '{}')
        for (const [k, chList] of Object.entries(data.read_tracking as Record<string, string[]>)) {
          const s = new Set(existingRead[k] || [])
          chList.forEach(id => s.add(id))
          existingRead[k] = Array.from(s)
        }
        localStorage.setItem('manga-dl-read', JSON.stringify(existingRead))
      }

      if (data.bookmarks && typeof data.bookmarks === 'object') {
        const existingBm: Record<string, string[]> = JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')
        for (const [k, bmList] of Object.entries(data.bookmarks as Record<string, string[]>)) {
          const s = new Set(existingBm[k] || [])
          bmList.forEach(id => s.add(id))
          existingBm[k] = Array.from(s)
        }
        localStorage.setItem('manga-dl-bookmarks', JSON.stringify(existingBm))
      }

      if (data.tracker_links && typeof data.tracker_links === 'object') {
        const existingTrackers: Record<string, any> = JSON.parse(localStorage.getItem('manga-dl-tracker-links') || '{}')
        for (const [k, trackers] of Object.entries(data.tracker_links as Record<string, any>)) {
          existingTrackers[k] = {
            ...(existingTrackers[k] || {}),
            ...trackers,
          }
        }
        localStorage.setItem('manga-dl-tracker-links', JSON.stringify(existingTrackers))
      }

      if (supabaseUser) {
        try {
          await supabase.from('user_categories').upsert({
            user_id: supabaseUser.id,
            custom_categories: JSON.parse(localStorage.getItem('manga-dl-categories') || '[]'),
            manga_assignments: JSON.parse(localStorage.getItem('manga-dl-manga-categories') || '{}'),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        } catch { /* non-fatal */ }

        try {
          const readMap = JSON.parse(localStorage.getItem('manga-dl-read') || '{}')
          const rows = Object.entries(readMap).map(([k, chapterIds]) => {
            const [prov, mId] = k.split(':')
            return {
              user_id: supabaseUser.id,
              provider: prov,
              manga_id: mId,
              chapter_ids: chapterIds,
              updated_at: new Date().toISOString(),
            }
          })
          if (rows.length > 0) {
            await supabase.from('read_tracking').upsert(rows, { onConflict: 'user_id,provider,manga_id' })
          }
        } catch { /* non-fatal */ }
      }

      queryClient.invalidateQueries({ queryKey: QK.library })
      queryClient.invalidateQueries({ queryKey: QK.history })

      const mangaCount = data.imported_manga_count ?? Object.keys(data.local_sub_meta || {}).length
      const catCount = data.imported_categories_count ?? (data.categories?.length ?? 0)
      const chCount = data.imported_chapters_count ?? 0

      alert(`Successfully imported ${mangaCount} manga, ${catCount} categories, and ${chCount} read chapters from Tachiyomi backup.\n\nYour library has been updated.`)
    } catch (err: any) {
      alert(`Tachiyomi import failed: ${err?.message || 'Invalid backup file or network error.'}`)
    } finally {
      setTachiyomiLoading(false)
    }
  }

  const handleImportBackup = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mangadl,.json,.tachibk'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.name.endsWith('.tachibk')) {
        await executeTachiyomiImport(file)
        return
      }

      try {
        const text = await file.text()
        const backup = JSON.parse(text)

        // Route Tachiyomi JSON format to Tachiyomi parser
        if (backup && !backup.app && (backup.backupManga || backup.backupCategories || backup.backupSources || backup.manga)) {
          await executeTachiyomiImport(file)
          return
        }

        const restored: string[] = []

        // 1. Restore local & settings keys if present
        const local = backup.local ?? {}
        if (local.read_tracking) { localStorage.setItem('manga-dl-read', local.read_tracking); restored.push('read tracking') }
        if (local.bookmarks) { localStorage.setItem('manga-dl-bookmarks', local.bookmarks); restored.push('bookmarks') }
        if (local.categories) { localStorage.setItem('manga-dl-categories', local.categories); restored.push('categories') }
        if (local.manga_categories) { localStorage.setItem('manga-dl-manga-categories', local.manga_categories); restored.push('manga categories') }
        if (local.notes) { localStorage.setItem('manga-dl-notes', local.notes); restored.push('notes') }
        if (local.reading_goals) { localStorage.setItem('manga-dl-reading-goals', local.reading_goals); restored.push('reading goals') }
        if (local.tracker_links) { localStorage.setItem('manga-dl-tracker-links', local.tracker_links); restored.push('tracker links') }
        if (local.reader_prefs) { localStorage.setItem('manga-dl-prefs', local.reader_prefs); restored.push('reader preferences') }

        const s = backup.settings ?? {}
        if (s.backend_url) localStorage.setItem('manga-backend-url', s.backend_url)
        if (s.anilist_client_id) localStorage.setItem('anilist-client-id', s.anilist_client_id)
        if (s.mal_client_id) localStorage.setItem('mal-client-id', s.mal_client_id)
        if (s.notifications_enabled !== undefined) localStorage.setItem('notifications-enabled', String(s.notifications_enabled))

        // 2. Cross-platform universal Manga-DL categories
        if (Array.isArray(backup.categories) && backup.categories.length > 0) {
          const existingCats: string[] = JSON.parse(localStorage.getItem('manga-dl-categories') || '["Reading","Completed","On Hold","Plan to Read","Dropped"]')
          const mergedCats = [...new Set([...existingCats, ...backup.categories])].filter(Boolean)
          localStorage.setItem('manga-dl-categories', JSON.stringify(mergedCats))
          restored.push(`${backup.categories.length} categories`)
        }

        if (backup.mangaCategories && typeof backup.mangaCategories === 'object') {
          const existingAssigns: Record<string, string[]> = JSON.parse(localStorage.getItem('manga-dl-manga-categories') || '{}')
          for (const [titleKey, cats] of Object.entries(backup.mangaCategories as Record<string, string[]>)) {
            const existing = new Set(existingAssigns[titleKey] || [])
            cats.forEach(c => existing.add(c))
            existingAssigns[titleKey] = Array.from(existing)
          }
          localStorage.setItem('manga-dl-manga-categories', JSON.stringify(existingAssigns))
        }

        // 3. Cross-platform universal reading progress
        if (Array.isArray(backup.progress) && backup.progress.length > 0) {
          const existingRead: Record<string, string[]> = JSON.parse(localStorage.getItem('manga-dl-read') || '{}')
          for (const p of backup.progress) {
            const compKey = `${p.provider}:${p.mangaId}`
            const list = new Set(existingRead[compKey] || [])
            if (p.chapterId) list.add(p.chapterId)
            existingRead[compKey] = Array.from(list)
          }
          localStorage.setItem('manga-dl-read', JSON.stringify(existingRead))
          restored.push(`${backup.progress.length} read chapters`)
        }

        // 4. Cross-platform universal tracker bindings
        if (Array.isArray(backup.trackerBinds) && backup.trackerBinds.length > 0) {
          const existingTrackers: Record<string, any> = JSON.parse(localStorage.getItem('manga-dl-tracker-links') || '{}')
          for (const t of backup.trackerBinds) {
            const compKey = `${t.provider}:${t.mangaId}`
            const current = existingTrackers[compKey] || {}
            const trackerKey = (t.tracker || '').toLowerCase().includes('mal') ? 'mal' : 'anilist'
            current[trackerKey] = {
              id: t.remoteId,
              title: t.remoteTitle || '',
              score: t.score || 0,
              status: t.status || '',
              progress: t.lastChapterRead || 0,
            }
            existingTrackers[compKey] = current
          }
          localStorage.setItem('manga-dl-tracker-links', JSON.stringify(existingTrackers))
          restored.push(`${backup.trackerBinds.length} tracker links`)
        }

        // 5. Cross-platform universal library entries
        if (Array.isArray(backup.library) && backup.library.length > 0) {
          const userScope = supabaseUser?.id ?? 'anon'
          const scopedSubsKey = `manga-dl-local-subs:${userScope}`
          const scopedMetaKey = `manga-dl-local-sub-meta:${userScope}`

          const existingSubs: string[] = JSON.parse(localStorage.getItem(scopedSubsKey) || '[]')
          const existingMeta: Record<string, any> = JSON.parse(localStorage.getItem(scopedMetaKey) || '{}')
          const subsSet = new Set(existingSubs)

          const subBatch: Array<{ provider: string; mangaId: string; title: string; coverUrl: string | null; type?: 'manga' | 'novel' }> = []

          for (const m of backup.library) {
            const compKey = `${m.provider}:${m.id}`
            subsSet.add(compKey)
            existingMeta[compKey] = {
              title: m.title,
              cover_url: m.coverUrl || null,
              provider: m.provider,
              mangaId: m.id,
            }
            subBatch.push({
              provider: m.provider,
              mangaId: m.id,
              title: m.title,
              coverUrl: m.coverUrl || null,
              type: m.type === 'novel' ? 'novel' : 'manga',
            })
          }

          localStorage.setItem(scopedSubsKey, JSON.stringify(Array.from(subsSet)))
          localStorage.setItem(scopedMetaKey, JSON.stringify(existingMeta))

          try {
            await batchAddSubscriptions(subBatch)
          } catch {}

          restored.push(`${backup.library.length} manga series`)
        }

        // 6. Sync to backend if accessible
        try {
          await api.post('/backup/import/manual', backup)
        } catch {}

        queryClient.invalidateQueries({ queryKey: QK.library })
        queryClient.invalidateQueries({ queryKey: QK.history })

        alert(`Successfully imported Manga-DL backup:\n${restored.join(', ') || 'Settings restored.'}\n\nReloading to apply...`)
        setTimeout(() => window.location.reload(), 1200)
      } catch (err: any) {
        console.error(err)
        alert(`Import failed: ${err?.message || 'Invalid backup file.'}`)
      }
    }
    input.click()
  }

  const handleTachiyomiImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.tachibk,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) await executeTachiyomiImport(file)
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
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Storage error'
      console.error('Cloud backup error:', err)
      alert(`Cloud backup failed: ${msg}`)
    } finally { setCloudBackupLoading(false) }
  }

  const handleCloudRestore = async () => {
    if (!supabaseUser) return
    try {
      const { data: files, error } = await supabase.storage.from('manga-backups').list(`backups/${supabaseUser.id}`, { sortBy: { column: 'created_at', order: 'desc' } })
      if (error) throw error
      if (!files?.length) { alert('No cloud backups found.'); return }
      const latest = files[0]
      const { data: fileData, error: dlError } = await supabase.storage.from('manga-backups').download(`backups/${supabaseUser.id}/${latest.name}`)
      if (dlError) throw dlError
      if (!fileData) throw new Error('Download failed')
      const text = await fileData.text(); const backup = JSON.parse(text); const s = backup.settings ?? {}
      if (s.readerPrefs) localStorage.setItem('manga-dl-prefs', s.readerPrefs)
      if (s.categories) localStorage.setItem('manga-dl-categories', s.categories)
      if (s.mangaCategories) localStorage.setItem('manga-dl-manga-categories', s.mangaCategories)
      if (s.readTracking) localStorage.setItem('manga-dl-read', s.readTracking)
      if (s.bookmarks) localStorage.setItem('manga-dl-bookmarks', s.bookmarks)
      alert(`Restored from cloud backup: ${latest.name}\nReload to apply.`)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Restore error'
      console.error('Cloud restore error:', err)
      alert(`Restore failed: ${msg}`)
    }
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
      <div className="hidden lg:block" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--fg)', marginBottom: 4 }}>System</h2>
        <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Account, sync, backup, and advanced configuration.</p>
      </div>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
              <button onClick={() => navigate(localStorage.getItem('manga-username') ? `/${localStorage.getItem('manga-username')}` : '/profile/me')} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
              <button
                onClick={handleTachiyomiImport}
                disabled={tachiyomiLoading}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: tachiyomiLoading ? 0.7 : 1 }}
              >
                {tachiyomiLoading ? <ThemedSpinner size="xs" /> : <BookOpen style={{ width: 13, height: 13 }} />}
                {tachiyomiLoading ? 'Importing...' : 'Tachiyomi'}
              </button>
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.4, ease }}
      >
        <CardLabel icon={HardDrive} title="Storage &amp; Offline Data" />

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>Total Browser Storage Used</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
              {storageInfo ? storageInfo.usageFormatted : '...'} {storageInfo?.quotaBytes ? `/ ${storageInfo.quotaFormatted}` : ''}
            </span>
          </div>
          {storageInfo && storageInfo.quotaBytes > 0 && (
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'var(--surface-hover)', overflow: 'hidden' }}>
              <div style={{ width: `${storageInfo.percentUsed}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>

        {storageNotice && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.1)', color: 'rgb(74,222,128)', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            {storageNotice}
          </div>
        )}

        <div style={ROW}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Reading &amp; Image Cache</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>
              Temporary cached pages and cover images from reading online (CacheStorage API).
            </div>
          </div>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0 }}
          >
            {clearingCache ? <ThemedSpinner size="xs" /> : <Trash2 style={{ width: 13, height: 13 }} />}
            Clear Cache
          </button>
        </div>

        <div style={ROW}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Local Uploaded Archives</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>
              {storageInfo?.localArchivesCount || 0} archive(s) ({storageInfo?.localArchivesFormatted || '0 B'}) stored in browser IndexedDB.
            </div>
          </div>
          <button
            onClick={handleClearUploads}
            disabled={clearingUploads || !storageInfo?.localArchivesCount}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0, opacity: !storageInfo?.localArchivesCount ? 0.4 : 1 }}
          >
            {clearingUploads ? <ThemedSpinner size="xs" /> : <Trash2 style={{ width: 13, height: 13 }} />}
            Clear Uploads
          </button>
        </div>

        <div style={{ ...ROW, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Purge All Offline Data</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>
              Wipes both image caches and all uploaded offline archives for a clean slate.
            </div>
          </div>
          <button
            onClick={handlePurgeAll}
            disabled={purgingAll}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)', borderColor: 'rgba(239,68,68,0.3)', flexShrink: 0 }}
          >
            {purgingAll ? <ThemedSpinner size="xs" /> : <Trash2 style={{ width: 13, height: 13 }} />}
            Purge All
          </button>
        </div>
      </motion.section>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
              <div style={{ fontSize: 11, color: 'var(--muted3)', fontWeight: 700 }}>Sync Interval | {syncInterval} min</div>
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

import { useState, useEffect, useMemo } from 'react'
import { useBuiltinSources, useMarketSources } from '../lib/queries'
import { Download, Search, ShieldAlert, Trash2, RefreshCw, PowerOff, Power, Zap, X, EyeOff, Plus, Link2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemedSpinner } from '../components/common/ThemedLoader'
import { cn } from '../lib/utils'
import { ExtensionManager } from '../lib/extensions'

const CUSTOM_REPOS_KEY = 'manga-dl-custom-repos'

interface Source {
  id: string
  name: string
  version: string
  lang: string
  icon: string
  nsfw: boolean
  customRepo?: string
  codeUrl?: string
}

interface CustomRepo {
  url: string
  name: string
}

interface InstalledMeta {
  id: string
  name: string
  lang: string
  version: string
  disabled?: boolean
}

function getInstalledMeta(): InstalledMeta[] {
  const manager = ExtensionManager.getInstance()
  const key = (manager as unknown as Record<string, unknown>).storageKey as string
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

function saveInstalledMeta(list: InstalledMeta[]) {
  const manager = ExtensionManager.getInstance()
  const key = (manager as unknown as Record<string, unknown>).storageKey as string
  localStorage.setItem(key, JSON.stringify(list))
}

export default function SourcesPage() {
  const { data: rawSources = [], isLoading: loading } = useMarketSources()
  const sources = rawSources as Source[]
  const { data: builtinsRaw = [] } = useBuiltinSources()
  const builtinIdSet = useMemo(() => new Set((builtinsRaw as Array<{ id: string }>).map(b => b.id)), [builtinsRaw])

  const [search, setSearch] = useState('')
  const [filterLang, setFilterLang] = useState('all')
  const [hideNsfw, setHideNsfw] = useState(false)
  const [installing, setInstalling] = useState<string[]>([])
  const [installedMeta, setInstalledMeta] = useState<InstalledMeta[]>([])
  const [uninstalling, setUninstalling] = useState<string[]>([])
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updates, setUpdates] = useState<string[]>([])
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [customRepos, setCustomRepos] = useState<CustomRepo[]>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_REPOS_KEY) || '[]') } catch { return [] }
  })
  const [customSources, setCustomSources] = useState<Source[]>([])
  const [repoInput, setRepoInput] = useState('')
  const [addingRepo, setAddingRepo] = useState(false)

  const installedIds = useMemo(() => installedMeta.map(m => m.id), [installedMeta])
  const disabledIds = useMemo(() => installedMeta.filter(m => m.disabled).map(m => m.id), [installedMeta])

  useEffect(() => {
    ExtensionManager.getInstance().init().then(() => {
      setInstalledMeta(getInstalledMeta())
    })
  }, [])

  useEffect(() => {
    if (!statusMsg) return
    const t = setTimeout(() => setStatusMsg(null), 3500)
    return () => clearTimeout(t)
  }, [statusMsg])

  // Fetch and merge custom repo indexes
  useEffect(() => {
    if (!customRepos.length) { setCustomSources([]); return }
    let cancelled = false
    const fetchAll = async () => {
      const all: Source[] = []
      for (const repo of customRepos) {
        try {
          const res = await fetch(repo.url)
          if (!res.ok) continue
          const data = await res.json() as Array<{ id?: string; pkg?: string; name?: string; version?: string; lang?: string; icon?: string; nsfw?: number | boolean; source_url?: string }>
          const baseUrl = repo.url.replace(/\/[^/]+$/, '')
          for (const ext of data) {
            const pkgId = ext.pkg || ext.id || ''
            if (!pkgId) continue
            all.push({
              id: pkgId,
              name: ext.name || pkgId,
              version: ext.version || '1.0',
              lang: ext.lang || 'en',
              icon: ext.icon || '',
              nsfw: ext.nsfw === 1 || ext.nsfw === true,
              customRepo: repo.name,
              codeUrl: ext.source_url || `${baseUrl}/sources/${pkgId}/index.js`,
            })
          }
        } catch { /* non-fatal — repo may be unreachable */ }
      }
      if (!cancelled) setCustomSources(all)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [customRepos])

  const addCustomRepo = async () => {
    const url = repoInput.trim()
    if (!url || customRepos.some(r => r.url === url)) return
    setAddingRepo(true)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as Array<unknown>
      if (!Array.isArray(data)) throw new Error('Invalid repo format')
      const name = new URL(url).hostname
      const updated = [...customRepos, { url, name }]
      setCustomRepos(updated)
      localStorage.setItem(CUSTOM_REPOS_KEY, JSON.stringify(updated))
      setRepoInput('')
      setStatusMsg(`Added repo: ${name} (${data.length} extensions)`)
    } catch (err) {
      setStatusMsg(`Failed to add repo: ${(err as Error).message}`)
    }
    setAddingRepo(false)
  }

  const removeCustomRepo = (url: string) => {
    const updated = customRepos.filter(r => r.url !== url)
    setCustomRepos(updated)
    localStorage.setItem(CUSTOM_REPOS_KEY, JSON.stringify(updated))
    setCustomSources(prev => prev.filter(s => s.codeUrl && !s.codeUrl.startsWith(url.replace(/\/[^/]+$/, ''))))
  }

  const handleUninstall = (id: string) => {
    setUninstalling(prev => [...prev, id])
    const manager = ExtensionManager.getInstance()
    manager.uninstall(id)
    setInstalledMeta(getInstalledMeta())
    setUninstalling(prev => prev.filter(i => i !== id))
    setConfirmUninstall(null)
  }

  const handleToggleDisable = async (id: string) => {
    const meta = getInstalledMeta()
    const item = meta.find(m => m.id === id)
    if (!item) return
    const nextDisabled = !item.disabled
    const updated = meta.map(m => m.id === id ? { ...m, disabled: nextDisabled } : m)
    saveInstalledMeta(updated)
    setInstalledMeta(updated)

    const manager = ExtensionManager.getInstance()
    if (nextDisabled) {
      manager.extensions.delete(id)
    } else {
      await manager.install(item.id, item.name, item.lang, item.version, true)
    }
  }

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true)
    try {
      const market = sources as Source[]
      const needsUpdate: string[] = []
      for (const inst of installedMeta) {
        const remote = market.find(s => s.id === inst.id)
        if (remote && remote.version !== inst.version) needsUpdate.push(inst.id)
      }
      setUpdates(needsUpdate)
      setStatusMsg(needsUpdate.length === 0 ? 'All extensions are up to date.' : `${needsUpdate.length} update${needsUpdate.length > 1 ? 's' : ''} available.`)
    } catch {
      setStatusMsg('Failed to check for updates.')
    }
    setCheckingUpdates(false)
  }

  const handleUpdate = async (s: Source) => {
    const manager = ExtensionManager.getInstance()
    setInstalling(prev => [...prev, s.id])
    const success = await manager.install(s.id, s.name, s.lang, s.version)
    if (success) {
      setInstalledMeta(getInstalledMeta())
      setUpdates(prev => prev.filter(id => id !== s.id))
    }
    setInstalling(prev => prev.filter(i => i !== s.id))
  }

  const handleInstall = async (s: Source) => {
    const manager = ExtensionManager.getInstance()
    setInstalling(prev => [...prev, s.id])
    const success = s.codeUrl
      ? await manager.installFromUrl(s.codeUrl, s.id, s.name, s.lang, s.version)
      : await manager.install(s.id, s.name, s.lang, s.version)
    if (success) {
      setInstalledMeta(getInstalledMeta())
    } else {
      setStatusMsg(`Failed to install ${s.name}.`)
    }
    setInstalling(prev => prev.filter(i => i !== s.id))
  }

  const allSources = useMemo(() => {
    const marketIds = new Set(sources.map(s => s.id))
    const deduped = customSources.filter(s => !marketIds.has(s.id))
    return [...sources, ...deduped]
  }, [sources, customSources])

  const filteredSources = allSources.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
    const matchesLang = filterLang === 'all' || s.lang === filterLang
    const matchesNsfw = !hideNsfw || !s.nsfw
    return matchesSearch && matchesLang && matchesNsfw
  })

  const installedBuiltins = filteredSources.filter(s => installedIds.includes(s.id) && builtinIdSet.has(s.id))
  const installedCommunity = filteredSources.filter(s => installedIds.includes(s.id) && !builtinIdSet.has(s.id))
  const available = filteredSources.filter(s => !installedIds.includes(s.id) && !builtinIdSet.has(s.id))

  const [tab, setTab] = useState<'sources' | 'extensions' | 'migrate'>('sources')
  const activeInstalled = installedMeta.filter(m => !m.disabled)

  const FALLBACK_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48L3N2Zz4='

  const langs = Array.from(new Set(allSources.map(s => s.lang))).sort()

  const NsfwBadge = () => (
    <span
      role="img"
      aria-label="Adult content"
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <ShieldAlert style={{ width: 12, height: 12, color: '#ef4444', flexShrink: 0 }} />
      <span className="sr-only">Adult content</span>
    </span>
  )

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h1 className="page-title">Sources</h1>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 1 }}>{activeInstalled.length} of {allSources.length} enabled</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <AnimatePresence>
              {statusMsg && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: 11, color: 'var(--muted1)', fontWeight: 600 }}
                >
                  {statusMsg}
                </motion.span>
              )}
            </AnimatePresence>
            {installedIds.length > 0 && (
              <button
                onClick={handleCheckUpdates}
                disabled={checkingUpdates}
                aria-label="Check for extension updates"
                className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
              >
                {checkingUpdates ? <ThemedSpinner size="sm" /> : <RefreshCw style={{ width: 16, height: 16 }} />}
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted3)' }} />
          <label htmlFor="sources-search" className="sr-only">Filter sources</label>
          <input
            id="sources-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter sources..."
            className="focus-visible:ring-2 focus-visible:ring-red-500"
            style={{ width: '100%', padding: '9px 12px 9px 30px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Tab + lang pills */}
        <div role="tablist" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, alignItems: 'center' }}>
          {(['sources', 'extensions', 'migrate'] as const).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn('filter-pill focus-visible:ring-2 focus-visible:ring-red-500', tab === t && 'active')}
              style={{ position: 'relative' }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'extensions' && updates.length > 0 && <span aria-hidden="true" style={{ marginLeft: 4, fontSize: 9, fontWeight: 900, color: 'rgb(251,191,36)' }}>{updates.length}</span>}
            </button>
          ))}
          {tab === 'extensions' && (
            <>
              <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
              <button
                onClick={() => setFilterLang('all')}
                aria-pressed={filterLang === 'all'}
                className={cn('filter-pill focus-visible:ring-2 focus-visible:ring-red-500', filterLang === 'all' && 'active')}
              >
                All
              </button>
              {langs.map(l => (
                <button
                  key={l}
                  onClick={() => setFilterLang(l)}
                  aria-pressed={filterLang === l}
                  className={cn('filter-pill focus-visible:ring-2 focus-visible:ring-red-500', filterLang === l && 'active')}
                >
                  {l.toUpperCase()}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
              <button
                onClick={() => setHideNsfw(v => !v)}
                aria-pressed={hideNsfw}
                aria-label={hideNsfw ? 'Show adult content' : 'Hide adult content'}
                className={cn('filter-pill focus-visible:ring-2 focus-visible:ring-red-500', hideNsfw && 'active')}
                style={hideNsfw ? { color: '#ef4444', borderColor: 'rgba(220,38,38,0.3)' } : undefined}
              >
                <EyeOff style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} aria-hidden="true" />
                18+
              </button>
            </>
          )}
        </div>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1">

        {tab === 'sources' && (
          activeInstalled.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>☆</div>
              <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--fg)' }}>No sources installed</p>
              <p style={{ fontSize: 13, color: 'var(--muted2)', maxWidth: 280 }}>Install extensions from the Extensions tab to start browsing.</p>
              <button onClick={() => setTab('extensions')} className="btn-primary" style={{ marginTop: 4 }}>Go to Extensions</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activeInstalled.map((m) => {
                const src = sources.find(s => s.id === m.id)
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 4 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: 6, boxSizing: 'border-box' }}>
                      {src?.icon && <img src={src.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).src = FALLBACK_ICON }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted3)', marginTop: 2 }}>{m.lang} · v{m.version}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(74,222,128)', flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'extensions' && (
          loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ height: 62, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }} className="animate-pulse" />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {installedBuiltins.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Zap style={{ width: 12, height: 12, color: '#ef4444' }} />
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>Built-in ({installedBuiltins.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <AnimatePresence>
                      {installedBuiltins.map((s) => {
                        const isDisabled = disabledIds.includes(s.id)
                        return (
                          <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', opacity: isDisabled ? 0.5 : 1 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: 6, boxSizing: 'border-box' }}>
                              <img src={s.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).src = FALLBACK_ICON }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                <span aria-hidden="true" style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 5, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)', color: '#ef4444', flexShrink: 0 }}>built-in</span>
                                {s.nsfw && <NsfwBadge />}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted3)', marginTop: 2 }}>{s.lang} · v{s.version}{isDisabled ? ' · deactivated' : ''}</div>
                            </div>
                            <button
                              onClick={() => handleToggleDisable(s.id)}
                              aria-label={isDisabled ? `Activate ${s.name}` : `Deactivate ${s.name}`}
                              aria-pressed={!isDisabled}
                              className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                              style={{ width: 34, height: 34, borderRadius: 10, color: isDisabled ? 'rgb(74,222,128)' : undefined }}
                            >
                              {isDisabled ? <Power style={{ width: 14, height: 14 }} /> : <PowerOff style={{ width: 14, height: 14 }} />}
                            </button>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {installedCommunity.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>Installed ({installedCommunity.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <AnimatePresence>
                      {installedCommunity.map((s) => {
                        const isDisabled = disabledIds.includes(s.id)
                        const hasUpdate = updates.includes(s.id)
                        const isConfirmingUninstall = confirmUninstall === s.id
                        return (
                          <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', opacity: isDisabled ? 0.5 : 1 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: 6, boxSizing: 'border-box' }}>
                              <img src={s.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).src = FALLBACK_ICON }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                {hasUpdate && <span aria-hidden="true" style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: 'rgb(251,191,36)', flexShrink: 0 }}>Update</span>}
                                {s.nsfw && <NsfwBadge />}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted3)', marginTop: 2 }}>{s.lang} · v{s.version}{isDisabled ? ' · disabled' : ''}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {isConfirmingUninstall ? (
                                <>
                                  <button
                                    onClick={() => handleUninstall(s.id)}
                                    disabled={uninstalling.includes(s.id)}
                                    aria-label={`Confirm uninstall ${s.name}`}
                                    className="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                                    style={{ fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#ef4444', cursor: 'pointer' }}
                                  >
                                    {uninstalling.includes(s.id) ? <ThemedSpinner size="xs" /> : 'Remove'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmUninstall(null)}
                                    aria-label="Cancel uninstall"
                                    className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                                    style={{ width: 44, height: 44, borderRadius: 10 }}
                                  >
                                    <X style={{ width: 13, height: 13 }} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {hasUpdate && (
                                    <button
                                      onClick={() => handleUpdate(s)}
                                      disabled={installing.includes(s.id)}
                                      aria-label={`Update ${s.name}`}
                                      className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                                      style={{ width: 30, height: 30, borderRadius: 8, color: 'rgb(251,191,36)' }}
                                    >
                                      {installing.includes(s.id) ? <ThemedSpinner size="xs" /> : <RefreshCw style={{ width: 13, height: 13 }} />}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleToggleDisable(s.id)}
                                    aria-label={isDisabled ? `Enable ${s.name}` : `Disable ${s.name}`}
                                    aria-pressed={!isDisabled}
                                    className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                                    style={{ width: 30, height: 30, borderRadius: 8, color: isDisabled ? 'rgb(74,222,128)' : undefined }}
                                  >
                                    {isDisabled ? <Power style={{ width: 13, height: 13 }} /> : <PowerOff style={{ width: 13, height: 13 }} />}
                                  </button>
                                  <button
                                    onClick={() => setConfirmUninstall(s.id)}
                                    disabled={uninstalling.includes(s.id)}
                                    aria-label={`Uninstall ${s.name}`}
                                    className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                                    style={{ width: 44, height: 44, borderRadius: 10 }}
                                  >
                                    {uninstalling.includes(s.id) ? <ThemedSpinner size="xs" /> : <Trash2 style={{ width: 13, height: 13 }} />}
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {available.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 4 }}>Available ({available.length})</div>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 10 }}>Community extensions — install to add more sources.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <AnimatePresence>
                      {available.map((s) => (
                        <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: 6, boxSizing: 'border-box' }}>
                            <img src={s.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).src = FALLBACK_ICON }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                              {s.customRepo && <span aria-hidden="true" style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgb(139,92,246)', flexShrink: 0 }}>custom</span>}
                              {s.nsfw && <NsfwBadge />}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted3)', marginTop: 2 }}>{s.lang} · v{s.version}</div>
                          </div>
                          <button
                            onClick={() => handleInstall(s)}
                            disabled={installing.includes(s.id)}
                            aria-label={`Install ${s.name}`}
                            className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                            style={{ width: 34, height: 34, borderRadius: 10 }}
                          >
                            {installing.includes(s.id) ? <ThemedSpinner size="sm" /> : <Download style={{ width: 15, height: 15 }} />}
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Custom Repositories */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Link2 style={{ width: 12, height: 12, color: 'var(--accent)' }} />
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>Custom Repos ({customRepos.length})</span>
                </div>
                {customRepos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {customRepos.map(repo => (
                      <div key={repo.url} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted3)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{repo.url}</div>
                        </div>
                        <button
                          onClick={() => removeCustomRepo(repo.url)}
                          aria-label={`Remove repo ${repo.name}`}
                          className="icon-btn focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                          style={{ width: 44, height: 44, borderRadius: 10 }}
                        >
                          <X style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="url"
                    value={repoInput}
                    onChange={e => setRepoInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomRepo()}
                    placeholder="https://your-repo.github.io/index.json"
                    aria-label="Custom repository URL"
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12.5, color: 'var(--fg)', outline: 'none' }}
                  />
                  <button
                    onClick={addCustomRepo}
                    disabled={addingRepo || !repoInput.trim()}
                    aria-label="Add custom repository"
                    className="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none"
                    style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}
                  >
                    <Plus style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>

              {filteredSources.length === 0 && !customSources.length && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted2)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>No extensions found</p>
                </div>
              )}
            </div>
          )
        )}

        {tab === 'migrate' && (
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>⇄</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--fg)', marginBottom: 8 }}>Migrate Manga</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 24, lineHeight: 1.6 }}>Move manga from one source to another, keeping read progress and categories intact.</p>
            <div style={{ padding: '16px 18px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>How to migrate</div>
              {['Open a manga from your Library', 'Tap the source badge near the title', 'Search for the same manga on another source', 'Confirm — progress is preserved'].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(220,38,38,0.12)', color: '#ef4444', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <p style={{ fontSize: 13, color: 'var(--muted1)' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

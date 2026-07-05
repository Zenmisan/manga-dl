import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { Download, CheckCircle2, Search, Filter, ShieldAlert, Loader2, Trash2, RefreshCw, PowerOff, Power, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { ExtensionManager } from '../lib/extensions'

interface Source {
  id: string
  name: string
  version: string
  lang: string
  icon: string
  nsfw: boolean
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
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLang, setFilterLang] = useState('all')
  const [installing, setInstalling] = useState<string[]>([])
  const [installedMeta, setInstalledMeta] = useState<InstalledMeta[]>([])
  const [uninstalling, setUninstalling] = useState<string[]>([])
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updates, setUpdates] = useState<string[]>([])
  const [builtinIdSet, setBuiltinIdSet] = useState<Set<string>>(new Set())

  const installedIds = useMemo(() => installedMeta.map(m => m.id), [installedMeta])
  const disabledIds = useMemo(() => installedMeta.filter(m => m.disabled).map(m => m.id), [installedMeta])

  useEffect(() => {
    const manager = ExtensionManager.getInstance()
    manager.init().then(() => {
      setInstalledMeta(getInstalledMeta())
    })
    api.get('/sources/builtins').then(res => {
      setBuiltinIdSet(new Set((res.data as Array<{ id: string }>).map(b => b.id)))
    }).catch(() => {})
    api.get('/sources/market').then(res => {
      setSources(res.data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

const handleUninstall = (id: string) => {
    if (!confirm('Uninstall this extension?')) return
    setUninstalling(prev => [...prev, id])
    const manager = ExtensionManager.getInstance()
    manager.uninstall(id)
    setInstalledMeta(getInstalledMeta())
    setUninstalling(prev => prev.filter(i => i !== id))
  }

  const handleToggleDisable = async (id: string) => {
    const meta = getInstalledMeta()
    const item = meta.find(m => m.id === id)
    if (!item) return
    const nextDisabled = !item.disabled
    const updated = meta.map(m => m.id === id ? { ...m, disabled: nextDisabled } : m)
    saveInstalledMeta(updated)
    setInstalledMeta(updated)

    // Instantly update active ExtensionManager map
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
      const res = await api.get('/sources/market')
      const market: Source[] = res.data
      const needsUpdate: string[] = []
      for (const inst of installedMeta) {
        const remote = market.find(s => s.id === inst.id)
        if (remote && remote.version !== inst.version) needsUpdate.push(inst.id)
      }
      setUpdates(needsUpdate)
      if (needsUpdate.length === 0) alert('All extensions are up to date.')
    } catch {
      alert('Failed to check for updates.')
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
    const success = await manager.install(s.id, s.name, s.lang, s.version)
    if (success) {
      setInstalledMeta(getInstalledMeta())
    } else {
      alert(`Failed to install extension: ${s.name}`)
    }
    setInstalling(prev => prev.filter(i => i !== s.id))
  }

  const filteredSources = sources.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
    const matchesLang = filterLang === 'all' || s.lang === filterLang
    return matchesSearch && matchesLang
  })

  const installedBuiltins = filteredSources.filter(s => installedIds.includes(s.id) && builtinIdSet.has(s.id))
  const installedCommunity = filteredSources.filter(s => installedIds.includes(s.id) && !builtinIdSet.has(s.id))
  const available = filteredSources.filter(s => !installedIds.includes(s.id) && !builtinIdSet.has(s.id))

  const [tab, setTab] = useState<'sources' | 'extensions' | 'migrate'>('sources')
  const activeInstalled = installedMeta.filter(m => !m.disabled)

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full">
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Browse
        </h1>
        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/5 rounded-2xl w-fit">
          {(['sources', 'extensions', 'migrate'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                tab === t ? 'bg-white/10 text-white shadow' : 'text-white/30 hover:text-white/60'
              )}
            >
              {t}
              {t === 'sources' && activeInstalled.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[9px]">{activeInstalled.length}</span>
              )}
              {t === 'extensions' && updates.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px]">{updates.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {tab === 'sources' && (
        <div>
          {activeInstalled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="text-5xl">˚₊‧꒰ა ☆ ໒꒱ ‧₊˚</div>
              <p className="font-bold text-white/40 uppercase tracking-widest text-xs">No sources installed</p>
              <p className="text-white/25 text-sm max-w-xs">Install extensions from the Extensions tab to start browsing manga.</p>
              <button onClick={() => setTab('extensions')} className="btn-primary mt-2">Go to Extensions</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeInstalled.map((m, i) => {
                const src = sources.find(s => s.id === m.id)
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card p-4 flex items-center gap-4 border-white/5"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden shrink-0 border border-white/10 p-2">
                      {src?.icon && <img src={src.icon} alt={m.name} className="w-full h-full object-contain" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{m.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{m.lang}</span>
                        <span className="text-[9px] font-medium text-white/20">v{m.version}</span>
                      </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Active" />
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'extensions' && (
        <div>
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-red-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search extensions..."
                className="w-full glass-panel py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-base"
              />
            </div>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <select
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                className="select-styled w-full pl-10 text-sm font-bold uppercase tracking-widest"
              >
                <option value="all">All Languages</option>
                {Array.from(new Set(sources.map(s => s.lang))).sort().map(lang => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            </div>
            {installedIds.length > 0 && (
              <button
                onClick={handleCheckUpdates}
                disabled={checkingUpdates}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 font-bold text-xs uppercase tracking-widest transition-all"
              >
                {checkingUpdates ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Check Updates
              </button>
            )}
          </div>

          <p className="text-white/40 text-sm mb-6">Built-in sources are always available. Community sources require install.</p>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="space-y-10">

          {/* Built-in extensions */}
          {installedBuiltins.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-white/30">Built-in ({installedBuiltins.length})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {installedBuiltins.map((s, idx) => {
                    const isDisabled = disabledIds.includes(s.id)
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                        className={cn(
                          "group glass-card p-4 flex items-center gap-4 border-red-500/10 transition-all",
                          isDisabled && "opacity-50"
                        )}
                      >
                        <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden shrink-0 border border-white/10 p-2 relative">
                          <img src={s.icon} alt={s.name} className="w-full h-full object-contain" onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48L3N2Zz4='
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm truncate max-w-[120px] sm:max-w-none">{s.name}</h3>
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-red-600/15 border border-red-500/20 rounded text-red-400 shrink-0">built-in</span>
                            {s.nsfw && <span title="NSFW" className="shrink-0"><ShieldAlert className="w-3 h-3 text-red-500" /></span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-1.5 py-0.5 rounded shrink-0">{s.lang}</span>
                            <span className="text-[9px] font-medium text-white/20 shrink-0">v{s.version}</span>
                            {isDisabled && <span className="text-[9px] font-black uppercase tracking-widest text-white/20 shrink-0">deactivated</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleDisable(s.id)}
                          title={isDisabled ? 'Activate' : 'Deactivate'}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                            isDisabled
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {isDisabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          <span className="hidden xl:inline">{isDisabled ? 'Activate' : 'Deactivate'}</span>
                        </button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Community installed */}
          {installedCommunity.length > 0 && (
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Installed ({installedCommunity.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {installedCommunity.map((s, idx) => {
                    const isDisabled = disabledIds.includes(s.id)
                    const hasUpdate = updates.includes(s.id)
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                        className={cn(
                          "group glass-card p-4 flex items-center gap-4 border-white/5 transition-all",
                          isDisabled && "opacity-50"
                        )}
                      >
                        <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden shrink-0 border border-white/10 p-2">
                          <img src={s.icon} alt={s.name} className="w-full h-full object-contain" onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48L3N2Zz4='
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm truncate">{s.name}</h3>
                            {s.nsfw && <span title="NSFW"><ShieldAlert className="w-3 h-3 text-red-500" /></span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{s.lang}</span>
                            <span className="text-[9px] font-medium text-white/20">v{s.version}</span>
                            {hasUpdate && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400">Update</span>}
                            {isDisabled && <span className="text-[9px] font-black uppercase tracking-widest text-white/20">disabled</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasUpdate && (
                            <button
                              onClick={() => handleUpdate(s)}
                              disabled={installing.includes(s.id)}
                              title="Update"
                              className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                            >
                              {installing.includes(s.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleDisable(s.id)}
                            title={isDisabled ? 'Enable' : 'Disable'}
                            className={cn("p-2 rounded-xl border transition-all", isDisabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white")}
                          >
                            {isDisabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleUninstall(s.id)}
                            disabled={uninstalling.includes(s.id)}
                            title="Uninstall"
                            className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/30 hover:bg-red-500/20 hover:border-red-500/20 hover:text-red-400 transition-all"
                          >
                            {uninstalling.includes(s.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Community available */}
          {available.length > 0 && (
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-white/30 mb-1">Available ({available.length})</h2>
              <p className="text-[10px] text-white/20 mb-4">Install community extensions to add more manga and webtoon sources.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {available.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
                      className="group glass-card p-4 flex items-center gap-4 hover:bg-white/[0.05] border-white/5 transition-all"
                    >
                      <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden shrink-0 border border-white/10 p-2">
                        <img src={s.icon} alt={s.name} className="w-full h-full object-contain" onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48L3N2Zz4='
                        }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm truncate">{s.name}</h3>
                          {s.nsfw && <span title="NSFW"><ShieldAlert className="w-3 h-3 text-red-500" /></span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{s.lang}</span>
                          <span className="text-[9px] font-medium text-white/20">v{s.version}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInstall(s)}
                        disabled={installing.includes(s.id)}
                        title="Install Extension"
                        className={cn(
                          "p-2.5 rounded-xl border shrink-0 transition-all",
                          installing.includes(s.id)
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/10"
                        )}
                      >
                        {installing.includes(s.id) ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {filteredSources.length === 0 && !loading && (
            <div className="text-center py-20 text-white/20">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No extensions found</p>
            </div>
          )}
        </div>
      )}
      </div>
      )}

      {tab === 'migrate' && (
        <div>
          <div className="max-w-lg mx-auto py-16 text-center">
            <div className="text-5xl mb-6">⇄</div>
            <h2 className="text-xl font-black mb-3">Migrate Manga</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
              Move manga from one source to another, keeping your read progress and categories intact.
              Go to any manga's detail page and use the source badge to switch sources.
            </p>
            <div className="glass-panel p-6 border-white/5 text-left space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/25">How to migrate:</p>
              {['Open a manga from your Library', 'Tap the source badge near the title', 'Search for the same manga on a different source', 'Confirm migration — progress is preserved'].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-white/50">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
  )
}

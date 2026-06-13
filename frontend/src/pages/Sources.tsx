import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { Download, CheckCircle2, Search, Filter, ShieldAlert, Loader2, Trash2, RefreshCw, PowerOff, Power } from 'lucide-react'
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
  const key = (manager as any).storageKey as string
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

function saveInstalledMeta(list: InstalledMeta[]) {
  const manager = ExtensionManager.getInstance()
  const key = (manager as any).storageKey as string
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

  const installedIds = useMemo(() => installedMeta.map(m => m.id), [installedMeta])
  const disabledIds = useMemo(() => installedMeta.filter(m => m.disabled).map(m => m.id), [installedMeta])

  useEffect(() => {
    const manager = ExtensionManager.getInstance()
    manager.init().then(() => {
      setInstalledMeta(getInstalledMeta())
    })
    api.get('/sources/market').then(res => {
      setSources(res.data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const handleInstall = async (s: Source) => {
    setInstalling(prev => [...prev, s.id])
    const manager = ExtensionManager.getInstance()
    const success = await manager.install(s.id, s.name, s.lang, s.version)
    if (success) {
      setInstalledMeta(getInstalledMeta())
    } else {
      alert("Extension download failed. This source might not be web-compatible yet.")
    }
    setInstalling(prev => prev.filter(i => i !== s.id))
  }

  const handleUninstall = (id: string) => {
    if (!confirm('Uninstall this extension?')) return
    setUninstalling(prev => [...prev, id])
    const manager = ExtensionManager.getInstance()
    manager.uninstall(id)
    setInstalledMeta(getInstalledMeta())
    setUninstalling(prev => prev.filter(i => i !== id))
  }

  const handleToggleDisable = (id: string) => {
    const meta = getInstalledMeta()
    const updated = meta.map(m => m.id === id ? { ...m, disabled: !m.disabled } : m)
    saveInstalledMeta(updated)
    setInstalledMeta(updated)
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

  const filteredSources = sources.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
    const matchesLang = filterLang === 'all' || s.lang === filterLang
    return matchesSearch && matchesLang
  })

  const languages = Array.from(new Set(sources.map(s => s.lang))).sort()

  const installed = filteredSources.filter(s => installedIds.includes(s.id))
  const available = filteredSources.filter(s => !installedIds.includes(s.id))

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full">
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Extensions
        </h1>
        <p className="text-white/40 font-medium md:text-lg mb-10">Tachiyomi-compatible source engine. Browse and install 500+ sources.</p>

        <div className="flex flex-col md:flex-row gap-4">
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
              className="glass-panel py-4 pl-10 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm font-bold uppercase tracking-widest bg-transparent cursor-pointer"
            >
              <option value="all">All Languages</option>
              {languages.map(lang => (
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
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Installed */}
          {installed.length > 0 && (
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Installed ({installed.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {installed.map((s, idx) => {
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
                            (e.target as any).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48L3N2Zz4='
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

          {/* Available */}
          {available.length > 0 && (
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Available ({available.length})</h2>
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
                          (e.target as any).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48L3N2Zz4='
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
                        className="p-2.5 rounded-xl transition-all border shrink-0 bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-red-600 hover:border-red-600"
                      >
                        {installing.includes(s.id) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {filteredSources.length === 0 && (
            <div className="text-center py-20 text-white/20">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No extensions found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

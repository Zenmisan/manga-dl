import { useState, useEffect } from 'react'
import { Shield, Database, Save, RefreshCw, Key, HardDrive, Info, Share2, LogOut, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('manga-api-key') || '')
  const [anilistToken, setAnilistToken] = useState(localStorage.getItem('anilist-token') || '')
  const [userName, setUserName] = useState<string | null>(null)
  
  useEffect(() => {
    if (anilistToken) {
      // Basic mock for showing user is logged in
      setUserName("MangaReader")
    }
  }, [anilistToken])

  const saveKey = () => {
    localStorage.setItem('manga-api-key', apiKey)
    alert('Settings saved locally!')
  }

  const handleAnilistLogin = () => {
    // This would redirect to AniList OAuth
    // For this prototype, we'll simulate a login
    const token = "mock_token_" + Date.now()
    localStorage.setItem('anilist-token', token)
    setAnilistToken(token)
    setUserName("MangaReader")
  }

  const handleAnilistLogout = () => {
    localStorage.removeItem('anilist-token')
    setAnilistToken('')
    setUserName(null)
  }

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto min-h-full">
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-white/40 font-medium md:text-lg">Configure your client and connections</p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {/* Tracking Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel overflow-hidden border-white/5"
        >
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <Share2 className="w-5 h-5 text-pink-500" />
            </div>
            <h2 className="font-bold text-lg">Tracking</h2>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <img src="https://anilist.co/img/icons/icon.svg" className="w-5 h-5" alt="AniList" />
                  <h4 className="font-bold text-gray-100">AniList Integration</h4>
                </div>
                <p className="text-sm text-white/30 font-medium">Auto-sync reading progress with your AniList profile</p>
              </div>
              
              {userName ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    {userName}
                  </div>
                  <button 
                    onClick={handleAnilistLogout}
                    className="p-2.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl transition-all border border-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleAnilistLogin}
                  className="px-6 py-3 bg-[#3db4f2] hover:bg-[#2e9ed8] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#3db4f2]/20"
                >
                  Connect AniList
                </button>
              )}
            </div>
          </div>
        </motion.section>

        {/* Security Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel overflow-hidden border-white/5"
        >
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="font-bold text-lg">Security</h2>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-white/40 uppercase tracking-widest">
                <Key className="w-3.5 h-3.5" />
                Remote API Key
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your X-API-Key..."
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-white placeholder:text-white/10"
                />
                <button 
                  onClick={saveKey}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Database & Sync */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel overflow-hidden border-white/5"
        >
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="font-bold text-lg">System</h2>
          </div>
          <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-100 flex items-center gap-2">
                  Synchronize
                </h4>
                <p className="text-sm text-white/30 font-medium">Trigger manual check for new chapters across all providers</p>
              </div>
              <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/60 hover:text-white font-bold text-xs uppercase tracking-widest">
                <RefreshCw className="w-4 h-4" />
                Run Sync
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-100 flex items-center gap-2">
                  Clear Cache
                </h4>
                <p className="text-sm text-white/30 font-medium">Wipe temporary download files and internal logs</p>
              </div>
              <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 rounded-xl transition-all border border-white/5 text-white/60 hover:text-red-400 font-bold text-xs uppercase tracking-widest">
                <HardDrive className="w-4 h-4" />
                Prune Data
              </button>
            </div>
          </div>
        </motion.section>

        {/* Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center gap-6 py-12 grayscale hover:opacity-100 transition-opacity duration-700"
        >
           <div className="flex items-center gap-8 opacity-50">
             <img src="https://vitejs.dev/logo.svg" className="h-6" alt="Vite" />
             <img src="https://reactjs.org/logo-og.png" className="h-6" alt="React" />
             <img src="https://bun.sh/logo.svg" className="h-6" alt="Bun" />
           </div>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
             <Info className="w-3 h-3" />
             Build 2026.06.03
           </div>
        </motion.div>
      </div>
    </div>
  )
}

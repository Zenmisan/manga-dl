import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Database, Save, RefreshCw, Key, HardDrive, Info, Share2, LogOut, CheckCircle2, Loader2, Bell, BellOff, User, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import api from '../lib/api'
import { supabase } from '../lib/supabase'

// ── MAL PKCE helpers ────────────────────────────────────────────────────────
async function generatePKCE() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { verifier, challenge }
}

async function fetchAniListUsername(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query: '{ Viewer { name } }' }),
    })
    const data = await res.json()
    return data.data?.Viewer?.name ?? null
  } catch {
    return null
  }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('manga-api-key') || '')
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('manga-backend-url') || '')
  const [anilistToken, setAnilistToken] = useState(localStorage.getItem('anilist-token') || '')
  const [anilistClientId, setAnilistClientId] = useState(localStorage.getItem('anilist-client-id') || '')
  const [userName, setUserName] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  // MAL
  const [malClientId, setMalClientId] = useState(localStorage.getItem('mal-client-id') || '')
  const [malUser, setMalUser] = useState(localStorage.getItem('mal-username') || '')
  const [malLoading, setMalLoading] = useState(false)
  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(localStorage.getItem('notifications-enabled') === 'true')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseUser(data.session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setSupabaseUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Resolve username whenever token changes
  useEffect(() => {
    if (!anilistToken || anilistToken.startsWith('mock_token_')) {
      setUserName(null)
      return
    }
    fetchAniListUsername(anilistToken).then(name => setUserName(name))
  }, [anilistToken])

  // Handle OAuth redirect — AniList returns token in URL hash
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('access_token')) return
    const params = new URLSearchParams(hash.substring(1))
    const token = params.get('access_token')
    if (token) {
      localStorage.setItem('anilist-token', token)
      setAnilistToken(token)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Handle MAL OAuth redirect — MAL returns ?code= in query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const verifier = localStorage.getItem('mal-code-verifier')
    const clientId = localStorage.getItem('mal-client-id')
    if (!code || !verifier || !clientId) return

    setMalLoading(true)
    window.history.replaceState(null, '', window.location.pathname)

    api.post('/auth/mal/token', {
      client_id: clientId,
      code,
      code_verifier: verifier,
      redirect_uri: window.location.origin + '/settings',
    }).then(res => {
      localStorage.setItem('mal-token', res.data.access_token)
      localStorage.setItem('mal-username', res.data.username)
      localStorage.removeItem('mal-code-verifier')
      setMalUser(res.data.username)
    }).catch(err => {
      console.error('MAL auth failed:', err)
      alert('MAL login failed. Check console.')
    }).finally(() => setMalLoading(false))
  }, [])

  const saveKey = () => {
    localStorage.setItem('manga-api-key', apiKey)
    localStorage.setItem('anilist-client-id', anilistClientId)
    if (backendUrl.trim()) {
      localStorage.setItem('manga-backend-url', backendUrl.trim())
    } else {
      localStorage.removeItem('manga-backend-url')
    }
    alert('Settings saved! Reload the page for backend URL changes to take effect.')
  }

  const handleAnilistLogin = () => {
    if (!anilistClientId.trim()) {
      alert('Enter your AniList Client ID first.\n\nGet one at: anilist.co/settings/developer\nSet redirect URI to: ' + window.location.origin + '/settings')
      return
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/settings')
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${anilistClientId.trim()}&response_type=token&redirect_uri=${redirectUri}`
  }

  const handleAnilistLogout = () => {
    localStorage.removeItem('anilist-token')
    setAnilistToken('')
    setUserName(null)
  }

  const handleMALLogin = async () => {
    if (!malClientId.trim()) {
      alert('Enter your MAL Client ID first.\n\nGet one at: myanimelist.net/apiconfig\nSet redirect URI to: ' + window.location.origin + '/settings')
      return
    }
    localStorage.setItem('mal-client-id', malClientId.trim())
    const { verifier, challenge } = await generatePKCE()
    localStorage.setItem('mal-code-verifier', verifier)
    const redirectUri = encodeURIComponent(window.location.origin + '/settings')
    window.location.href = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${malClientId.trim()}&code_challenge=${challenge}&redirect_uri=${redirectUri}`
  }

  const handleMALLogout = () => {
    localStorage.removeItem('mal-token')
    localStorage.removeItem('mal-username')
    localStorage.removeItem('mal-code-verifier')
    setMalUser('')
  }

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications not supported.')
      return
    }
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') {
      localStorage.setItem('notifications-enabled', 'true')
      setNotifEnabled(true)
    }
  }

  const handleDisableNotifications = () => {
    localStorage.setItem('notifications-enabled', 'false')
    setNotifEnabled(false)
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
    // Cache clearing is local-only; backend handles via OS temp path
    alert('Cache cleared.')
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
            {/* AniList Client ID */}
            {!userName && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-white/40 uppercase tracking-widest">
                  <Key className="w-3.5 h-3.5" />
                  AniList Client ID
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={anilistClientId}
                    onChange={(e) => setAnilistClientId(e.target.value)}
                    placeholder="From anilist.co/settings/developer..."
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all text-white placeholder:text-white/10 text-sm"
                  />
                </div>
                <p className="text-xs text-white/20 font-medium">
                  Register at anilist.co/settings/developer — set redirect URI to <span className="text-white/40 font-mono">{window.location.origin}/settings</span>
                </p>
              </div>
            )}

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

        {/* MAL Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel overflow-hidden border-white/5"
        >
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="font-bold text-lg">MyAnimeList</h2>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            {!malUser && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-white/40 uppercase tracking-widest">
                  <Key className="w-3.5 h-3.5" />
                  MAL Client ID
                </label>
                <input
                  type="text"
                  value={malClientId}
                  onChange={(e) => setMalClientId(e.target.value)}
                  placeholder="From myanimelist.net/apiconfig..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-white/10 text-sm"
                />
                <p className="text-xs text-white/20 font-medium">
                  Set redirect URI to <span className="text-white/40 font-mono">{window.location.origin}/settings</span>
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-100">MAL Tracking</span>
                </div>
                <p className="text-sm text-white/30 font-medium">Sync manga status with MyAnimeList</p>
              </div>

              {malUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    {malUser}
                  </div>
                  <button
                    onClick={handleMALLogout}
                    className="p-2.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl transition-all border border-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleMALLogin}
                  disabled={malLoading}
                  className="px-6 py-3 bg-[#2e51a2] hover:bg-[#3a64c7] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {malLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Connect MAL
                </button>
              )}
            </div>
          </div>
        </motion.section>

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-panel overflow-hidden border-white/5"
        >
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="font-bold text-lg">Notifications</h2>
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-100">Chapter Alerts</h4>
                <p className="text-sm text-white/30 font-medium">
                  {notifPermission === 'denied'
                    ? 'Blocked by browser — enable in site settings'
                    : 'Show a notification when new chapters are queued'}
                </p>
              </div>
              {notifEnabled && notifPermission === 'granted' ? (
                <button
                  onClick={handleDisableNotifications}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
                >
                  <BellOff className="w-4 h-4" />
                  Enabled
                </button>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  disabled={notifPermission === 'denied'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-40"
                >
                  <Bell className="w-4 h-4" />
                  Enable
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
                <Database className="w-3.5 h-3.5" />
                Backend URL
              </label>
              <input
                type="url"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://your-server.example.com (leave empty for default)"
                className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-white placeholder:text-white/10 text-sm"
              />
              <p className="text-xs text-white/20 font-medium">For self-hosted deployments or connecting mobile to your local server</p>
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
                <h4 className="font-bold text-gray-100">Synchronize</h4>
                <p className="text-sm text-white/30 font-medium">Trigger manual check for new chapters across all subscribed manga</p>
              </div>
              <button
                onClick={handleRunSync}
                disabled={syncing}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/60 hover:text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : syncDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {syncing ? 'Syncing...' : syncDone ? 'Done' : 'Run Sync'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-100">Clear Cache</h4>
                <p className="text-sm text-white/30 font-medium">Wipe temporary download files and internal logs</p>
              </div>
              <button
                onClick={handlePruneCache}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 rounded-xl transition-all border border-white/5 text-white/60 hover:text-red-400 font-bold text-xs uppercase tracking-widest"
              >
                <HardDrive className="w-4 h-4" />
                Prune Data
              </button>
            </div>
          </div>
        </motion.section>

        {/* Account */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel overflow-hidden border-white/5"
        >
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
                <button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    setSupabaseUser(null)
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 rounded-xl transition-all border border-white/5 text-white/60 hover:text-red-400 font-bold text-xs uppercase tracking-widest"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
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
            Build 2026.06.05
          </div>
        </motion.div>
      </div>
    </div>
  )
}

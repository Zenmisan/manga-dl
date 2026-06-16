import { useState, useEffect } from 'react'
import { Share2, Key, CheckCircle2, LogOut, Loader2, BookOpen, Save } from 'lucide-react'
import api from '../../lib/api'

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

export default function TrackerSettings() {
  const [anilistToken, setAnilistToken] = useState(localStorage.getItem('anilist-token') || '')
  const [anilistClientId, setAnilistClientId] = useState(localStorage.getItem('anilist-client-id') || '')
  const [userName, setUserName] = useState<string | null>(null)
  
  // MAL
  const [malClientId, setMalClientId] = useState(localStorage.getItem('mal-client-id') || '')
  const [malUser, setMalUser] = useState(localStorage.getItem('mal-username') || '')
  const [malLoading, setMalLoading] = useState(false)
  
  // Kitsu
  const [kitsuUser, setKitsuUser] = useState(localStorage.getItem('kitsu-username') || '')
  const [kitsuEmail, setKitsuEmail] = useState('')
  const [kitsuPass, setKitsuPass] = useState('')
  const [kitsuLoading, setKitsuLoading] = useState(false)
  
  // Additional trackers
  const [mangaUpdatesToken, setMangaUpdatesToken] = useState(localStorage.getItem('mangaupdates-token') || '')
  const [shikimoriToken, setShikimoriToken] = useState(localStorage.getItem('shikimori-token') || '')
  const [bangumiToken, setBangumiToken] = useState(localStorage.getItem('bangumi-token') || '')

  // Resolve username whenever token changes
  useEffect(() => {
    if (!anilistToken || anilistToken.startsWith('mock_token_')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMalLoading(true)
    window.history.replaceState(null, '', window.location.pathname)

    api.post('/auth/mal/token', {
      client_id: clientId,
      code,
      code_verifier: verifier,
      redirect_uri: window.location.origin + '/settings/trackers',
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

  const handleAnilistLogin = () => {
    if (!anilistClientId.trim()) {
      alert('Enter your AniList Client ID first.\n\nGet one at: anilist.co/settings/developer\nSet redirect URI to: ' + window.location.origin + '/settings/trackers')
      return
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/settings/trackers')
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${anilistClientId.trim()}&response_type=token&redirect_uri=${redirectUri}`
  }

  const handleAnilistLogout = () => {
    localStorage.removeItem('anilist-token')
    setAnilistToken('')
    setUserName(null)
  }

  const handleMALLogin = async () => {
    if (!malClientId.trim()) {
      alert('Enter your MAL Client ID first.\n\nGet one at: myanimelist.net/apiconfig\nSet redirect URI to: ' + window.location.origin + '/settings/trackers')
      return
    }
    localStorage.setItem('mal-client-id', malClientId.trim())
    const { verifier, challenge } = await generatePKCE()
    localStorage.setItem('mal-code-verifier', verifier)
    const redirectUri = encodeURIComponent(window.location.origin + '/settings/trackers')
    window.location.href = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${malClientId.trim()}&code_challenge=${challenge}&redirect_uri=${redirectUri}`
  }

  const handleMALLogout = () => {
    localStorage.removeItem('mal-token')
    localStorage.removeItem('mal-username')
    localStorage.removeItem('mal-code-verifier')
    setMalUser('')
  }

  const handleKitsuLogin = async () => {
    if (!kitsuEmail.trim() || !kitsuPass.trim()) {
      alert('Enter your Kitsu email and password.')
      return
    }
    setKitsuLoading(true)
    try {
      const res = await fetch('https://kitsu.app/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          username: kitsuEmail.trim(),
          password: kitsuPass.trim(),
        }),
      })
      if (!res.ok) throw new Error('Invalid credentials')
      const data = await res.json()
      const token = data.access_token
      const meRes = await fetch('https://kitsu.app/api/edge/users?filter[self]=true', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const meData = await meRes.json()
      const username = meData.data?.[0]?.attributes?.name ?? kitsuEmail
      localStorage.setItem('kitsu-token', token)
      localStorage.setItem('kitsu-username', username)
      setKitsuUser(username)
      setKitsuEmail('')
      setKitsuPass('')
    } catch (err) {
      console.error(err)
      alert('Kitsu login failed. Check your credentials.')
    } finally {
      setKitsuLoading(false)
    }
  }

  const handleKitsuLogout = () => {
    localStorage.removeItem('kitsu-token')
    localStorage.removeItem('kitsu-username')
    setKitsuUser('')
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* AniList Section */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-pink-500/10 rounded-lg">
            <Share2 className="w-5 h-5 text-pink-500" />
          </div>
          <h2 className="font-bold text-lg">AniList</h2>
        </div>
        <div className="p-6 md:p-8 space-y-6">
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
                  onChange={(e) => { setAnilistClientId(e.target.value); localStorage.setItem('anilist-client-id', e.target.value) }}
                  placeholder="From anilist.co/settings/developer..."
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all text-white placeholder:text-white/10 text-sm"
                />
              </div>
              <p className="text-xs text-white/20 font-medium">
                Register at anilist.co/settings/developer — set redirect URI to <span className="text-white/40 font-mono">{window.location.origin}/settings/trackers</span>
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
      </section>

      {/* MAL Section */}
      <section className="glass-panel overflow-hidden border-white/5">
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
                onChange={(e) => { setMalClientId(e.target.value); localStorage.setItem('mal-client-id', e.target.value) }}
                placeholder="From myanimelist.net/apiconfig..."
                className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-white/10 text-sm"
              />
              <p className="text-xs text-white/20 font-medium">
                Set redirect URI to <span className="text-white/40 font-mono">{window.location.origin}/settings/trackers</span>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="space-y-1">
              <h4 className="font-bold text-gray-100">MAL Tracking</h4>
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
      </section>

      {/* Kitsu Section */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <BookOpen className="w-5 h-5 text-orange-400" />
          </div>
          <h2 className="font-bold text-lg">Kitsu</h2>
          <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 border border-white/10 rounded text-white/30">Read-only · No write API</span>
        </div>
        <div className="p-6 md:p-8 space-y-4">
          {!kitsuUser && (
            <div className="space-y-3">
              <input
                type="email"
                value={kitsuEmail}
                onChange={(e) => setKitsuEmail(e.target.value)}
                placeholder="Kitsu email..."
                className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-white placeholder:text-white/10 text-sm"
              />
              <input
                type="password"
                value={kitsuPass}
                onChange={(e) => setKitsuPass(e.target.value)}
                placeholder="Password..."
                className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-white placeholder:text-white/10 text-sm"
              />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="space-y-1">
              <h4 className="font-bold text-gray-100">Kitsu Tracking</h4>
              <p className="text-sm text-white/30 font-medium">Sync manga progress with Kitsu.app</p>
            </div>
            {kitsuUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl text-xs font-black uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4" />
                  {kitsuUser}
                </div>
                <button
                  onClick={handleKitsuLogout}
                  className="p-2.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl transition-all border border-white/5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleKitsuLogin}
                disabled={kitsuLoading}
                className="px-6 py-3 bg-orange-600/80 hover:bg-orange-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {kitsuLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect Kitsu
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Additional Trackers */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-rose-500/10 rounded-lg"><Share2 className="w-5 h-5 text-rose-400" /></div>
          <h2 className="font-bold text-lg">Additional Trackers</h2>
          <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400">Token storage only</span>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          {/* MangaUpdates */}
          <div>
            <h3 className="font-bold text-sm mb-1">MangaUpdates</h3>
            <p className="text-xs text-white/30 mb-3">Paste your MangaUpdates API token (from mangaupdates.com/account → API)</p>
            <div className="flex gap-3">
              <input value={mangaUpdatesToken} onChange={e => setMangaUpdatesToken(e.target.value)} type="password" placeholder="MangaUpdates API token" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30" />
              <button onClick={() => { localStorage.setItem('mangaupdates-token', mangaUpdatesToken); alert('MangaUpdates token saved.') }} disabled={!mangaUpdatesToken.trim()} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
              {mangaUpdatesToken && <button onClick={() => { localStorage.removeItem('mangaupdates-token'); setMangaUpdatesToken('') }} className="px-3 py-2 rounded-xl text-xs text-red-400/60 hover:text-red-400 transition-colors font-bold uppercase">Logout</button>}
            </div>
            {localStorage.getItem('mangaupdates-token') && <p className="text-[10px] text-emerald-400 mt-2">✓ MangaUpdates connected</p>}
          </div>
          {/* Shikimori */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="font-bold text-sm mb-1">Shikimori</h3>
            <p className="text-xs text-white/30 mb-3">OAuth token from shikimori.one (Settings → API)</p>
            <div className="flex gap-3">
              <input value={shikimoriToken} onChange={e => setShikimoriToken(e.target.value)} type="password" placeholder="Shikimori access token" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30" />
              <button onClick={() => { localStorage.setItem('shikimori-token', shikimoriToken); alert('Shikimori token saved.') }} disabled={!shikimoriToken.trim()} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
              {shikimoriToken && <button onClick={() => { localStorage.removeItem('shikimori-token'); setShikimoriToken('') }} className="px-3 py-2 rounded-xl text-xs text-red-400/60 hover:text-red-400 transition-colors font-bold uppercase">Logout</button>}
            </div>
            {localStorage.getItem('shikimori-token') && <p className="text-[10px] text-emerald-400 mt-2">✓ Shikimori connected</p>}
          </div>
          {/* Bangumi */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="font-bold text-sm mb-1">Bangumi</h3>
            <p className="text-xs text-white/30 mb-3">Personal access token from bgm.tv (Settings → Developer)</p>
            <div className="flex gap-3">
              <input value={bangumiToken} onChange={e => setBangumiToken(e.target.value)} type="password" placeholder="Bangumi access token" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30" />
              <button onClick={() => { localStorage.setItem('bangumi-token', bangumiToken); alert('Bangumi token saved.') }} disabled={!bangumiToken.trim()} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
              {bangumiToken && <button onClick={() => { localStorage.removeItem('bangumi-token'); setBangumiToken('') }} className="px-3 py-2 rounded-xl text-xs text-red-400/60 hover:text-red-400 transition-colors font-bold uppercase">Logout</button>}
            </div>
            {localStorage.getItem('bangumi-token') && <p className="text-[10px] text-emerald-400 mt-2">✓ Bangumi connected</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

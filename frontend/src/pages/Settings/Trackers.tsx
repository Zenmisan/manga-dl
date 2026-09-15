import { useState, useEffect } from 'react'
import { CheckCircle2, LogOut, Save, Share2 } from 'lucide-react'
import { ThemedSpinner } from '../../components/common/ThemedLoader'
import { motion } from 'framer-motion'
import api from '../../lib/api'

const INPUT_STYLE: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-hover)', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--border)', minHeight: 52 }

function CardLabel({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 14, height: 14, color: 'var(--accent)' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted2)', flex: 1 }}>{title}</span>
      {badge}
    </div>
  )
}

// ── MAL PKCE helpers ────────────────────────────────────────────────────────
// MAL only supports the "plain" PKCE transform: code_challenge === code_verifier.
// Using S256 here will cause token exchange to fail.
function generatePKCE() {
  const array = new Uint8Array(96)
  crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').slice(0, 128)
  return { verifier, challenge: verifier }
}

async function fetchAniListUsername(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query: '{ Viewer { name } }' }) })
    const data = await res.json()
    return data.data?.Viewer?.name ?? null
  } catch { return null }
}

const ease = [0.16, 1, 0.3, 1] as const

const DEFAULT_ANILIST_CLIENT_ID = '50135'
const DEFAULT_MAL_CLIENT_ID = 'f00d5e6690b08489b0b5e2e25d1fdb28'

// Evict any cached client IDs that are wrong:
// - known stale values from before the app had registered clients
// - AniList client IDs must be integers; anything else (e.g. a secret) is invalid
const STALE_MAL_CLIENT_IDS = ['e59d9c72e27606e987c09ff8a3a0e6e7']
const STALE_ANILIST_CLIENT_IDS = ['51213']

function evictStaleClients() {
  const mal = localStorage.getItem('mal-client-id')
  if (mal && STALE_MAL_CLIENT_IDS.includes(mal)) localStorage.removeItem('mal-client-id')

  const al = localStorage.getItem('anilist-client-id')
  if (al && (!/^\d+$/.test(al.trim()) || STALE_ANILIST_CLIENT_IDS.includes(al.trim()))) localStorage.removeItem('anilist-client-id')
}
evictStaleClients()

export default function TrackerSettings() {
  const [anilistToken, setAnilistToken] = useState(localStorage.getItem('anilist-token') || '')
  const [anilistClientId, setAnilistClientId] = useState(localStorage.getItem('anilist-client-id') || '')
  const [showAdvancedAnilist, setShowAdvancedAnilist] = useState(false)
  const [, setShowManualAnilist] = useState(false)
  const [manualAnilistToken, setManualAnilistToken] = useState('')
  const [userName, setUserName] = useState<string | null>(null)

  const [malClientId, setMalClientId] = useState(localStorage.getItem('mal-client-id') || '')
  const [showAdvancedMAL, setShowAdvancedMAL] = useState(false)
  const [malUser, setMalUser] = useState(localStorage.getItem('mal-username') || '')
  const [malLoading, setMalLoading] = useState(false)
  
  const [kitsuUser, setKitsuUser] = useState(localStorage.getItem('kitsu-username') || '')
  const [kitsuEmail, setKitsuEmail] = useState('')
  const [kitsuPass, setKitsuPass] = useState('')
  const [kitsuLoading, setKitsuLoading] = useState(false)
  const [mangaUpdatesToken, setMangaUpdatesToken] = useState(localStorage.getItem('mangaupdates-token') || '')
  const [shikimoriToken, setShikimoriToken] = useState(localStorage.getItem('shikimori-token') || '')
  const [bangumiToken, setBangumiToken] = useState(localStorage.getItem('bangumi-token') || '')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!anilistToken || anilistToken.startsWith('mock_token_')) { setUserName(null); return }
    fetchAniListUsername(anilistToken).then(name => setUserName(name))
  }, [anilistToken])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code || state !== 'anilist') return
    window.history.replaceState(null, '', window.location.pathname)
    const redirectUri = window.location.origin + '/settings/trackers'
    api.post('/auth/anilist/token', { code, redirect_uri: redirectUri })
      .then(res => {
        localStorage.setItem('anilist-token', res.data.access_token)
        setAnilistToken(res.data.access_token)
        if (res.data.username) setUserName(res.data.username)
      })
      .catch(err => { const detail = err?.response?.data?.detail || err?.message || String(err); console.error('AniList auth failed:', err); alert('AniList login failed: ' + detail) })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const verifier = localStorage.getItem('mal-code-verifier')
    const clientId = localStorage.getItem('mal-client-id') || DEFAULT_MAL_CLIENT_ID
    if (!code || !verifier) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMalLoading(true)
    window.history.replaceState(null, '', window.location.pathname)
    api.post('/auth/mal/token', { client_id: clientId, code, code_verifier: verifier, redirect_uri: window.location.origin + '/settings/trackers' })
      .then(res => { localStorage.setItem('mal-token', res.data.access_token); localStorage.setItem('mal-username', res.data.username); localStorage.removeItem('mal-code-verifier'); setMalUser(res.data.username) })
      .catch(err => { const detail = err?.response?.data?.detail || err?.message || String(err); console.error('MAL auth failed:', err); alert('MAL login failed: ' + detail) })
      .finally(() => setMalLoading(false))
  }, [])

  const handleAnilistLogin = () => {
    const effectiveClientId = (anilistClientId.trim() || DEFAULT_ANILIST_CLIENT_ID).trim()
    const redirectUri = encodeURIComponent(window.location.origin + '/settings/trackers')
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${effectiveClientId}&response_type=code&redirect_uri=${redirectUri}&state=anilist`
  }
  const handleAnilistLogout = () => { localStorage.removeItem('anilist-token'); setAnilistToken(''); setUserName(null) }
  const handleManualAnilistSave = async () => {
    const token = manualAnilistToken.trim()
    if (!token) return
    const name = await fetchAniListUsername(token)
    if (!name) { alert('Invalid token — could not verify with AniList.'); return }
    localStorage.setItem('anilist-token', token)
    setAnilistToken(token)
    setUserName(name)
    setManualAnilistToken('')
    setShowManualAnilist(false)
  }

  const handleMALLogin = () => {
    const effectiveClientId = (malClientId.trim() || DEFAULT_MAL_CLIENT_ID).trim()
    localStorage.setItem('mal-client-id', effectiveClientId)
    const { verifier, challenge } = generatePKCE()
    localStorage.setItem('mal-code-verifier', verifier)
    const redirectUri = encodeURIComponent(window.location.origin + '/settings/trackers')
    window.location.href = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${effectiveClientId}&code_challenge=${challenge}&code_challenge_method=plain&redirect_uri=${redirectUri}`
  }
  const handleMALLogout = () => { localStorage.removeItem('mal-token'); localStorage.removeItem('mal-username'); localStorage.removeItem('mal-code-verifier'); setMalUser('') }

  const handleKitsuLogin = async () => {
    if (!kitsuEmail.trim() || !kitsuPass.trim()) { alert('Enter your Kitsu email and password.'); return }
    setKitsuLoading(true)
    try {
      const res = await fetch('https://kitsu.io/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          username: kitsuEmail.trim(),
          password: kitsuPass.trim(),
          client_id: 'dd031b32d2f56c990b1425efe6c42ad847e7be3fd185aa076f5c767371a5e7e',
          client_secret: '54d7307928f63414defd96399fc31ba847961ceaecef3a5fd93144e960c0e151',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.access_token) {
        const msg = data.error_description || data.error || data.message || 'Invalid credentials'
        throw new Error(msg)
      }
      const token = data.access_token
      const meRes = await fetch('https://kitsu.io/api/edge/users?filter[self]=true', { headers: { Authorization: `Bearer ${token}` } })
      const meData = await meRes.json()
      const username = meData.data?.[0]?.attributes?.name ?? kitsuEmail
      localStorage.setItem('kitsu-token', token); localStorage.setItem('kitsu-username', username)
      setKitsuUser(username); setKitsuEmail(''); setKitsuPass('')
    } catch (err) { console.error(err); alert(`Kitsu login failed: ${(err as Error).message}`) }
    finally { setKitsuLoading(false) }
  }
  const handleKitsuLogout = () => { localStorage.removeItem('kitsu-token'); localStorage.removeItem('kitsu-username'); setKitsuUser('') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="hidden md:block" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--fg)', marginBottom: 4 }}>Trackers</h2>
        <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Link your manga tracking accounts with 1-click automatic progress sync.</p>
      </div>

      {/* AniList Card */}
      <motion.section className="glass-card" style={{ padding: '22px 20px', marginBottom: 14 }}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.4, ease }}
      >
        <CardLabel icon={Share2} title="AniList" />

        {userName ? (
          <div style={ROW}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>AniList Integration</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 2 }}>Auto-sync reading progress with AniList</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', fontSize: 12, fontWeight: 700, color: 'rgb(74,222,128)' }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> {userName}
              </div>
              <button onClick={handleAnilistLogout} className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10 }} title="Logout">
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Primary: 1-click OAuth */}
            <button
              onClick={handleAnilistLogin}
              className="px-4 py-2.5 bg-[#3DB4F2] text-white font-extrabold text-xs rounded-xl hover:bg-[#3DB4F2]/80 transition-all w-full"
            >
              Connect with AniList
            </button>
            <p style={{ fontSize: 11, color: 'var(--muted3)', margin: 0, lineHeight: 1.5 }}>
              You'll be redirected to AniList to approve access, then brought back here automatically.
            </p>

            {/* Self-host / advanced */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowAdvancedAnilist(!showAdvancedAnilist)}
                className="text-[11px] font-bold text-zinc-500 hover:text-white transition-colors"
              >
                {showAdvancedAnilist ? '▲ Hide' : '▼ Self-hosting or need a custom client?'}
              </button>
              {showAdvancedAnilist && (
                <div className="mt-3 space-y-3">
                  {/* Setup instructions */}
                  <div style={{ padding: '11px 13px', borderRadius: 10, background: 'rgba(61,180,242,0.06)', border: '1px solid rgba(61,180,242,0.15)', fontSize: 11.5, color: 'var(--muted1)', lineHeight: 1.75 }}>
                    <strong style={{ color: '#3DB4F2', display: 'block', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      How to create your own AniList client
                    </strong>
                    <ol style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <li>Go to <a href="https://anilist.co/settings/developer" target="_blank" rel="noreferrer" style={{ color: '#3DB4F2' }}>anilist.co/settings/developer</a> and log in.</li>
                      <li>Click <strong>Create new client</strong>.</li>
                      <li>Set <strong>Name</strong> to anything (e.g. "Manga-dl").</li>
                      <li>Set <strong>Redirect URL</strong> to exactly:<br />
                        <code style={{ fontSize: 10, background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2 }}>
                          {window.location.origin}/settings/trackers
                        </code>
                      </li>
                      <li>Leave <strong>Grant type</strong> as <em>Implicit</em> (default). Save.</li>
                      <li>Copy the <strong>Client ID</strong> (a number) and paste below.</li>
                    </ol>
                    <p style={{ margin: '8px 0 0', fontSize: 10.5, color: 'var(--muted3)' }}>
                      You do not need the Client Secret for the implicit grant flow.
                    </p>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={anilistClientId}
                      onChange={(e) => {
                        const v = e.target.value
                        setAnilistClientId(v)
                        if (/^\d*$/.test(v)) localStorage.setItem('anilist-client-id', v)
                      }}
                      placeholder="Your AniList Client ID (numbers only)..."
                      style={INPUT_STYLE}
                    />
                    {anilistClientId && !/^\d+$/.test(anilistClientId) && (
                      <p style={{ fontSize: 10.5, color: 'rgb(251,113,133)', margin: '4px 0 0' }}>
                        AniList Client ID must be a number (e.g. 50135) — not the secret.
                      </p>
                    )}
                  </div>
                  {anilistClientId.trim() && (
                    <button onClick={handleAnilistLogin} className="px-4 py-2 bg-[#3DB4F2] text-white font-extrabold text-xs rounded-xl hover:bg-[#3DB4F2]/80 transition-all w-full">
                      Authorize with your client
                    </button>
                  )}

                  {/* Manual token paste — last resort */}
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted3)', cursor: 'pointer' }}>Paste token manually (advanced)</summary>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input
                        type="password"
                        value={manualAnilistToken}
                        onChange={e => setManualAnilistToken(e.target.value)}
                        placeholder="Paste access_token here..."
                        style={{ ...INPUT_STYLE, flex: 1, width: 'auto' }}
                      />
                      <button
                        onClick={handleManualAnilistSave}
                        disabled={!manualAnilistToken.trim()}
                        className="btn-primary"
                        style={{ flexShrink: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Save style={{ width: 13, height: 13 }} /> Save
                      </button>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.section>

      {/* MyAnimeList Card */}
      <motion.section className="glass-card" style={{ padding: '22px 20px', marginBottom: 14 }}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, duration: 0.4, ease }}
      >
        <CardLabel icon={Share2} title="MyAnimeList" />
        <div style={ROW}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>MAL Tracking</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 2 }}>Sync manga status with MyAnimeList</div>
          </div>
          {malUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', fontSize: 12, fontWeight: 700, color: 'rgb(56,189,248)' }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> {malUser}
              </div>
              <button onClick={handleMALLogout} className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10 }} title="Logout">
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ) : (
            <button onClick={handleMALLogin} disabled={malLoading} className="px-4 py-2 bg-[#2E51A2] text-white font-extrabold text-xs rounded-xl hover:bg-[#2E51A2]/80 transition-all shadow-md flex items-center gap-1.5">
              {malLoading && <ThemedSpinner size="xs" />} Connect MyAnimeList
            </button>
          )}
        </div>
        {!malUser && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowAdvancedMAL(!showAdvancedMAL)}
              className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors"
            >
              {showAdvancedMAL ? '▲ Hide' : '▼ Self-hosting or need a custom client?'}
            </button>
            {showAdvancedMAL && (
              <div className="mt-3 space-y-3">
                <div style={{ padding: '11px 13px', borderRadius: 10, background: 'rgba(46,81,162,0.12)', border: '1px solid rgba(46,81,162,0.3)', fontSize: 11.5, color: 'var(--muted1)', lineHeight: 1.75 }}>
                  <strong style={{ color: 'rgb(99,149,255)', display: 'block', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    How to create your own MAL client
                  </strong>
                  <ol style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <li>Go to <a href="https://myanimelist.net/apiconfig" target="_blank" rel="noreferrer" style={{ color: 'rgb(99,149,255)' }}>myanimelist.net/apiconfig</a> and log in.</li>
                    <li>Click <strong>Create ID</strong>.</li>
                    <li>Set <strong>App Name</strong> to anything (e.g. "Manga-dl").</li>
                    <li>Set <strong>App Type</strong> to <em>web</em>.</li>
                    <li>Set <strong>App Redirect URL</strong> to exactly:<br />
                      <code style={{ fontSize: 10, background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2 }}>
                        {window.location.origin}/settings/trackers
                      </code>
                    </li>
                    <li>Fill <strong>App Description</strong> with 50+ characters (required).</li>
                    <li>Submit → copy the <strong>Client ID</strong> (a long string) and paste below.</li>
                  </ol>
                  <p style={{ margin: '8px 0 0', fontSize: 10.5, color: 'var(--muted3)' }}>
                    You don't need the Client Secret — Manga-dl uses PKCE (plain method, as required by MAL).
                  </p>
                </div>
                <input
                  type="text"
                  value={malClientId}
                  onChange={(e) => { setMalClientId(e.target.value); localStorage.setItem('mal-client-id', e.target.value) }}
                  placeholder="Your MAL Client ID..."
                  style={INPUT_STYLE}
                />
              </div>
            )}
          </div>
        )}
      </motion.section>

      <motion.section className="glass-card" style={{ padding: '22px 20px', marginBottom: 14 }}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.4, ease }}
      >
        <CardLabel
          icon={Share2}
          title="Kitsu"
          badge={<span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 6 }}>Read-only</span>}
        />
        {!kitsuUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <input type="email" value={kitsuEmail} onChange={e => setKitsuEmail(e.target.value)} placeholder="Kitsu email..." style={INPUT_STYLE} />
            <input type="password" value={kitsuPass} onChange={e => setKitsuPass(e.target.value)} placeholder="Password..." style={INPUT_STYLE} />
          </div>
        )}
        <div style={ROW}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>Kitsu Tracking</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 2 }}>Sync manga progress with Kitsu.app</div>
          </div>
          {kitsuUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', fontSize: 12, fontWeight: 700, color: 'rgb(251,146,60)' }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> {kitsuUser}
              </div>
              <button onClick={handleKitsuLogout} className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10 }}>
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ) : (
            <button onClick={handleKitsuLogin} disabled={kitsuLoading} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {kitsuLoading && <ThemedSpinner size="xs" />} Connect
            </button>
          )}
        </div>
      </motion.section>

      <motion.section className="glass-card" style={{ padding: '22px 20px', marginBottom: 14 }}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.21, duration: 0.4, ease }}
      >
        <CardLabel
          icon={Share2}
          title="Additional Trackers"
          badge={<span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgb(251,191,36)', border: '1px solid rgba(251,191,36,0.3)', padding: '2px 7px', borderRadius: 6 }}>Token storage only</span>}
        />

        {[
          { label: 'MangaUpdates', key: 'mangaupdates-token', val: mangaUpdatesToken, set: setMangaUpdatesToken, placeholder: 'MangaUpdates API token' },
          { label: 'Shikimori', key: 'shikimori-token', val: shikimoriToken, set: setShikimoriToken, placeholder: 'Shikimori access token' },
          { label: 'Bangumi', key: 'bangumi-token', val: bangumiToken, set: setBangumiToken, placeholder: 'Bangumi access token' },
        ].map((t, i) => (
          <div key={t.key} style={i > 0 ? { borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 } : {}}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>{t.label}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={t.val} onChange={e => t.set(e.target.value)} type="password" placeholder={t.placeholder} style={{ ...INPUT_STYLE, flex: 1, width: 'auto' }} />
              <button onClick={() => { localStorage.setItem(t.key, t.val); alert(`${t.label} token saved.`) }} disabled={!t.val.trim()} className="btn-secondary" style={{ flexShrink: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save style={{ width: 13, height: 13 }} /> Save
              </button>
              {t.val && <button onClick={() => { localStorage.removeItem(t.key); t.set('') }} style={{ padding: '0 10px', fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>}
            </div>
            {localStorage.getItem(t.key) && <div style={{ fontSize: 11, color: 'rgb(74,222,128)', marginTop: 6 }}>✓ {t.label} connected</div>}
          </div>
        ))}
      </motion.section>
    </div>
  )
}

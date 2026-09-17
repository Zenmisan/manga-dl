import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, ShieldCheck, LogOut, CheckCircle2, Share2, ExternalLink, Save, Smartphone, Sparkles, LogIn, UserPlus, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import api from '../../lib/api'
import { ThemedSpinner } from '../../components/common/ThemedLoader'

const SECTION: React.CSSProperties = { padding: '22px 20px', marginBottom: 14 }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--border)', minHeight: 52 }
const INPUT_STYLE: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-hover)', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }

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

export default function AccountProfileSettings() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  // Backend profile state
  const [username, setUsername] = useState<string | null>(null)     // null = not yet set
  const [displayName, setDisplayName] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState('')

  const [profileLoaded, setProfileLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [stats, setStats] = useState({ chapters_read: 0, manga_count: 0, streak_days: 1 })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (u) setUser({ id: u.id, email: u.email })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setProfileLoaded(true); return }

    api.get('/users/me')
      .then(r => {
        const un: string | null = r.data.username ?? null
        setUsername(un)
        setUsernameInput(un ?? '')
        // fetch display_name via comments endpoint
        return api.get('/comments/display-name').catch(() => null)
      })
      .then(r => {
        const dn: string = r?.data?.display_name ?? ''
        setDisplayName(dn)
        setDisplayNameInput(dn)
        setProfileLoaded(true)
      })
      .catch(() => setProfileLoaded(true))

    api.get('/users/me/stats').then(r => {
      if (r.data) setStats(s => ({
        chapters_read: r.data.chapters_read ?? s.chapters_read,
        manga_count: r.data.manga_count ?? s.manga_count,
        streak_days: r.data.streak_days ?? s.streak_days,
      }))
    }).catch(() => {})
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Set username once if not yet set
      if (!username) {
        const un = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
        if (!un || un.length < 3) {
          setError('Username must be at least 3 characters (letters, numbers, underscores)')
          setSaving(false)
          return
        }
        await api.post('/users/profile/setup', { username: un })
        setUsername(un)
      }

      // Update display name (always allowed)
      const dn = displayNameInput.trim()
      if (dn !== displayName) {
        await api.patch('/comments/display-name', { display_name: dn })
        setDisplayName(dn)
      }

      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 3000)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Failed to save profile')
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${username ?? user?.id ?? ''}`
    if (navigator.share) {
      try { await navigator.share({ title: `${displayName || username || 'Reader'}'s Profile`, url }) } catch { /* no-op */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="hidden md:block" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Account & Profile</h1>
        <p style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2 }}>Manage your identity and reading profile.</p>
      </div>

      {/* ── Account Status ── */}
      <motion.section className="glass-card" style={SECTION} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <CardLabel
          icon={ShieldCheck}
          title="Account Status"
          badge={
            user ? (
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgb(74,222,128)', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', padding: '2px 8px', borderRadius: 6 }}>Active</span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted3)', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6 }}>Guest</span>
            )
          }
        />
        {user ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, flexShrink: 0, boxShadow: '0 4px 16px var(--accent-glow)' }}>
                {(displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || user.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail style={{ width: 12, height: 12, color: 'var(--muted3)' }} />
                  <span>{user.email}</span>
                </div>
              </div>
              <button onClick={handleSignOut} className="icon-btn" style={{ borderRadius: 10, padding: '8px 12px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <LogOut style={{ width: 14, height: 14 }} />
                <span style={{ fontSize: 11, fontWeight: 800, marginLeft: 6 }}>Sign Out</span>
              </button>
            </div>

            <div style={ROW}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>User ID</div>
                <div style={{ fontSize: 11, color: 'var(--muted3)', fontFamily: 'monospace', marginTop: 2 }}>{user.id}</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(user.id); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}>
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>

            <div style={ROW}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Smartphone style={{ width: 14, height: 14, color: 'var(--accent)' }} /> Cloud Sync
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 2 }}>Signed in across devices</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgb(74,222,128)', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', padding: '3px 9px', borderRadius: 8 }}>Synced</span>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.6, marginBottom: 16 }}>Sign in to sync reading progress across devices.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/login" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none' }}><LogIn style={{ width: 14, height: 14 }} /> Sign In</Link>
              <Link to="/register" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none' }}><UserPlus style={{ width: 14, height: 14 }} /> Create Account</Link>
            </div>
          </div>
        )}
      </motion.section>

      {/* ── Reader Profile ── */}
      {user && (
        <motion.section className="glass-card" style={SECTION} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, duration: 0.35 }}>
          <CardLabel icon={User} title="Reader Profile" />

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
              {error}
            </div>
          )}
          {saveDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: 'rgb(74,222,128)', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
              <CheckCircle2 style={{ width: 15, height: 15 }} /> Saved!
            </div>
          )}

          {!profileLoaded ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><ThemedSpinner size="sm" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Username — set once, locked forever */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', display: 'block', marginBottom: 6 }}>
                  Username <span style={{ color: username ? 'var(--muted3)' : 'var(--accent)', marginLeft: 4 }}>· {username ? 'permanent, cannot be changed' : 'choose once — cannot be changed later'}</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted3)', fontWeight: 800, fontSize: 13, pointerEvents: 'none' }}>@</span>
                  <input
                    type="text"
                    value={username ? username : usernameInput}
                    onChange={e => !username && setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    readOnly={!!username}
                    placeholder="yourhandle"
                    style={{
                      ...INPUT_STYLE,
                      paddingLeft: 28,
                      background: username ? 'var(--surface-hover)' : INPUT_STYLE.background,
                      opacity: username ? 0.7 : 1,
                      cursor: username ? 'not-allowed' : 'text',
                    }}
                  />
                  {username && (
                    <Lock style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--muted3)' }} />
                  )}
                </div>
                {username && (
                  <p style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 4 }}>
                    This is your permanent account identifier. It cannot be changed.
                  </p>
                )}
              </div>

              {/* Display Name — freely editable */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', display: 'block', marginBottom: 6 }}>
                  Display Name <span style={{ color: 'var(--muted3)', marginLeft: 4 }}>· can change anytime</span>
                </label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={e => setDisplayNameInput(e.target.value)}
                  placeholder="e.g. Shadow Reader"
                  maxLength={50}
                  style={INPUT_STYLE}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {username && (
                    <Link to={`/profile/${username}`} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                      <ExternalLink style={{ width: 13, height: 13 }} /> View Profile
                    </Link>
                  )}
                  <button type="button" onClick={handleShare} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Share2 style={{ width: 13, height: 13 }} /> {copied ? 'Copied!' : 'Share'}
                  </button>
                </div>
                <button type="button" onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? <ThemedSpinner size="xs" /> : <Save style={{ width: 14, height: 14 }} />}
                  Save
                </button>
              </div>
            </div>
          )}
        </motion.section>
      )}

      {/* ── Reading Stats ── */}
      <motion.section className="glass-card" style={SECTION} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.35 }}>
        <CardLabel icon={Sparkles} title="Reading Activity" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Chapters Read', val: stats.chapters_read, color: 'var(--fg)' },
            { label: 'Library Manga', val: stats.manga_count, color: 'var(--fg)' },
            { label: 'Daily Streak', val: `${stats.streak_days}d 🔥`, color: 'var(--accent)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)' }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
        <Link to="/stats" className="btn-secondary" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          View Full Statistics →
        </Link>
      </motion.section>
    </div>
  )
}

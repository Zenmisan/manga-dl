import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, ShieldCheck, LogOut, CheckCircle2, Share2, ExternalLink, Save, Smartphone, Sparkles, LogIn, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import api from '../../lib/api'
import { ThemedSpinner } from '../../components/common/ThemedLoader'

const SECTION: React.CSSProperties = { padding: '22px 20px', marginBottom: 14 }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--border)', minHeight: 52 }
const INPUT_STYLE: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-hover)', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s' }

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

interface UserProfileMeta {
  username: string
  displayName: string
  bio: string
  avatarUrl: string
  usernameLocked: boolean
}

export default function AccountProfileSettings() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const parsed = JSON.parse(raw)
            const u = parsed.user || parsed.currentSession?.user
            if (u) return { id: u.id, email: u.email }
          }
        }
      }
    } catch { /* no-op */ }
    return null
  })

  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [stats, setStats] = useState<{ chapters_read: number; manga_count: number; streak_days: number }>(() => {
    let localHistoryCount = 0
    let localMangaCount = 0
    try {
      const h = JSON.parse(localStorage.getItem('manga-dl-history') || '[]')
      localHistoryCount = Array.isArray(h) ? h.length : 0
      const subs = JSON.parse(localStorage.getItem('manga-dl-local-subs') || '[]')
      localMangaCount = Array.isArray(subs) ? subs.length : 0
    } catch { /* no-op */ }
    return { chapters_read: localHistoryCount, manga_count: localMangaCount, streak_days: 1 }
  })

  const [meta, setMeta] = useState<UserProfileMeta>(() => {
    try {
      const globalMeta = localStorage.getItem('manga-dl-profile-meta')
      if (globalMeta) return JSON.parse(globalMeta)
    } catch { /* no-op */ }
    return { username: '', displayName: 'Manga Reader', bio: '', avatarUrl: '', usernameLocked: false }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessUser = data.session?.user
      if (sessUser) {
        setUser({ id: sessUser.id, email: sessUser.email })
        const defaultUsername = (sessUser.email ? sessUser.email.split('@')[0] : 'reader').toLowerCase().replace(/[^a-z0-9_]/g, '')
        const defaultName = sessUser.email ? sessUser.email.split('@')[0] : 'Manga Reader'

        const storageKey = `manga-dl-profile-${sessUser.id}`
        const saved = localStorage.getItem(storageKey) || localStorage.getItem('manga-dl-profile-meta')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setMeta({
              username: parsed.username || defaultUsername,
              displayName: parsed.displayName || defaultName,
              bio: parsed.bio || '',
              avatarUrl: parsed.avatarUrl || '',
              usernameLocked: Boolean(parsed.username),
            })
          } catch {
            setMeta({ username: defaultUsername, displayName: defaultName, bio: '', avatarUrl: '', usernameLocked: true })
          }
        } else {
          setMeta({ username: defaultUsername, displayName: defaultName, bio: '', avatarUrl: '', usernameLocked: true })
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const sessUser = session?.user
      if (sessUser) {
        setUser({ id: sessUser.id, email: sessUser.email })
      } else {
        setUser(null)
      }
    })

    // Load reader stats snapshot from backend
    api.get('/users/me/stats')
      .then(res => {
        if (res.data) {
          setStats(prev => ({
            chapters_read: res.data.chapters_read ?? prev.chapters_read,
            manga_count: res.data.manga_count ?? prev.manga_count,
            streak_days: res.data.streak_days ?? prev.streak_days,
          }))
        }
      })
      .catch(() => {
        // Local stats already loaded
      })

    return () => subscription.unsubscribe()
  }, [])

  const handleSave = () => {
    const cleanUsername = meta.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!cleanUsername) {
      setError('Username cannot be empty')
      return
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setSaving(true)
    setError(null)

    const updated: UserProfileMeta = {
      ...meta,
      username: cleanUsername,
      displayName: meta.displayName.trim() || meta.username,
      usernameLocked: true,
    }

    if (user?.id) {
      localStorage.setItem(`manga-dl-profile-${user.id}`, JSON.stringify(updated))
    }
    localStorage.setItem('manga-dl-profile-meta', JSON.stringify(updated))
    setMeta(updated)

    setTimeout(() => {
      setSaving(false)
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 3000)
    }, 400)
  }

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleShareProfile = async () => {
    const shareUrl = user ? `${window.location.origin}/profile/${user.id}` : window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({ title: `${meta.displayName || 'Reader'}'s manga-dl Profile`, url: shareUrl })
      } catch { /* no-op */ }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const shortId = user?.id ? user.id.slice(0, 8).toUpperCase() : 'GUEST'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="hidden md:block" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Account & Profile</h1>
        <p style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2 }}>Manage your manga-dl identity, cloud sync account, and reading profile.</p>
      </div>

      {/* ── Account Status Card ── */}
      <motion.section className="glass-card" style={SECTION} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <CardLabel
          icon={ShieldCheck}
          title="Account Status"
          badge={
            user ? (
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgb(74,222,128)', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', padding: '2px 8px', borderRadius: 6 }}>
                Active Session
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted3)', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6 }}>
                Local Guest
              </span>
            )
          }
        />

        {user ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, flexShrink: 0, boxShadow: '0 4px 16px var(--accent-glow)' }}>
                {meta.avatarUrl ? (
                  <img src={meta.avatarUrl} alt={meta.displayName} style={{ width: '100%', height: '100%', borderRadius: 14, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  (meta.displayName || user.email || 'U')[0].toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.displayName || user.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail style={{ width: 12, height: 12, color: 'var(--muted3)' }} />
                  <span>{user.email}</span>
                </div>
              </div>
              <button onClick={handleSignOut} className="icon-btn" style={{ borderRadius: 10, padding: '8px 12px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }} title="Sign Out">
                <LogOut style={{ width: 14, height: 14 }} />
                <span style={{ fontSize: 11, fontWeight: 800, marginLeft: 6 }}>Sign Out</span>
              </button>
            </div>

            <div style={ROW}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>User UUID</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted3)', fontFamily: 'monospace', marginTop: 2 }}>{user.id}</div>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(user.id); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="btn-secondary"
                style={{ fontSize: 11, padding: '6px 12px' }}
              >
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>

            <div style={ROW}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Smartphone style={{ width: 14, height: 14, color: 'var(--accent)' }} /> Multi-Device Cloud Sync
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 2 }}>Signed in across up to 3 authorized devices</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgb(74,222,128)', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', padding: '3px 9px', borderRadius: 8 }}>
                Synced
              </span>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.6, marginBottom: 16 }}>
              You are currently using local storage. Sign in to synchronize your reading progress, manga library, and extensions across devices with 3-device cloud backup.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/login" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none' }}>
                <LogIn style={{ width: 14, height: 14 }} /> Sign In
              </Link>
              <Link to="/register" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none' }}>
                <UserPlus style={{ width: 14, height: 14 }} /> Create Account
              </Link>
            </div>
          </div>
        )}
      </motion.section>

      {/* ── Public Profile / Identity Card ── */}
      <motion.section className="glass-card" style={SECTION} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, duration: 0.35 }}>
        <CardLabel icon={User} title="Reader Profile" />

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {saveDone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: 'rgb(74,222,128)', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
            <CheckCircle2 style={{ width: 15, height: 15 }} /> Profile updated successfully!
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Display Name */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', display: 'block', marginBottom: 6 }}>
              Display Name
            </label>
            <input
              type="text"
              value={meta.displayName}
              onChange={e => setMeta({ ...meta, displayName: e.target.value })}
              placeholder="e.g. Shadow Reader"
              style={INPUT_STYLE}
            />
          </div>

          {/* Username / Handle */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', display: 'block', marginBottom: 6 }}>
              Public Handle
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted3)', fontWeight: 800, fontSize: 13, pointerEvents: 'none' }}>@</span>
                <input
                  type="text"
                  value={meta.username}
                  onChange={e => setMeta({ ...meta, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="username"
                  style={{ ...INPUT_STYLE, paddingLeft: 28 }}
                />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 4 }}>
              Your profile URL: <code style={{ color: 'var(--fg)', background: 'var(--surface-hover)', padding: '2px 6px', borderRadius: 4 }}>{window.location.origin}/profile/{meta.username || shortId.toLowerCase()}</code>
            </div>
          </div>

          {/* Avatar URL */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', display: 'block', marginBottom: 6 }}>
              Avatar Image URL
            </label>
            <input
              type="url"
              value={meta.avatarUrl}
              onChange={e => setMeta({ ...meta, avatarUrl: e.target.value })}
              placeholder="https://images.unsplash.com/... or direct image link"
              style={INPUT_STYLE}
            />
          </div>

          {/* Bio */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', display: 'block', marginBottom: 6 }}>
              Bio
            </label>
            <textarea
              value={meta.bio}
              onChange={e => setMeta({ ...meta, bio: e.target.value })}
              placeholder="Tell other readers about your favorite genres, webtoons, or reading goals..."
              rows={3}
              style={{ ...INPUT_STYLE, resize: 'vertical' }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {user && (
                <Link
                  to={`/profile/${user.id}`}
                  className="btn-secondary"
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                >
                  <ExternalLink style={{ width: 13, height: 13 }} /> View Public Profile
                </Link>
              )}
              <button
                type="button"
                onClick={handleShareProfile}
                className="btn-secondary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Share2 style={{ width: 13, height: 13 }} /> {copied ? 'Link Copied!' : 'Share'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
              style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {saving ? <ThemedSpinner size="xs" /> : <Save style={{ width: 14, height: 14 }} />}
              Save Profile
            </button>
          </div>
        </div>
      </motion.section>

      {/* ── Reading Stats Snapshot ── */}
      <motion.section className="glass-card" style={SECTION} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.35 }}>
        <CardLabel icon={Sparkles} title="Reading Activity Snapshot" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)' }}>Chapters Read</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--fg)', marginTop: 4 }}>{stats.chapters_read}</div>
          </div>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)' }}>Library Manga</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--fg)', marginTop: 4 }}>{stats.manga_count}</div>
          </div>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)' }}>Daily Streak</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', marginTop: 4 }}>{stats.streak_days}d 🔥</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/stats" className="btn-secondary" style={{ fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            View Full Statistics →
          </Link>
          <Link to="/settings/reader" className="btn-secondary" style={{ fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            Reader Layout Settings →
          </Link>
        </div>
      </motion.section>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User, Mail, ShieldCheck, LogOut, CheckCircle2, Share2,
  ExternalLink, Save, Sparkles, LogIn, UserPlus, Lock,
  Cloud, MessageSquare, AlertCircle, BookOpen, Flame,
  Key, Eye, EyeOff,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import api from '../../lib/api'
import { ThemedSpinner } from '../../components/common/ThemedLoader'

const ease = [0.16, 1, 0.3, 1] as const

const SECTION_CARD: React.CSSProperties = {
  padding: '22px 20px',
  borderRadius: 18,
  border: '1px solid var(--border)',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--surface-hover)',
  fontSize: 13,
  color: 'var(--fg)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return ''
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d}d ago`
    return `${Math.floor(d / 30)}mo ago`
  } catch {
    return ''
  }
}

function CardLabel({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--surface-hover)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 14, height: 14, color: 'var(--accent)' }} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--muted2)',
          flex: 1,
        }}
      >
        {title}
      </span>
      {badge}
    </div>
  )
}

export default function AccountProfileSettings() {
  const navigate = useNavigate()
  const [user, setUser] = useState<SupabaseUser | null>(null)

  // Password / Google login methods state
  const isGoogleUser = Boolean(
    user?.app_metadata?.provider === 'google' ||
    user?.app_metadata?.providers?.includes('google') ||
    user?.identities?.some(id => id.provider === 'google')
  )

  const hasEmailIdentity = Boolean(
    user?.identities?.some(id => id.provider === 'email') ||
    (user?.app_metadata?.providers && user.app_metadata.providers.includes('email') && user.app_metadata.providers.length > 1) ||
    (!isGoogleUser && user?.app_metadata?.provider === 'email')
  )

  const [hasPasswordSet, setHasPasswordSet] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordText, setShowPasswordText] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    if (hasEmailIdentity) {
      setHasPasswordSet(true)
    }
  }, [hasEmailIdentity])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      setPasswordError('Please enter a password.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.')
      return
    }

    setPasswordSaving(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setPasswordSuccess(true)
      setHasPasswordSet(true)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)

      const { data: { user: refreshed } } = await supabase.auth.getUser()
      if (refreshed) setUser(refreshed)

      setTimeout(() => setPasswordSuccess(false), 5000)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to update password.'
      setPasswordError(msg)
    } finally {
      setPasswordSaving(false)
    }
  }

  // Backend profile state
  const [username, setUsername] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState('')

  const [profileLoaded, setProfileLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Inline sign out confirmation (No window.confirm)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const signOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [stats, setStats] = useState({ chapters_read: 0, manga_count: 0, streak_days: 1 })
  const [userComments, setUserComments] = useState<Array<{
    id: string
    provider: string
    manga_id: string
    chapter_id?: string | null
    body: string
    likes: number
    created_at: string
  }>>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setProfileLoaded(true)
      return
    }

    api.get('/users/me')
      .then(r => {
        const un: string | null = r.data.username ?? null
        setUsername(un)
        setUsernameInput(un ?? '')
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
      if (r.data) {
        setStats(s => ({
          chapters_read: r.data.chapters_read ?? s.chapters_read,
          manga_count: r.data.manga_count ?? s.manga_count,
          streak_days: r.data.streak_days ?? s.streak_days,
        }))
      }
    }).catch(() => {})

    setCommentsLoading(true)
    api.get('/comments/mine')
      .then(r => {
        if (Array.isArray(r.data)) setUserComments(r.data)
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false))
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
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

  const requestSignOut = () => {
    setConfirmingSignOut(true)
    if (signOutTimeoutRef.current) clearTimeout(signOutTimeoutRef.current)
    signOutTimeoutRef.current = setTimeout(() => {
      setConfirmingSignOut(false)
    }, 4500)
  }

  const cancelSignOut = () => {
    if (signOutTimeoutRef.current) clearTimeout(signOutTimeoutRef.current)
    setConfirmingSignOut(false)
  }

  const executeSignOut = async () => {
    if (signOutTimeoutRef.current) clearTimeout(signOutTimeoutRef.current)
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch {
      setSigningOut(false)
      setConfirmingSignOut(false)
    }
  }

  useEffect(() => {
    return () => {
      if (signOutTimeoutRef.current) clearTimeout(signOutTimeoutRef.current)
    }
  }, [])

  const handleShare = async () => {
    const handle = username ?? ''
    const url = handle ? `${window.location.origin}/profile/${handle}` : window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName || username || 'Reader'}'s Profile`, url })
      } catch {
        /* no-op */
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Page Header ── */}
      <div className="hidden md:block" style={{ marginBottom: 4 }}>
        <h1
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--fg)',
            margin: 0,
          }}
        >
          Account & Profile
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 4 }}>
          Customize your reader persona, public identity, and cloud synchronization.
        </p>
      </div>

      {!user ? (
        /* ── Atmospheric Guest State ── */
        <motion.section
          className="glass-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '36px 28px',
            borderRadius: 20,
            border: '1px solid var(--border)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease }}
        >
          <div
            style={{
              position: 'absolute',
              top: -60,
              left: -30,
              width: 320,
              height: 260,
              background: 'radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%)',
              opacity: 0.22,
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', maxWidth: 640 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <User style={{ width: 20, height: 20, color: 'var(--accent)' }} />
            </div>

            <h2
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: 24,
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--fg)',
                margin: '0 0 8px',
              }}
            >
              Claim Your Reader Persona
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--muted2)', lineHeight: 1.6, margin: '0 0 24px' }}>
              Sign in to customize your public profile, participate in chapter discussions, track reading streaks, and keep your library synchronized across all your devices.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <Link
                to="/login"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none' }}
              >
                <LogIn style={{ width: 14, height: 14 }} /> Sign In
              </Link>
              <Link
                to="/register"
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none' }}
              >
                <UserPlus style={{ width: 14, height: 14 }} /> Create Account
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                borderTop: '1px solid var(--border)',
                paddingTop: 20,
              }}
            >
              {[
                { icon: Cloud, title: 'Cloud Sync', desc: 'Seamless library synchronization' },
                { icon: MessageSquare, title: 'Discussions', desc: 'Comment & react to manga chapters' },
                { icon: Flame, title: 'Streaks & Stats', desc: 'Track reading progress & milestones' },
              ].map(({ icon: PerkIcon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <PerkIcon style={{ width: 15, height: 15, color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--fg)' }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      ) : (
        <>
          {/* ── Unified Reader Identity Hero Banner ── */}
          <motion.section
            className="glass-card"
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '24px 22px 20px',
              borderRadius: 20,
              border: '1px solid var(--border)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease }}
          >
            {/* Ambient accent glow */}
            <div
              style={{
                position: 'absolute',
                top: -80,
                left: -40,
                width: 320,
                height: 240,
                background: 'radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%)',
                opacity: 0.16,
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Identity Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                  {/* Glowing 64px Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 18,
                        background: 'var(--accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Anton', sans-serif",
                        fontSize: 26,
                        fontWeight: 400,
                        boxShadow: '0 8px 24px -4px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.22)',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                      }}
                    >
                      {(displayName || username || user.email || 'R')[0].toUpperCase()}
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        background: '#22c55e',
                        border: '2.5px solid var(--bg)',
                        boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                      }}
                      title="Active Reader"
                    />
                  </div>

                  {/* Nameplate info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h2
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: 'var(--fg)',
                          margin: 0,
                          letterSpacing: '-0.01em',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayName || username || user.email?.split('@')[0]}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      {username && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted1)' }}>
                          @{username}
                        </span>
                      )}
                      {user.email && (
                        <span style={{ fontSize: 12, color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Mail style={{ width: 12, height: 12, color: 'var(--muted3)' }} />
                          <span>{user.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Pills: View Profile / Share */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    to={`/profile/${username || 'me'}`}
                    className="btn-secondary"
                    style={{
                      fontSize: 12,
                      padding: '7px 13px',
                      borderRadius: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink style={{ width: 13, height: 13 }} />
                    <span>Public Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="btn-secondary"
                    style={{
                      fontSize: 12,
                      padding: '7px 13px',
                      borderRadius: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <Share2 style={{ width: 13, height: 13 }} />
                    <span>{copied ? 'Copied Link!' : 'Share'}</span>
                  </button>
                </div>
              </div>

              {/* Integrated Milestones Snapshot */}
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>{stats.chapters_read}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Chapters Read</span>
                  </div>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>{stats.manga_count}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Library Manga</span>
                  </div>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flame style={{ width: 14, height: 14, color: '#f97316' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>{stats.streak_days}d</span>
                    <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Streak</span>
                  </div>
                </div>

                <Link
                  to="/stats"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>Detailed Statistics</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </motion.section>

          {/* ── 2-Column Responsive Section: Persona & Security ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Reader Persona & Customization (7 Cols) */}
            <motion.section
              className="glass-card lg:col-span-7"
              style={SECTION_CARD}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.4, ease }}
            >
              <CardLabel icon={User} title="Reader Persona" />

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                  role="alert"
                >
                  <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {saveDone && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.25)',
                    color: 'rgb(74,222,128)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  <CheckCircle2 style={{ width: 15, height: 15 }} />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {!profileLoaded ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}>
                  <ThemedSpinner size="sm" />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Display Name Input */}
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'var(--muted3)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Display Name <span style={{ color: 'var(--muted3)', marginLeft: 4 }}>· shown across comments & rankings</span>
                    </label>
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={e => setDisplayNameInput(e.target.value)}
                      placeholder="e.g. Shadow Reader"
                      maxLength={50}
                      style={INPUT_STYLE}
                      className="focus-visible:ring-2 focus-visible:ring-red-500"
                    />
                  </div>

                  {/* Username (Permanent Handle) */}
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'var(--muted3)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Permanent Handle{' '}
                      <span style={{ color: username ? 'var(--muted3)' : 'var(--accent)', marginLeft: 4 }}>
                        · {username ? 'locked to account' : 'choose once — permanent'}
                      </span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--muted3)',
                          fontWeight: 800,
                          fontSize: 13,
                          pointerEvents: 'none',
                        }}
                      >
                        @
                      </span>
                      <input
                        type="text"
                        value={username ? username : usernameInput}
                        onChange={e => !username && setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        readOnly={!!username}
                        placeholder="yourhandle"
                        style={{
                          ...INPUT_STYLE,
                          paddingLeft: 28,
                          background: username ? 'var(--surface)' : INPUT_STYLE.background,
                          opacity: username ? 0.75 : 1,
                          cursor: username ? 'not-allowed' : 'text',
                        }}
                        className="focus-visible:ring-2 focus-visible:ring-red-500"
                      />
                      {username && (
                        <Lock
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 13,
                            height: 13,
                            color: 'var(--muted3)',
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 4 }}>
                      {username
                        ? 'Unique permanent handle for your public profile and mentions.'
                        : 'At least 3 characters. Letters, numbers, and underscores only.'}
                    </p>
                  </div>

                  {/* ── Real User Comments ── */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: 'var(--muted3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <MessageSquare style={{ width: 12, height: 12, color: 'var(--accent)' }} />
                        Your Recent Comments
                      </span>
                      {userComments.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: 'var(--accent)',
                            background: 'var(--accent-muted)',
                            padding: '2px 7px',
                            borderRadius: 6,
                          }}
                        >
                          {userComments.length} {userComments.length === 1 ? 'comment' : 'comments'}
                        </span>
                      )}
                    </div>

                    {commentsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                        <ThemedSpinner size="xs" />
                      </div>
                    ) : userComments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {userComments.slice(0, 3).map((c) => (
                          <div
                            key={c.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.manga_id?.replace(/-/g, ' ')}
                                </span>
                                {c.chapter_id && (
                                  <span style={{ fontSize: 10, color: 'var(--muted2)' }}>
                                    · Ch. {c.chapter_id}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--muted3)', flexShrink: 0 }}>
                                {formatRelativeTime(c.created_at)}
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.4, margin: '2px 0 0', wordBreak: 'break-word' }}>
                              {c.body}
                            </p>
                            {c.likes > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>
                                <span>♥</span>
                                <span>{c.likes}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '12px 6px', textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: 'var(--muted2)', margin: '0 0 4px', lineHeight: 1.5 }}>
                          You haven't posted any comments yet.
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--muted3)', margin: 0 }}>
                          Join the discussion on any manga or chapter, and your comments will appear here.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Save Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary"
                      style={{
                        fontSize: 12.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {saving ? <ThemedSpinner size="xs" /> : <Save style={{ width: 14, height: 14 }} />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.section>

            {/* Right Column: Cloud Sync & Security (5 Cols) */}
            <motion.section
              className="glass-card lg:col-span-5"
              style={{
                ...SECTION_CARD,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease }}
            >
              <div>
                <CardLabel icon={ShieldCheck} title="Account & Sync" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Cloud Sync Status */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Cloud style={{ width: 16, height: 16, color: '#22c55e' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--fg)' }}>Cloud Sync</div>
                        <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 1 }}>Synced across devices</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: '#22c55e',
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      Active
                    </span>
                  </div>

                  {/* Auth Credentials */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Mail style={{ width: 15, height: 15, color: 'var(--muted2)' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--fg)' }}>Authentication</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--muted2)',
                            marginTop: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {user.email || 'Connected'}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: 'var(--muted2)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      Verified
                    </span>
                  </div>

                  {/* Login Methods & Password Security */}
                  <div
                    style={{
                      padding: '14px 14px',
                      borderRadius: 14,
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Lock style={{ width: 15, height: 15, color: 'var(--accent)' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{isGoogleUser && !hasPasswordSet ? 'Google Login (No Password)' : 'Account Password'}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: isGoogleUser && !hasPasswordSet ? '#f59e0b' : '#22c55e',
                                background: isGoogleUser && !hasPasswordSet ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                                border: isGoogleUser && !hasPasswordSet ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(34,197,94,0.25)',
                                padding: '1px 6px',
                                borderRadius: 5,
                              }}
                            >
                              {isGoogleUser && !hasPasswordSet ? 'No Password' : 'Active'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2, lineHeight: 1.35 }}>
                            {isGoogleUser && !hasPasswordSet
                              ? 'Logged in with Google. Add a password to also sign in directly with email.'
                              : 'Password configured as a sign-in method for this account.'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(prev => !prev)
                          setPasswordError(null)
                        }}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 9,
                          background: isGoogleUser && !hasPasswordSet ? 'var(--accent)' : 'var(--surface)',
                          border: isGoogleUser && !hasPasswordSet ? 'none' : '1px solid var(--border)',
                          color: isGoogleUser && !hasPasswordSet ? '#fff' : 'var(--fg)',
                          fontSize: 11.5,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                        className="focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        <Key style={{ width: 12, height: 12 }} />
                        <span>
                          {showPasswordForm
                            ? 'Cancel'
                            : isGoogleUser && !hasPasswordSet
                            ? 'Add Password'
                            : 'Change Password'}
                        </span>
                      </button>
                    </div>

                    {/* Password success message */}
                    {passwordSuccess && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          color: '#22c55e',
                          fontSize: 11.5,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                        <span>Password saved! You can now sign in using your email and password as well.</span>
                      </div>
                    )}

                    {/* Inline Form to Add / Change Password */}
                    {showPasswordForm && (
                      <form
                        onSubmit={handleSetPassword}
                        style={{
                          borderTop: '1px solid var(--border)',
                          paddingTop: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg)' }}>
                          {isGoogleUser && !hasPasswordSet ? 'Create Account Password' : 'Set New Password'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.4 }}>
                          {isGoogleUser && !hasPasswordSet
                            ? 'Enter a password (at least 6 characters). Once set, you can log in with Google or by typing your email and this password.'
                            : 'Enter your new password below (at least 6 characters).'}
                        </div>

                        {passwordError && (
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              color: '#ef4444',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                            <span>{passwordError}</span>
                          </div>
                        )}

                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPasswordText ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value)
                              if (passwordError) setPasswordError(null)
                            }}
                            placeholder="Enter password (min 6 characters)"
                            style={{
                              ...INPUT_STYLE,
                              paddingRight: 40,
                              background: 'var(--surface)',
                            }}
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordText(p => !p)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--muted2)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 4,
                            }}
                            title={showPasswordText ? 'Hide password' : 'Show password'}
                          >
                            {showPasswordText ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                          </button>
                        </div>

                        <div>
                          <input
                            type={showPasswordText ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value)
                              if (passwordError) setPasswordError(null)
                            }}
                            placeholder="Confirm password"
                            style={{
                              ...INPUT_STYLE,
                              background: 'var(--surface)',
                            }}
                            autoComplete="new-password"
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false)
                              setNewPassword('')
                              setConfirmPassword('')
                              setPasswordError(null)
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 10,
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              color: 'var(--muted2)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={passwordSaving || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 10,
                              background: 'var(--accent)',
                              border: 'none',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: (passwordSaving || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer',
                              opacity: (passwordSaving || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword) ? 0.6 : 1,
                            }}
                          >
                            {passwordSaving ? <ThemedSpinner size="xs" /> : <Save style={{ width: 13, height: 13 }} />}
                            <span>{passwordSaving ? 'Saving...' : 'Save Password'}</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Hallmark Inline Confirm Sign Out (No native confirm popup) ── */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 20 }}>
                {!confirmingSignOut ? (
                  <button
                    type="button"
                    onClick={requestSignOut}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: 12,
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.22)',
                      color: '#ef4444',
                      fontSize: 12.5,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    className="focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <LogOut style={{ width: 14, height: 14 }} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted2)', textAlign: 'center' }}>
                      Sign out of this device?
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={executeSignOut}
                        disabled={signingOut}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 12,
                          background: '#dc2626',
                          border: 'none',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          cursor: signingOut ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {signingOut ? <ThemedSpinner size="xs" /> : <LogOut style={{ width: 13, height: 13 }} />}
                        <span>Confirm Sign Out</span>
                      </button>
                      <button
                        type="button"
                        onClick={cancelSignOut}
                        className="btn-secondary"
                        style={{
                          padding: '9px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        </>
      )}
    </div>
  )
}

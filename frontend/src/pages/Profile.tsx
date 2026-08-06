import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, BarChart2, Share2, ArrowLeft, Loader2, User, Calendar, Pencil, Lock, Check, X, ExternalLink, Trash2 } from 'lucide-react'

interface Activity {
  manga_title: string
  chapter_title: string
  provider: string
  updated_at: string | null
}

interface ProfileData {
  user_id: string
  chapters_read: number
  manga_count: number
  streak_days: number
  recent_activity: Activity[]
}

interface UserProfileMeta {
  username: string
  displayName: string
  bio: string
  avatarUrl: string
  usernameLocked: boolean
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

const SEC: React.CSSProperties = { padding: '20px 22px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 12 }
const SEC_TITLE: React.CSSProperties = { fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 14 }

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { readingMode, imageScale } = useAppStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  const modeLabel: Record<string, string> = {
    webtoon: 'Webtoon (scroll)', manga: 'Left to Right', 'manga-rtl': 'Right to Left', 'vertical-pager': 'Vertical Pager'
  }
  const scaleLabel: Record<string, string> = {
    'fit-screen': 'Fit Screen', 'fit-width': 'Fit Width', 'fit-height': 'Fit Height', 'original': 'Original'
  }

  // Profile metadata (username, display name, bio, avatar)
  const [meta, setMeta] = useState<UserProfileMeta>({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    usernameLocked: false
  })

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserProfileMeta>({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    usernameLocked: false
  })
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessUser = data.session?.user
      if (sessUser) {
        setActiveUserId(sessUser.id)
        setCurrentEmail(sessUser.email ?? null)
        const isSelf = !userId || userId === sessUser.id || userId === sessUser.email?.split('@')[0]
        if (isSelf) setIsOwnProfile(true)

        // Load saved profile meta
        const storageKey = `manga-dl-profile-${sessUser.id}`
        const saved = localStorage.getItem(storageKey)
        const defaultUsername = (sessUser.email ? sessUser.email.split('@')[0] : 'reader').toLowerCase().replace(/[^a-z0-9_]/g, '')
        const defaultName = sessUser.email ? sessUser.email.split('@')[0] : 'Manga Reader'

        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setMeta({
              username: parsed.username || defaultUsername,
              displayName: parsed.displayName || defaultName,
              bio: parsed.bio || '',
              avatarUrl: parsed.avatarUrl || '',
              usernameLocked: Boolean(parsed.username)
            })
          } catch {
            setMeta({ username: defaultUsername, displayName: defaultName, bio: '', avatarUrl: '', usernameLocked: true })
          }
        } else {
          setMeta({ username: defaultUsername, displayName: defaultName, bio: '', avatarUrl: '', usernameLocked: true })
        }
      }
    })

    const targetId = userId || 'me'
    api.get(`/users/profile/${targetId}`)
      .then(res => setProfile(res.data))
      .catch(() => {
        // Fallback profile state
        setProfile({
          user_id: targetId,
          chapters_read: 0,
          manga_count: 0,
          streak_days: 1,
          recent_activity: []
        })
      })
      .finally(() => setLoading(false))
  }, [userId])

  const handleOpenEdit = () => {
    setEditForm({ ...meta })
    setEditError(null)
    setIsEditing(true)
  }

  const handleSaveProfile = () => {
    const cleanUsername = editForm.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!cleanUsername) {
      setEditError('Username cannot be empty')
      return
    }
    if (cleanUsername.length < 3) {
      setEditError('Username must be at least 3 characters')
      return
    }

    const updatedMeta: UserProfileMeta = {
      ...editForm,
      username: meta.usernameLocked ? meta.username : cleanUsername,
      displayName: editForm.displayName.trim() || meta.displayName,
      usernameLocked: true
    }

    setMeta(updatedMeta)
    if (activeUserId) {
      localStorage.setItem(`manga-dl-profile-${activeUserId}`, JSON.stringify(updatedMeta))
    }
    setIsEditing(false)
  }

  const handleShare = async () => {
    const handle = meta.username || activeUserId || 'me'
    const shareUrl = `${window.location.origin}/profile/${handle}`
    if (navigator.share) {
      await navigator.share({ title: `${meta.displayName}'s manga-dl Profile`, url: shareUrl })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSignOut = async () => { try { await supabase.auth.signOut() } catch (e) { console.error(e) } }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader2 style={{ width: 36, height: 36, color: '#ef4444' }} className="animate-spin" /></div>

  if (!profile) return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <User style={{ width: 40, height: 40, margin: '0 auto 12px', color: 'var(--muted3)' }} />
      <p style={{ color: 'var(--muted2)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Profile not found</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: 20, color: '#ef4444', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>← Go back</button>
    </div>
  )

  const shortId = profile.user_id.slice(0, 8).toUpperCase()
  const finalDisplayName = meta.displayName || (isOwnProfile && currentEmail ? currentEmail.split('@')[0] : `Reader #${shortId}`)
  const handleTag = meta.username ? `@${meta.username}` : `@reader_${shortId.toLowerCase()}`

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate(-1)} className="icon-btn">
              <ArrowLeft style={{ width: 16, height: 16 }} />
            </button>
            <h1 className="page-title" style={{ fontSize: 20 }}>Profile</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isOwnProfile && (
              <>
                <button
                  onClick={handleOpenEdit}
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Profile
                </button>
                <button onClick={handleSignOut} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#ef4444', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>Sign Out</button>
              </>
            )}
            <button onClick={handleShare} className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10 }} title="Share Profile">
              <Share2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1" style={{ maxWidth: 640, width: '100%', margin: '0 auto' }}>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '24px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18 }}
        >
          {meta.avatarUrl ? (
            <img src={meta.avatarUrl} alt={finalDisplayName} className="w-18 h-18 rounded-full object-cover border-2 border-red-500/30 flex-shrink-0" />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 999, background: 'linear-gradient(135deg, rgba(220,38,38,0.3), rgba(127,29,29,0.3))', border: '2px solid rgba(220,38,38,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#ef4444', flexShrink: 0 }}>
              {finalDisplayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 2 }}>{finalDisplayName}</h2>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-mono font-bold text-red-400">{handleTag}</span>
              <span title="Usernames are permanent and cannot be changed"><Lock className="w-3 h-3 text-zinc-500" /></span>
            </div>
            {meta.bio && <p className="text-xs text-zinc-300 italic mb-2 leading-relaxed">{meta.bio}</p>}
            {currentEmail && <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 6 }}>{currentEmail}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {isOwnProfile && (
                <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgb(74,222,128)', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', padding: '2px 8px', borderRadius: 6 }}>You</span>
              )}
              {copied && <span style={{ fontSize: 11, color: 'var(--muted2)' }}>Profile link copied!</span>}
            </div>
          </div>
        </motion.div>

        {/* Reading Analytics */}
        <div style={{ ...SEC }}>
          <div style={SEC_TITLE}>Reading Analytics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { icon: BookOpen, label: 'Chapters Read', value: profile.chapters_read, color: '#ef4444' },
              { icon: BarChart2, label: 'Manga Followed', value: profile.manga_count, color: 'rgb(56,189,248)' },
              { icon: Calendar, label: 'Days Active', value: profile.streak_days, color: 'rgb(251,146,60)' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ padding: '16px 12px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
                <s.icon style={{ width: 16, height: 16, color: s.color, margin: '0 auto 8px' }} />
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: s.color }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted3)', marginTop: 4 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Linked Integrations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={SEC}>
          <div style={SEC_TITLE}>Linked Integrations</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { name: 'MyAnimeList', abbr: 'MAL', color: '#2e51a2', bg: 'rgba(46,81,162,0.1)', border: 'rgba(46,81,162,0.2)' },
              { name: 'AniList', abbr: 'AL', color: '#02a9ff', bg: 'rgba(2,169,255,0.1)', border: 'rgba(2,169,255,0.2)' },
            ].map(int => (
              <button
                key={int.name}
                onClick={() => navigate('/settings/trackers')}
                style={{ padding: '14px', borderRadius: 14, border: `1px solid ${int.border}`, background: int.bg, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: int.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{int.abbr}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)' }}>{int.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>Connect <ExternalLink style={{ width: 9, height: 9 }} /></div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Reader Preferences */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={SEC}>
          <div style={SEC_TITLE}>Reader Preferences</div>
          {[
            { label: 'Reading Mode', value: modeLabel[readingMode] || readingMode },
            { label: 'Image Scale', value: scaleLabel[imageScale] || imageScale },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{row.label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted2)', fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 2 }}>
            <button onClick={() => navigate('/settings/reader')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Edit preferences →
            </button>
          </div>
        </motion.div>

        {/* Recent Activity */}
        {profile.recent_activity.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={SEC}>
            <div style={SEC_TITLE}>Recent Activity</div>
            {profile.recent_activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: i > 0 ? '10px 0' : '0 0 10px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.manga_title}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.chapter_title} · {a.provider}</p>
                </div>
                <span style={{ fontSize: 10, color: 'var(--muted3)', flexShrink: 0, marginLeft: 12 }}>{relativeTime(a.updated_at)}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Danger Zone */}
        {isOwnProfile && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div style={{ padding: '18px 20px', borderRadius: 20, borderLeft: '4px solid #dc2626', border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#dc2626', marginBottom: 12 }}>Danger Zone</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>Delete Account</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 2 }}>Permanently delete your account and all data</div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete your account permanently? This cannot be undone.')) {
                      supabase.auth.signOut().then(() => navigate('/'))
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.1)', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}
                >
                  <Trash2 style={{ width: 13, height: 13 }} />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-6 border-white/10 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-red-500" /> Edit Profile
                </h3>
                <button onClick={() => setIsEditing(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  {editError}
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Username (Permanent Handle)</span>
                  {meta.usernameLocked && <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    disabled={meta.usernameLocked}
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-red-500/50"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {meta.usernameLocked
                    ? "Usernames cannot be changed once set to preserve comment history and public link integrity."
                    : "Choose wisely! Your username is permanent and forms your public URL."}
                </p>
              </div>

              {/* Display Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="Your Full Name or Nickname"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-red-500/50"
                />
              </div>

              {/* Bio Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Bio / About</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Write something about your manga taste..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500/50 resize-none"
                />
              </div>

              {/* Avatar URL Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.png"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Save Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

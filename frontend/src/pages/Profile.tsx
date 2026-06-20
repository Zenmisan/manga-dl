import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { BookOpen, Flame, BarChart2, Clock, Share2, ArrowLeft, Loader2, User } from 'lucide-react'

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

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    api.get(`/users/profile/${userId}`)
      .then(res => setProfile(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id === userId) {
        setIsOwnProfile(true)
        setCurrentEmail(data.session.user.email ?? null)
      }
    })
  }, [userId])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'My manga-dl profile', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error(e)
    }
    // Clear Supabase local storage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) {
        localStorage.removeItem(key)
        i--
      }
    }
    navigate('/login')
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-12 text-center">
        <User className="w-12 h-12 mx-auto mb-4 text-white/20" />
        <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Profile not found</p>
        <button onClick={() => navigate(-1)} className="mt-6 text-red-400 hover:text-red-300 text-sm font-bold">
          ← Go back
        </button>
      </div>
    )
  }

  const shortId = profile.user_id.slice(0, 8).toUpperCase()
  const displayName = isOwnProfile && currentEmail
    ? currentEmail.split('@')[0]
    : `Reader #${shortId}`

  return (
    <div className="p-6 md:p-12 max-w-3xl mx-auto min-h-full">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-bold mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-10"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/30 to-red-900/30 border border-red-500/20 flex items-center justify-center text-2xl font-black text-red-400">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{displayName}</h1>
            {isOwnProfile && (
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isOwnProfile && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600/15 border border-red-500/20 text-red-400 hover:bg-red-600/25 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Sign Out
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 glass-panel border-white/5 hover:border-white/10 text-white/50 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { icon: BookOpen, label: 'Chapters', value: profile.chapters_read, color: 'text-red-400', bg: 'bg-red-500/10' },
          { icon: BarChart2, label: 'Manga', value: profile.manga_count, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Flame, label: 'Day Streak', value: profile.streak_days, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-5 border-white/5 text-center"
          >
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value.toLocaleString()}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent activity */}
      {profile.recent_activity.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel border-white/5 overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <Clock className="w-5 h-5 text-white/40" />
            <h2 className="font-bold">Recent Activity</h2>
          </div>
          <div className="divide-y divide-white/5">
            {profile.recent_activity.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-white/80 truncate">{a.manga_title}</p>
                  <p className="text-xs text-white/30 font-medium truncate">{a.chapter_title} · {a.provider}</p>
                </div>
                <span className="text-[10px] font-mono text-white/20 shrink-0 ml-4">{relativeTime(a.updated_at)}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {profile.recent_activity.length === 0 && (
        <div className="text-center py-16 text-white/20">
          <BookOpen className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="text-xs font-bold uppercase tracking-widest">No reading activity yet</p>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, BarChart2, Share2, ArrowLeft, Calendar,
  Pencil, Lock, Check, X, Search, Loader2, Award,
  Crown, Sparkles, Flame, Shield, Trophy, Feather,
  Scroll, Star, Infinity as InfinityIcon, Zap, Compass,
  ChevronRight, Settings, ExternalLink, Library, Pin
} from 'lucide-react'
import { ThemedLoadingScreen } from '../components/common/ThemedLoader'
import { usePageTitle } from '../lib/usePageTitle'
import { buildSmartMangaUrl } from '../lib/smartUrl'
import {
  getUserMilestones,
  MilestoneBadge,
  MilestoneCategory,
  MilestoneTier,
  MILESTONES
} from '../lib/milestones'

interface Activity {
  manga_id?: string
  manga_title: string
  chapter_id?: string
  chapter_title: string
  provider: string
  updated_at: string | null
}

interface ProfileData {
  user_id: string
  chapters_read: number
  manga_count: number
  streak_days: number
  pinned_badges?: string[]
  recent_activity: Activity[]
}

interface UserProfileMeta {
  username: string
  displayName: string
  bio: string
  avatarUrl: string
  usernameLocked: boolean
  pinnedBadges?: string[]
}

export function getHunterRank(score: number, isWorldFirst: boolean = false) {
  if (isWorldFirst && score > 0) {
    return {
      code: 'MONARCH',
      name: 'Shadow Monarch',
      tier: 'mythic' as const,
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/40',
      text: 'text-purple-300',
      glow: 'rgba(168, 85, 247, 0.4)',
      tag: '#1 Sovereign'
    }
  }
  if (score >= 15000) {
    return {
      code: 'S',
      name: 'S-Rank Hunter',
      tier: 'diamond' as const,
      border: 'border-purple-400/40',
      bg: 'bg-purple-900/30',
      text: 'text-purple-300',
      glow: 'rgba(168, 85, 247, 0.3)',
      tag: 'Apex Elite'
    }
  }
  if (score >= 8000) {
    return {
      code: 'A',
      name: 'A-Rank Hunter',
      tier: 'platinum' as const,
      border: 'border-sky-400/40',
      bg: 'bg-sky-900/30',
      text: 'text-sky-300',
      glow: 'rgba(56, 189, 248, 0.3)',
      tag: 'High Guild'
    }
  }
  if (score >= 4000) {
    return {
      code: 'B',
      name: 'B-Rank Hunter',
      tier: 'gold' as const,
      border: 'border-amber-400/40',
      bg: 'bg-amber-900/30',
      text: 'text-amber-300',
      glow: 'rgba(245, 158, 11, 0.3)',
      tag: 'Veteran'
    }
  }
  if (score >= 1500) {
    return {
      code: 'C',
      name: 'C-Rank Hunter',
      tier: 'silver' as const,
      border: 'border-slate-400/40',
      bg: 'bg-slate-800/40',
      text: 'text-slate-300',
      glow: 'rgba(148, 163, 184, 0.25)',
      tag: 'Raid Ready'
    }
  }
  if (score >= 500) {
    return {
      code: 'D',
      name: 'D-Rank Hunter',
      tier: 'bronze' as const,
      border: 'border-amber-700/40',
      bg: 'bg-amber-950/30',
      text: 'text-amber-400',
      glow: 'rgba(205, 127, 50, 0.2)',
      tag: 'Dungeon Scavenger'
    }
  }
  return {
    code: 'E',
    name: 'E-Rank Novice',
    tier: 'bronze' as const,
    border: 'border-zinc-700/40',
    bg: 'bg-zinc-900/40',
    text: 'text-zinc-400',
    glow: 'rgba(113, 113, 122, 0.15)',
    tag: 'Awakened Novice'
  }
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

function MilestoneIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  switch (name) {
    case 'BookOpen': return <BookOpen className={className} style={style} />
    case 'Flame': return <Flame className={className} style={style} />
    case 'Library': return <Library className={className} style={style} />
    case 'Crown': return <Crown className={className} style={style} />
    case 'Sparkles': return <Sparkles className={className} style={style} />
    case 'Zap': return <Zap className={className} style={style} />
    case 'Compass': return <Compass className={className} style={style} />
    case 'Shield': return <Shield className={className} style={style} />
    case 'Trophy': return <Trophy className={className} style={style} />
    case 'Feather': return <Feather className={className} style={style} />
    case 'Scroll': return <Scroll className={className} style={style} />
    case 'Star': return <Star className={className} style={style} />
    case 'Infinity': return <InfinityIcon className={className} style={style} />
    default: return <Award className={className} style={style} />
  }
}

function getTierConfig(tier: MilestoneTier) {
  switch (tier) {
    case 'bronze':
      return {
        label: 'Bronze',
        badgeBg: 'bg-amber-900/30',
        badgeBorder: 'border-amber-700/40',
        badgeText: 'text-amber-400',
        glow: 'rgba(205, 127, 50, 0.25)',
      }
    case 'silver':
      return {
        label: 'Silver',
        badgeBg: 'bg-slate-800/40',
        badgeBorder: 'border-slate-400/40',
        badgeText: 'text-slate-300',
        glow: 'rgba(148, 163, 184, 0.25)',
      }
    case 'gold':
      return {
        label: 'Gold',
        badgeBg: 'bg-amber-500/20',
        badgeBorder: 'border-amber-400/40',
        badgeText: 'text-amber-300',
        glow: 'rgba(245, 158, 11, 0.3)',
      }
    case 'platinum':
      return {
        label: 'Platinum',
        badgeBg: 'bg-sky-500/20',
        badgeBorder: 'border-sky-400/40',
        badgeText: 'text-sky-300',
        glow: 'rgba(56, 189, 248, 0.3)',
      }
    case 'diamond':
      return {
        label: 'Diamond',
        badgeBg: 'bg-purple-500/20',
        badgeBorder: 'border-purple-400/40',
        badgeText: 'text-purple-300',
        glow: 'rgba(168, 85, 247, 0.35)',
      }
    case 'mythic':
      return {
        label: 'Mythic',
        badgeBg: 'bg-red-500/25',
        badgeBorder: 'border-red-500/50',
        badgeText: 'text-red-400',
        glow: 'rgba(239, 68, 68, 0.45)',
      }
  }
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  // Profile metadata (username, display name, bio, avatar)
  const [meta, setMeta] = useState<UserProfileMeta>({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    usernameLocked: false
  })

  usePageTitle(meta.displayName ? `${meta.displayName} (@${meta.username || 'reader'})` : 'Reader Profile')

  // Edit Modal State (for owner)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserProfileMeta>({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    usernameLocked: false
  })
  const [editError, setEditError] = useState<string | null>(null)

  // Reader Search Modal State
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<Array<{
    user_id: string
    username: string
    display_name: string
    bio: string
    avatar_url: string
    chapters_read: number
  }>>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  // Milestones Modal State
  const [showMilestonesModal, setShowMilestonesModal] = useState(false)
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | MilestoneCategory>('all')

  // Calculate reader milestones summary
  const milestoneSummary = useMemo(() => {
    return getUserMilestones({
      chapters_read: profile?.chapters_read || 0,
      manga_count: profile?.manga_count || 0,
      streak_days: profile?.streak_days || 0
    })
  }, [profile])

  // Debounced search for readers
  useEffect(() => {
    const q = userQuery.trim()
    if (!q) {
      setUserResults([])
      setSearchingUsers(false)
      return
    }
    setSearchingUsers(true)
    const timer = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(q)}`)
        .then(r => setUserResults(r.data || []))
        .catch(() => setUserResults([]))
        .finally(() => setSearchingUsers(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [userQuery])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const loadProfile = async () => {
      const { data } = await supabase.auth.getSession()
      const sessUser = data.session?.user
      const myId = sessUser?.id || null
      const myEmail = sessUser?.email ?? null
      const localUsername = localStorage.getItem('manga-username')

      setActiveUserId(myId)

      const targetId = userId || 'me'
      const isSelf = targetId === 'me'
        || (myId && targetId === myId)
        || (myEmail && targetId.toLowerCase() === myEmail.split('@')[0].toLowerCase())
        || (localUsername && targetId.toLowerCase() === localUsername.toLowerCase())

      setIsOwnProfile(Boolean(isSelf))

      // If viewing self, load local storage meta as base
      let ownSavedMeta: UserProfileMeta | null = null
      if (isSelf && myId) {
        const storageKey = `manga-dl-profile-${myId}`
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          try { ownSavedMeta = JSON.parse(saved) } catch { /* ignore */ }
        }
      }

      try {
        const res = await api.get(`/users/profile/${targetId}`)
        if (cancelled) return
        setProfile(res.data)

        if (isSelf) {
          const defaultUsername = (myEmail ? myEmail.split('@')[0] : (localUsername || 'reader')).toLowerCase().replace(/[^a-z0-9_]/g, '')
          const defaultName = myEmail ? myEmail.split('@')[0] : 'Manga Reader'
          const badges = res.data.pinned_badges || ownSavedMeta?.pinnedBadges || []
          setMeta({
            username: res.data.username || ownSavedMeta?.username || defaultUsername,
            displayName: res.data.display_name || ownSavedMeta?.displayName || defaultName,
            bio: res.data.bio || ownSavedMeta?.bio || '',
            avatarUrl: res.data.avatar_url || ownSavedMeta?.avatarUrl || '',
            usernameLocked: Boolean(res.data.username || ownSavedMeta?.usernameLocked),
            pinnedBadges: badges
          })
        } else {
          // Viewing someone else: strictly use the fetched data!
          const shortId = (res.data.user_id || targetId).slice(0, 8).toUpperCase()
          setMeta({
            username: res.data.username || (targetId.length <= 24 ? targetId : ''),
            displayName: res.data.display_name || res.data.username || `Reader #${shortId}`,
            bio: res.data.bio || '',
            avatarUrl: res.data.avatar_url || '',
            usernameLocked: true,
            pinnedBadges: res.data.pinned_badges || []
          })
        }
      } catch {
        if (cancelled) return
        setProfile({
          user_id: targetId,
          chapters_read: 0,
          manga_count: 0,
          streak_days: 1,
          pinned_badges: [],
          recent_activity: []
        })
        if (!isSelf) {
          setMeta({
            username: targetId.length <= 24 ? targetId : '',
            displayName: targetId.length <= 24 ? targetId : `Reader #${targetId.slice(0, 8).toUpperCase()}`,
            bio: '',
            avatarUrl: '',
            usernameLocked: true,
            pinnedBadges: []
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [userId])

  const handleOpenEdit = () => {
    setEditForm({
      ...meta,
      pinnedBadges: meta.pinnedBadges ? [...meta.pinnedBadges] : []
    })
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
      usernameLocked: true,
      pinnedBadges: editForm.pinnedBadges || []
    }

    setMeta(updatedMeta)
    if (activeUserId) {
      localStorage.setItem(`manga-dl-profile-${activeUserId}`, JSON.stringify(updatedMeta))
    }
    // Also persist to backend
    api.put('/users/profile', {
      display_name: updatedMeta.displayName,
      bio: updatedMeta.bio,
      avatar_url: updatedMeta.avatarUrl,
      pinned_badges: updatedMeta.pinnedBadges,
    }).catch(() => {})

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

  if (loading) {
    return (
      <ThemedLoadingScreen
        message="Loading Public Profile..."
        subMessage="Gathering reader honors, stats, and achievements..."
      />
    )
  }

  if (!profile) return (
    <div className="py-20 px-6 text-center">
      <Award className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
      <p className="text-zinc-400 font-bold text-sm uppercase tracking-wider">Profile not found</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-red-500 font-bold text-xs hover:underline">
        ← Go back
      </button>
    </div>
  )

  const shortId = profile.user_id.slice(0, 8).toUpperCase()
  const finalDisplayName = meta.displayName || `Reader #${shortId}`
  const handleTag = meta.username ? `@${meta.username}` : `@reader_${shortId.toLowerCase()}`
  const titleTierConfig = getTierConfig(milestoneSummary.currentTitleTier)

  const readerScore = useMemo(() => {
    const ch = profile?.chapters_read || 0
    const strk = profile?.streak_days || 0
    const mg = profile?.manga_count || 0
    return (ch * 10) + (strk * 50) + (mg * 25)
  }, [profile])

  const hunterRank = useMemo(() => {
    return getHunterRank(readerScore)
  }, [readerScore])

  const pinnedBadgeObjects = useMemo(() => {
    const ids = meta.pinnedBadges && meta.pinnedBadges.length > 0
      ? meta.pinnedBadges
      : milestoneSummary.unlocked.slice(-4).reverse().map(b => b.id)
    return ids.map(id => MILESTONES.find(b => b.id === id)).filter(Boolean) as MilestoneBadge[]
  }, [meta.pinnedBadges, milestoneSummary.unlocked])

  // Filtered badges for milestones modal
  const filteredBadges = MILESTONES.filter(b => {
    if (milestoneFilter === 'all') return true
    return b.category === milestoneFilter
  })

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky Header */}
      <header className="sticky-header border-b px-4 md:px-6 py-3 border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="icon-btn" title="Go back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-white leading-tight">Reader Profile</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearchModal(true)}
              className="icon-btn w-9 h-9 rounded-xl text-zinc-400 hover:text-white"
              title="Search Readers"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="icon-btn w-9 h-9 rounded-xl text-zinc-400 hover:text-white"
              title="Share Public Profile"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/settings/profile')}
                className="icon-btn w-9 h-9 rounded-xl text-zinc-400 hover:text-white"
                title="Account Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1 max-w-2xl w-full mx-auto space-y-4">
        {/* Owner Public Preview Notice */}
        {isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <p className="text-xs text-zinc-300 font-semibold truncate">
                Public Profile Preview · <span className="text-zinc-400 font-normal">This is how other readers see you</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleOpenEdit}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Pencil className="w-3 h-3" /> Edit Profile
              </button>
              <button
                onClick={() => navigate('/settings/reader')}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                title="Open reader preferences"
              >
                <Settings className="w-3 h-3" /> Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Hero Showcase Card ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border-white/10 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: milestoneSummary.currentTitleColor }}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
            {/* Avatar */}
            {meta.avatarUrl ? (
              <div className="relative flex-shrink-0">
                <img
                  src={meta.avatarUrl}
                  alt={finalDisplayName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 shadow-xl"
                  style={{ borderColor: milestoneSummary.currentTitleColor }}
                />
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md"
                  style={{ background: milestoneSummary.currentTitleColor, color: '#000' }}
                  title={`${titleTierConfig.label} Tier`}
                >
                  <MilestoneIcon name={milestoneSummary.unlocked[0]?.iconName || 'Award'} className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl flex-shrink-0 relative"
                style={{
                  background: `linear-gradient(135deg, ${milestoneSummary.currentTitleColor}33, rgba(20,20,20,0.8))`,
                  border: `2px solid ${milestoneSummary.currentTitleColor}66`
                }}
              >
                {finalDisplayName.slice(0, 2).toUpperCase()}
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md"
                  style={{ background: milestoneSummary.currentTitleColor, color: '#000' }}
                  title={`${titleTierConfig.label} Tier`}
                >
                  <MilestoneIcon name={milestoneSummary.unlocked[0]?.iconName || 'Award'} className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight truncate">
                  {finalDisplayName}
                </h2>
                {isOwnProfile && (
                  <button
                    onClick={handleOpenEdit}
                    title="Edit profile"
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Handle, Title Badge, and Permanent Hunter Standing Badge */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1">
                  {handleTag}
                  <Lock className="w-2.5 h-2.5 text-zinc-500" title="Permanent reader handle" />
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${titleTierConfig.badgeBg} ${titleTierConfig.badgeBorder} ${titleTierConfig.badgeText}`}
                >
                  <Crown className="w-3 h-3" />
                  {milestoneSummary.currentTitle}
                </span>

                {/* Permanent Hunter Standing Badge (Cannot be toggled off) */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${hunterRank.bg} ${hunterRank.border} ${hunterRank.text}`}
                  style={{ boxShadow: `0 0 12px ${hunterRank.glow}` }}
                  title={`Guild Hunter Standing: ${hunterRank.name} (${readerScore.toLocaleString()} EXP)`}
                >
                  <Shield className="w-3 h-3 flex-shrink-0" />
                  <span>{hunterRank.name}</span>
                </span>
              </div>

              {/* Bio */}
              {meta.bio ? (
                <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed break-words">
                  {meta.bio}
                </p>
              ) : isOwnProfile ? (
                <p
                  onClick={handleOpenEdit}
                  className="text-xs text-zinc-500 italic mt-2 cursor-pointer hover:text-zinc-400 transition-colors"
                >
                  + Add an about blurb or bio to your profile
                </p>
              ) : null}
            </div>
          </div>

          {/* ── Pinned Showcase Honors ─────────────────────────────── */}
          <div className="mt-5 pt-4 border-t border-white/10 w-full relative z-10">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                  Pinned Showcase Badges ({pinnedBadgeObjects.length}/4)
                </span>
              </div>
              {isOwnProfile && (
                <button
                  onClick={handleOpenEdit}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Pin className="w-3 h-3" /> Customize Badges
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {pinnedBadgeObjects.map(badge => {
                const cfg = getTierConfig(badge.tier)
                return (
                  <div
                    key={badge.id}
                    onClick={() => setShowMilestonesModal(true)}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-2.5 group shadow-sm"
                    title={`${badge.title} (${cfg.label}): ${badge.description}`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
                      style={{ background: badge.color }}
                    >
                      <MilestoneIcon name={badge.iconName} className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black text-white group-hover:text-red-400 transition-colors truncate">
                        {badge.title}
                      </div>
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide truncate">
                        {cfg.label} · {badge.category}
                      </div>
                    </div>
                  </div>
                )
              })}
              {pinnedBadgeObjects.length === 0 && (
                <div
                  onClick={isOwnProfile ? handleOpenEdit : undefined}
                  className={`col-span-2 sm:col-span-4 p-3 rounded-xl border border-dashed border-white/10 text-center text-xs text-zinc-500 ${isOwnProfile ? 'cursor-pointer hover:border-red-500/40 hover:text-zinc-400' : ''}`}
                >
                  {isOwnProfile ? '+ Pin up to 4 unlocked milestone badges to showcase here' : 'No pinned badges yet.'}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Reading Highlights (Stats Grid) ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-4 text-center border-white/10"
          >
            <BookOpen className="w-4 h-4 mx-auto mb-2 text-red-500" />
            <div className="text-xl font-black font-mono text-red-400">
              {profile.chapters_read.toLocaleString()}
            </div>
            <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mt-1">
              Chapters Read
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4 text-center border-white/10"
          >
            <Library className="w-4 h-4 mx-auto mb-2 text-sky-400" />
            <div className="text-xl font-black font-mono text-sky-400">
              {profile.manga_count.toLocaleString()}
            </div>
            <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mt-1">
              Series Read
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-4 text-center border-white/10"
          >
            <Flame className="w-4 h-4 mx-auto mb-2 text-amber-400" />
            <div className="text-xl font-black font-mono text-amber-400">
              {profile.streak_days.toLocaleString()}
            </div>
            <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mt-1">
              Days Active
            </div>
          </motion.div>
        </div>

        {/* ── Milestones & Achievements Section ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 border-white/10 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Reader Milestones
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold">
                {milestoneSummary.unlockedCount} / {milestoneSummary.totalCount} Unlocked
              </span>
            </div>
            <button
              onClick={() => setShowMilestonesModal(true)}
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              View All (31) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Next Milestone Card */}
          {milestoneSummary.nextMilestone ? (
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <MilestoneIcon name={milestoneSummary.nextMilestone.badge.iconName} className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white">
                      Next: {milestoneSummary.nextMilestone.badge.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 ml-2">
                      ({milestoneSummary.nextMilestone.badge.category})
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-300">
                  {milestoneSummary.nextMilestone.percent}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${milestoneSummary.nextMilestone.percent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                <span>{milestoneSummary.nextMilestone.badge.description}</span>
                <span className="font-mono font-bold text-zinc-300">
                  {milestoneSummary.nextMilestone.current} / {milestoneSummary.nextMilestone.total} ({milestoneSummary.nextMilestone.remaining} left)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>All 31 Milestones Unlocked! True Manga-dl Ascended Legend.</span>
            </div>
          )}

          {/* Top Unlocked Badges Showcase */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Featured Honors
            </div>

            {milestoneSummary.unlocked.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2 text-center">
                Read your first chapter to earn your first milestone badge!
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {milestoneSummary.unlocked.slice(-6).reverse().map((badge) => {
                  const cfg = getTierConfig(badge.tier)
                  return (
                    <div
                      key={badge.id}
                      onClick={() => setShowMilestonesModal(true)}
                      className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                          style={{ background: badge.color }}
                        >
                          <MilestoneIcon name={badge.iconName} className="w-4 h-4 text-black" />
                        </div>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-white group-hover:text-red-400 transition-colors truncate">
                          {badge.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {badge.description}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Recent Reading Activity Shelf ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 border-white/10 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-red-500" /> Recent Reading Activity
            </h3>
            <span className="text-[10px] font-bold text-zinc-400">
              {profile.recent_activity.length} recent
            </span>
          </div>

          {profile.recent_activity.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              No public reading activity recorded yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {profile.recent_activity.map((a, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (a.provider && a.manga_id) {
                      navigate(buildSmartMangaUrl(a.provider, a.manga_id, a.manga_title))
                    } else {
                      navigate(`/search?q=${encodeURIComponent(a.manga_title)}`)
                    }
                  }}
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                      {a.manga_title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {a.chapter_title} · <span className="uppercase text-[10px] text-zinc-400 font-semibold">{a.provider}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-zinc-400">
                      {relativeTime(a.updated_at)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Owner Bridge to Settings & Private Preferences ───────────── */}
        {isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-5 border-white/10 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-red-400" /> Looking for your private preferences?
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Configure reading mode, page scaling, theme accents, tracker integrations, and account security.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate('/settings/reader')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-all text-center"
              >
                Reader Controls
              </button>
              <button
                onClick={() => navigate('/settings/profile')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all text-center"
              >
                Account Settings
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Milestones Gallery Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showMilestonesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[85vh] glass-card p-6 border-white/10 shadow-2xl relative flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-black text-white">All Reader Milestones</h3>
                    <p className="text-xs text-zinc-400">
                      {milestoneSummary.unlockedCount} of {milestoneSummary.totalCount} milestones conquered
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMilestonesModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-2 py-3 border-b border-white/10 overflow-x-auto scrollbar-none flex-shrink-0">
                <button
                  onClick={() => setMilestoneFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    milestoneFilter === 'all' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({MILESTONES.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('chapters')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    milestoneFilter === 'chapters' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Chapters ({milestoneSummary.categoryCounts.chapters.unlocked}/{milestoneSummary.categoryCounts.chapters.total})
                </button>
                <button
                  onClick={() => setMilestoneFilter('library')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    milestoneFilter === 'library' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Library className="w-3.5 h-3.5" />
                  Library ({milestoneSummary.categoryCounts.library.unlocked}/{milestoneSummary.categoryCounts.library.total})
                </button>
                <button
                  onClick={() => setMilestoneFilter('streak')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    milestoneFilter === 'streak' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  Streak ({milestoneSummary.categoryCounts.streak.unlocked}/{milestoneSummary.categoryCounts.streak.total})
                </button>
              </div>

              {/* Milestones Grid */}
              <div className="overflow-y-auto py-4 pr-1 space-y-3 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBadges.map((b) => {
                    const isUnlocked = milestoneSummary.unlocked.some(u => u.id === b.id)
                    const cfg = getTierConfig(b.tier)
                    const statVal = b.category === 'chapters' ? profile.chapters_read : b.category === 'library' ? profile.manga_count : profile.streak_days
                    const progressPercent = Math.min(100, Math.floor((statVal / b.threshold) * 100))

                    return (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                          isUnlocked
                            ? 'bg-white/[0.05] border-white/20'
                            : 'bg-white/[0.015] border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{
                                background: isUnlocked ? b.color : 'rgba(255,255,255,0.06)',
                                color: isUnlocked ? '#000' : 'var(--muted3)'
                              }}
                            >
                              <MilestoneIcon name={b.iconName} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className={`text-xs font-black truncate ${isUnlocked ? 'text-white' : 'text-zinc-400'}`}>
                                {b.title}
                              </h4>
                              <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                                {b.description}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}>
                            {cfg.label}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                          {isUnlocked ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Unlocked ({b.threshold} {b.category})
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-medium flex items-center gap-1">
                              <Lock className="w-3 h-3 text-zinc-500" /> Needs {b.threshold} {b.category} ({Math.max(0, b.threshold - statVal)} to go)
                            </span>
                          )}
                          <span className="font-mono text-zinc-400 font-bold">{progressPercent}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Public Profile Modal (Owner Only) ────────────────────── */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-6 border-white/10 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-red-500" /> Edit Public Profile
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
                  {meta.usernameLocked && (
                    <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
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
                <p className="text-[10px] text-zinc-400 mt-1">
                  {meta.usernameLocked
                    ? "Your username is permanently linked to your profile URL."
                    : "Choose carefully. Your handle forms your public profile link."}
                </p>
              </div>

              {/* Display Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="Your Name or Nickname"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-red-500/50"
                />
              </div>

              {/* Bio Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Bio / About Blurb</label>
                  <span className="text-[9px] text-zinc-400 font-mono">{editForm.bio.length} / 160</span>
                </div>
                <textarea
                  value={editForm.bio}
                  maxLength={160}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell other readers about your favorite manga, genres, or current reading goals..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500/50 resize-none leading-relaxed"
                />
              </div>

              {/* Avatar URL Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Avatar Image URL</label>
                <div className="flex items-center gap-3">
                  {editForm.avatarUrl ? (
                    <img src={editForm.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-red-500/30 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 text-xs font-bold flex-shrink-0">
                      IMG
                    </div>
                  )}
                  <input
                    type="url"
                    value={editForm.avatarUrl}
                    onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                    placeholder="https://example.com/avatar.png"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500/50"
                  />
                </div>
              </div>

              {/* Pinned Showcase Badges (Select up to 4) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pinned Showcase Badges ({editForm.pinnedBadges?.length || 0}/4)</span>
                  </label>
                  <span className="text-[9px] text-zinc-400">Choose up to 4 to pin</span>
                </div>

                {milestoneSummary.unlocked.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-1">
                    No milestone badges unlocked yet. Keep reading to unlock honors to pin here!
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {milestoneSummary.unlocked.map(badge => {
                        const isPinned = (editForm.pinnedBadges || []).includes(badge.id)
                        const cfg = getTierConfig(badge.tier)
                        return (
                          <div
                            key={badge.id}
                            onClick={() => {
                              const current = editForm.pinnedBadges || []
                              if (isPinned) {
                                setEditForm({
                                  ...editForm,
                                  pinnedBadges: current.filter(id => id !== badge.id)
                                })
                              } else {
                                if (current.length >= 4) {
                                  setEditError('Maximum 4 pinned badges allowed')
                                  return
                                }
                                setEditError(null)
                                setEditForm({
                                  ...editForm,
                                  pinnedBadges: [...current, badge.id]
                                })
                              }
                            }}
                            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isPinned
                                ? 'bg-amber-500/15 border-amber-500/40 text-white'
                                : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: badge.color }}
                              >
                                <MilestoneIcon name={badge.iconName} className="w-3.5 h-3.5 text-black" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-white truncate">
                                  {badge.title}
                                </div>
                                <div className="text-[9px] text-zinc-400 truncate">
                                  {cfg.label} · {badge.category}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isPinned ? (
                                <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                  <Check className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className="p-1 rounded-md bg-white/5 text-zinc-600 hover:text-zinc-400 flex items-center justify-center">
                                  <Pin className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Reader Search Modal ─────────────────────────────────────────── */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="w-full max-w-lg glass-card p-5 border-white/10 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-red-500" /> Search Readers
                </h3>
                <button
                  onClick={() => { setShowSearchModal(false); setUserQuery('') }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by username or display name..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50"
                />
                {searchingUsers ? (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 animate-spin" />
                ) : userQuery ? (
                  <button
                    onClick={() => setUserQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Results list */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {userQuery.trim() === '' ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    Type a username or display name to search for other readers.
                  </div>
                ) : searchingUsers && userResults.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" /> Searching reader profiles...
                  </div>
                ) : userResults.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    No readers found matching "{userQuery}"
                  </div>
                ) : (
                  userResults.map((u) => (
                    <div
                      key={u.user_id}
                      onClick={() => {
                        setShowSearchModal(false)
                        setUserQuery('')
                        navigate(`/profile/${u.username || u.user_id}`)
                      }}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-red-500/30 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-xs flex-shrink-0">
                            {(u.display_name || u.username || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                              {u.display_name || u.username}
                            </span>
                            {u.username && (
                              <span className="text-[10px] font-mono text-zinc-400 truncate">
                                @{u.username}
                              </span>
                            )}
                          </div>
                          {u.bio && (
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{u.bio}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                          {u.chapters_read || 0} ch
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

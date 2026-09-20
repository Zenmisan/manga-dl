export type MilestoneCategory = 'chapters' | 'library' | 'streak'
export type MilestoneTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'mythic'

export interface MilestoneBadge {
  id: string
  title: string
  category: MilestoneCategory
  threshold: number
  description: string
  iconName: 'BookOpen' | 'Flame' | 'Library' | 'Award' | 'Crown' | 'Sparkles' | 'Zap' | 'Compass' | 'Shield' | 'Trophy' | 'Feather' | 'Scroll' | 'Star' | 'Infinity'
  tier: MilestoneTier
  color: string
  gradient: string
}

export const MILESTONES: MilestoneBadge[] = [
  // ── Chapters Read Milestones (15 Tiers) ──────────────────────────────────
  {
    id: 'first_page',
    title: 'First Page',
    category: 'chapters',
    threshold: 1,
    description: 'Took the very first step into the panel multiverse.',
    iconName: 'BookOpen',
    tier: 'bronze',
    color: '#cd7f32',
    gradient: 'from-amber-700/20 to-amber-900/10'
  },
  {
    id: 'page_turner',
    title: 'Page Turner',
    category: 'chapters',
    threshold: 10,
    description: 'Getting hooked on the panel flow and cliffhangers.',
    iconName: 'BookOpen',
    tier: 'bronze',
    color: '#cd7f32',
    gradient: 'from-amber-700/20 to-amber-900/10'
  },
  {
    id: 'casual_reader',
    title: 'Casual Reader',
    category: 'chapters',
    threshold: 25,
    description: 'Finding curiosity in every story arc.',
    iconName: 'Feather',
    tier: 'bronze',
    color: '#cd7f32',
    gradient: 'from-amber-700/20 to-amber-900/10'
  },
  {
    id: 'manga_enthusiast',
    title: 'Manga Enthusiast',
    category: 'chapters',
    threshold: 50,
    description: 'A dependable appetite for weekly releases.',
    iconName: 'Scroll',
    tier: 'silver',
    color: '#94a3b8',
    gradient: 'from-slate-400/20 to-slate-600/10'
  },
  {
    id: 'volume_devourer',
    title: 'Volume Devourer',
    category: 'chapters',
    threshold: 100,
    description: 'Consumed a physical shelf worth of tankōbon.',
    iconName: 'BookOpen',
    tier: 'silver',
    color: '#94a3b8',
    gradient: 'from-slate-400/20 to-slate-600/10'
  },
  {
    id: 'arc_conqueror',
    title: 'Arc Conqueror',
    category: 'chapters',
    threshold: 250,
    description: 'Cruised through epic sagas without blinking.',
    iconName: 'Shield',
    tier: 'silver',
    color: '#94a3b8',
    gradient: 'from-slate-400/20 to-slate-600/10'
  },
  {
    id: 'binge_specialist',
    title: 'Binge Specialist',
    category: 'chapters',
    threshold: 500,
    description: 'Lost entire weekends to non-stop chapter binges.',
    iconName: 'Zap',
    tier: 'gold',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-yellow-600/10'
  },
  {
    id: 'panel_virtuoso',
    title: 'Panel Virtuoso',
    category: 'chapters',
    threshold: 750,
    description: 'Appreciating every masterstroke and speed line.',
    iconName: 'Award',
    tier: 'gold',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-yellow-600/10'
  },
  {
    id: 'four_digit_club',
    title: 'Four-Digit Club',
    category: 'chapters',
    threshold: 1000,
    description: 'Crossed the 1,000 chapter milestone. Truly unstoppable.',
    iconName: 'Trophy',
    tier: 'gold',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-yellow-600/10'
  },
  {
    id: 'lore_master',
    title: 'Lore Master',
    category: 'chapters',
    threshold: 1500,
    description: 'Anticipating plot twists three arcs ahead of the canon.',
    iconName: 'Compass',
    tier: 'platinum',
    color: '#38bdf8',
    gradient: 'from-sky-400/20 to-cyan-600/10'
  },
  {
    id: 'ink_veteran',
    title: 'Ink Veteran',
    category: 'chapters',
    threshold: 2500,
    description: 'Years of serialized releases cannot quench your thirst.',
    iconName: 'Star',
    tier: 'platinum',
    color: '#38bdf8',
    gradient: 'from-sky-400/20 to-cyan-600/10'
  },
  {
    id: 'grand_reader',
    title: 'Grand Reader',
    category: 'chapters',
    threshold: 4000,
    description: 'A walking encyclopedia of character arcs and legends.',
    iconName: 'Sparkles',
    tier: 'platinum',
    color: '#38bdf8',
    gradient: 'from-sky-400/20 to-cyan-600/10'
  },
  {
    id: 'domain_sovereign',
    title: 'Domain Sovereign',
    category: 'chapters',
    threshold: 6000,
    description: 'Expanded your reading domain across countless universes.',
    iconName: 'Crown',
    tier: 'diamond',
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-indigo-600/10'
  },
  {
    id: 'mythic_scholar',
    title: 'Mythic Scholar',
    category: 'chapters',
    threshold: 8500,
    description: 'Few mortals possess such boundless panel wisdom.',
    iconName: 'Crown',
    tier: 'diamond',
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-indigo-600/10'
  },
  {
    id: 'ascended_otaku',
    title: 'Ascended Otaku',
    category: 'chapters',
    threshold: 10000,
    description: 'Transcended the mortal realm of manga reading.',
    iconName: 'Infinity',
    tier: 'mythic',
    color: '#ef4444',
    gradient: 'from-red-500/25 to-rose-700/15'
  },

  // ── Series Followed / Diversity Milestones (8 Tiers) ──────────────────────
  {
    id: 'solo_diver',
    title: 'Solo Diver',
    category: 'library',
    threshold: 1,
    description: 'Laser focus on a single captivating story journey.',
    iconName: 'Compass',
    tier: 'bronze',
    color: '#cd7f32',
    gradient: 'from-amber-700/20 to-amber-900/10'
  },
  {
    id: 'genre_curious',
    title: 'Genre Curious',
    category: 'library',
    threshold: 5,
    description: 'Sampling distinct tropes, genres, and art styles.',
    iconName: 'Library',
    tier: 'bronze',
    color: '#cd7f32',
    gradient: 'from-amber-700/20 to-amber-900/10'
  },
  {
    id: 'shelf_builder',
    title: 'Shelf Builder',
    category: 'library',
    threshold: 10,
    description: 'Curating a personalized library lineup.',
    iconName: 'Library',
    tier: 'silver',
    color: '#94a3b8',
    gradient: 'from-slate-400/20 to-slate-600/10'
  },
  {
    id: 'apprentice_curator',
    title: 'Apprentice Curator',
    category: 'library',
    threshold: 25,
    description: 'A rich palette spanning shonen, seinen, and beyond.',
    iconName: 'Library',
    tier: 'silver',
    color: '#94a3b8',
    gradient: 'from-slate-400/20 to-slate-600/10'
  },
  {
    id: 'manga_collector',
    title: 'Manga Collector',
    category: 'library',
    threshold: 50,
    description: 'A flourishing digital collection spanning dozens of worlds.',
    iconName: 'Library',
    tier: 'gold',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-yellow-600/10'
  },
  {
    id: 'grand_bibliophile',
    title: 'Grand Bibliophile',
    category: 'library',
    threshold: 100,
    description: 'Master of over a hundred distinct story universes.',
    iconName: 'Award',
    tier: 'platinum',
    color: '#38bdf8',
    gradient: 'from-sky-400/20 to-cyan-600/10'
  },
  {
    id: 'multiverse_voyager',
    title: 'Multiverse Voyager',
    category: 'library',
    threshold: 200,
    description: 'Navigated hundreds of timelines, worlds, and characters.',
    iconName: 'Sparkles',
    tier: 'diamond',
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-indigo-600/10'
  },
  {
    id: 'archive_sovereign',
    title: 'Archive Sovereign',
    category: 'library',
    threshold: 350,
    description: 'Custodian of a monumental personal manga repository.',
    iconName: 'Crown',
    tier: 'mythic',
    color: '#ef4444',
    gradient: 'from-red-500/25 to-rose-700/15'
  },

  // ── Streak & Dedication Milestones (8 Tiers) ───────────────────────────────
  {
    id: 'ignition_spark',
    title: 'Ignition Spark',
    category: 'streak',
    threshold: 1,
    description: 'Ignited the flame of daily manga reading.',
    iconName: 'Flame',
    tier: 'bronze',
    color: '#cd7f32',
    gradient: 'from-amber-700/20 to-amber-900/10'
  },
  {
    id: 'momentum',
    title: 'Momentum',
    category: 'streak',
    threshold: 3,
    description: 'Building a steady, continuous reading rhythm.',
    iconName: 'Flame',
    tier: 'bronze',
    color: '#cd7f32',
    gradient: 'from-amber-700/20 to-amber-900/10'
  },
  {
    id: 'weekly_devotee',
    title: 'Weekly Devotee',
    category: 'streak',
    threshold: 7,
    description: 'A full 7-day week of uninterrupted daily reading.',
    iconName: 'Flame',
    tier: 'silver',
    color: '#94a3b8',
    gradient: 'from-slate-400/20 to-slate-600/10'
  },
  {
    id: 'fortnight_fanatic',
    title: 'Fortnight Fanatic',
    category: 'streak',
    threshold: 14,
    description: 'Two solid weeks without missing a single day.',
    iconName: 'Flame',
    tier: 'silver',
    color: '#94a3b8',
    gradient: 'from-slate-400/20 to-slate-600/10'
  },
  {
    id: 'monthly_habit',
    title: 'Monthly Habit',
    category: 'streak',
    threshold: 30,
    description: 'One solid month of daily manga immersion.',
    iconName: 'Flame',
    tier: 'gold',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-yellow-600/10'
  },
  {
    id: 'seasoned_soul',
    title: 'Seasoned Soul',
    category: 'streak',
    threshold: 60,
    description: 'A continuous reading streak persevering across seasons.',
    iconName: 'Flame',
    tier: 'platinum',
    color: '#38bdf8',
    gradient: 'from-sky-400/20 to-cyan-600/10'
  },
  {
    id: 'centurion_flame',
    title: 'Centurion Flame',
    category: 'streak',
    threshold: 100,
    description: 'Triple-digit daily streak. Dedication forged in iron.',
    iconName: 'Flame',
    tier: 'diamond',
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-indigo-600/10'
  },
  {
    id: 'eternal_flame',
    title: 'Eternal Flame',
    category: 'streak',
    threshold: 365,
    description: 'A full 365 days of daily reading. A living legend.',
    iconName: 'Crown',
    tier: 'mythic',
    color: '#ef4444',
    gradient: 'from-red-500/25 to-rose-700/15'
  }
]

export interface MilestoneProgress {
  badge: MilestoneBadge
  current: number
  total: number
  percent: number
  remaining: number
}

export interface UserMilestoneSummary {
  unlocked: MilestoneBadge[]
  locked: MilestoneBadge[]
  totalCount: number
  unlockedCount: number
  currentTitle: string
  currentTitleTier: MilestoneTier
  currentTitleColor: string
  nextMilestone: MilestoneProgress | null
  categoryCounts: Record<MilestoneCategory, { unlocked: number; total: number }>
}

export function getUserMilestones(stats: {
  chapters_read: number
  manga_count: number
  streak_days: number
}): UserMilestoneSummary {
  const chapters = Math.max(0, stats.chapters_read || 0)
  const library = Math.max(0, stats.manga_count || 0)
  const streak = Math.max(0, stats.streak_days || 0)

  const getValueForCategory = (cat: MilestoneCategory): number => {
    switch (cat) {
      case 'chapters': return chapters
      case 'library': return library
      case 'streak': return streak
    }
  }

  const unlocked: MilestoneBadge[] = []
  const locked: MilestoneBadge[] = []

  const categoryCounts: Record<MilestoneCategory, { unlocked: number; total: number }> = {
    chapters: { unlocked: 0, total: 0 },
    library: { unlocked: 0, total: 0 },
    streak: { unlocked: 0, total: 0 }
  }

  for (const badge of MILESTONES) {
    categoryCounts[badge.category].total++
    const currentVal = getValueForCategory(badge.category)
    if (currentVal >= badge.threshold) {
      unlocked.push(badge)
      categoryCounts[badge.category].unlocked++
    } else {
      locked.push(badge)
    }
  }

  // Determine primary reader title based on highest chapter milestone, fallback to library/streak or Novice
  const chapterUnlocked = unlocked
    .filter(b => b.category === 'chapters')
    .sort((a, b) => b.threshold - a.threshold)

  let currentTitle = 'Aspiring Reader'
  let currentTitleTier: MilestoneTier = 'bronze'
  let currentTitleColor = '#cd7f32'

  if (chapterUnlocked.length > 0) {
    const highest = chapterUnlocked[0]
    currentTitle = highest.title
    currentTitleTier = highest.tier
    currentTitleColor = highest.color
  } else if (chapters === 0 && library > 0) {
    currentTitle = 'Library Explorer'
    currentTitleTier = 'bronze'
    currentTitleColor = '#cd7f32'
  }

  // Determine closest next milestone across all locked badges
  let nextMilestone: MilestoneProgress | null = null
  if (locked.length > 0) {
    // Sort locked badges by percentage completed descending (closest to 100%)
    const candidates = locked.map(badge => {
      const current = getValueForCategory(badge.category)
      const total = badge.threshold
      const percent = Math.min(99, Math.floor((current / total) * 100))
      const remaining = Math.max(0, total - current)
      return { badge, current, total, percent, remaining }
    }).sort((a, b) => b.percent - a.percent || a.remaining - b.remaining)

    nextMilestone = candidates[0] || null
  }

  return {
    unlocked,
    locked,
    totalCount: MILESTONES.length,
    unlockedCount: unlocked.length,
    currentTitle,
    currentTitleTier,
    currentTitleColor,
    nextMilestone,
    categoryCounts
  }
}

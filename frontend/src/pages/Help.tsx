import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Library, Search, BarChart2, Globe, Download, Settings,
  Play, Download as DL, BookOpen, FileText, Trash2, Pin,
  Bell, BellOff, Pause, RefreshCw, FolderOpen,
  Tv2, Sparkles, CloudUpload, Layout, ChevronRight, ChevronLeft as CL,
  BookMarked, Check, X, Activity, CheckCircle2, XCircle,
  Share2, Key, HardDrive, LogOut, User, UserPlus,
  ExternalLink, Info,
} from 'lucide-react'

interface LegendItem {
  icon: React.ElementType
  label: string
  description: string
  location: string
}

const icons: LegendItem[] = [
  // Navigation
  { icon: Library,    label: 'Library',        description: 'Your manga collection — downloaded chapters and subscribed series', location: 'Sidebar / bottom nav' },
  { icon: Search,     label: 'Search',         description: 'Search for manga across all providers', location: 'Sidebar / bottom nav' },
  { icon: BarChart2,  label: 'Stats',          description: 'Reading statistics — chapters, pages, download streaks', location: 'Sidebar / bottom nav' },
  { icon: Globe,      label: 'Extensions',     description: 'Browse and install manga source extensions', location: 'Sidebar / bottom nav' },
  { icon: Download,   label: 'Get App',        description: 'Download the desktop or mobile app', location: 'Sidebar / bottom nav' },
  { icon: Settings,   label: 'Settings',       description: 'Configure API key, backend URL, tracking accounts', location: 'Sidebar / bottom nav' },

  // Reader
  { icon: CL,         label: 'Back',           description: 'Return to previous page', location: 'Reader header' },
  { icon: Tv2,        label: 'Ambilight',      description: 'Toggle ambient glow effect that colours the background to match the page', location: 'Reader header' },
  { icon: Sparkles,   label: 'Enhance',        description: 'Enable AI upscaling — makes low-res pages sharper (beta)', location: 'Reader header' },
  { icon: CloudUpload,label: 'Save to Cloud',  description: 'Upload a local CBZ file to your Supabase cloud library', location: 'Reader header (local files only)' },
  { icon: FileText,   label: 'Export PDF',     description: 'Convert current chapter to PDF and download it', location: 'Reader header' },
  { icon: BookOpen,   label: 'Export EPUB',    description: 'Convert current chapter to EPUB3 and download it', location: 'Reader header' },
  { icon: Layout,     label: 'Reading mode',   description: 'Cycle between Webtoon (scroll), Manga (left-to-right), and RTL (right-to-left) modes', location: 'Reader header' },
  { icon: DL,         label: 'Download',       description: 'Download the CBZ file for the current chapter', location: 'Reader header' },
  { icon: ChevronRight, label: 'Next page',    description: 'Advance one page (or tap right side of screen)', location: 'Reader footer' },

  // Library / Dashboard
  { icon: Trash2,     label: 'Delete',         description: 'Remove item from local library (IndexedDB)', location: 'Library cards (local items)' },
  { icon: Pin,        label: 'Pin',            description: 'Pin a chapter to prevent it being auto-deleted during storage eviction', location: 'Library cards' },
  { icon: RefreshCw,  label: 'Refresh',        description: 'Reload the library from the backend', location: 'Library header' },

  // Manga detail
  { icon: Play,       label: 'Read Online',    description: 'Stream chapter pages without downloading — requires internet', location: 'Chapter list' },
  { icon: DL,         label: 'Download',       description: 'Queue chapter for download to local/cloud library', location: 'Chapter list' },
  { icon: Bell,       label: 'Subscribe / Notify', description: 'Subscribe to manga for auto-download of new chapters and notifications', location: 'Manga detail header' },
  { icon: BellOff,    label: 'Unsubscribe',    description: 'Stop auto-downloading new chapters for this manga', location: 'Manga detail header' },
  { icon: ExternalLink, label: 'Open source', description: 'Open manga page on the original provider website', location: 'Manga detail header' },

  // Search
  { icon: BookMarked, label: 'Add to Library', description: 'Subscribe to manga and add it to your library', location: 'Search results' },
  { icon: Check,      label: 'In Library',     description: 'Manga is already subscribed / in your library', location: 'Search results' },

  // Downloads
  { icon: Activity,   label: 'Active Tasks',   description: 'Currently downloading or queued chapters', location: 'Queue page' },
  { icon: Pause,      label: 'Pause queue',    description: 'Pause all downloads — in-progress chapter finishes first', location: 'Queue page' },
  { icon: Play,       label: 'Resume queue',   description: 'Resume paused download queue', location: 'Queue page' },
  { icon: Trash2,     label: 'Clear all',      description: 'Cancel all queued downloads and clear history', location: 'Queue page header' },
  { icon: X,          label: 'Cancel',         description: 'Cancel a single download', location: 'Active download card' },
  { icon: CheckCircle2, label: 'Completed',    description: 'Chapter downloaded successfully', location: 'History list' },
  { icon: XCircle,    label: 'Failed',         description: 'Download failed — hover for error details', location: 'History list' },
  { icon: FolderOpen, label: 'Reveal in Finder', description: 'Open the file location in system file manager (desktop app only)', location: 'History list' },

  // Settings
  { icon: Share2,     label: 'Tracking',       description: 'AniList and MAL integration for syncing reading progress', location: 'Settings' },
  { icon: Key,        label: 'API Key',        description: 'Authentication key for the manga-dl backend', location: 'Settings' },
  { icon: Bell,       label: 'Notifications',  description: 'Browser push notifications when new chapters are queued', location: 'Settings' },
  { icon: HardDrive,  label: 'Prune Data',     description: 'Clear temporary download cache', location: 'Settings' },
  { icon: User,       label: 'Sign In',        description: 'Log in to your manga-dl account for cloud sync and 3-device access', location: 'Settings → Account' },
  { icon: UserPlus,   label: 'Create Account', description: 'Register a new account', location: 'Settings → Account' },
  { icon: LogOut,     label: 'Sign Out',       description: 'Sign out of your account on this device', location: 'Settings → Account' },
]

const grouped: Record<string, LegendItem[]> = {}
for (const item of icons) {
  const section = item.location.split(' ')[0]
  if (!grouped[section]) grouped[section] = []
  grouped[section].push(item)
}

export default function HelpPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto min-h-full pb-32">
      <header className="mb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 text-sm font-bold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          Icon Legend
        </h1>
        <p className="text-white/40 font-medium md:text-lg">What every button and icon does</p>
      </header>

      <div className="space-y-10">
        {Object.entries(grouped).map(([section, items], si) => (
          <motion.section
            key={section}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.04 }}
          >
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-4 pl-1">{section}</h2>
            <div className="glass-panel overflow-hidden border-white/5">
              {items.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-start gap-4 p-4 md:p-5 ${i < items.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                >
                  <div className="w-9 h-9 shrink-0 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <item.icon className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                      <span className="font-bold text-sm text-white/90">{item.label}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                        {item.location}
                      </span>
                    </div>
                    <p className="text-sm text-white/40 font-medium leading-snug">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 text-xs text-white/20 font-bold justify-center pt-4"
        >
          <Info className="w-3 h-3" />
          Hover over any button to see its tooltip on desktop
        </motion.div>
      </div>
    </div>
  )
}

import { useState } from 'react'
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
  ExternalLink, Info, ChevronDown,
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

const groupedIcons: Record<string, LegendItem[]> = {}
for (const item of icons) {
  const section = item.location.split(' ')[0]
  if (!groupedIcons[section]) groupedIcons[section] = []
  groupedIcons[section].push(item)
}

const NAV_CARDS = [
  { icon: Library, label: 'Library', desc: 'Saved manga & reading lists', color: 'var(--accent)' },
  { icon: DL, label: 'Downloads', desc: 'Offline chapters ready to read', color: 'var(--accent)' },
  { icon: RefreshCw, label: 'Updates', desc: 'New chapters for your library', color: 'var(--accent)' },
  { icon: Globe, label: 'Sources', desc: 'Manage your content providers', color: 'var(--accent)' },
]

const FAQS = [
  { q: 'How do I add manga to my library?', a: 'Search for a manga, open its detail page, and tap the subscribe (bell) icon. It will be added to your library and new chapters will be auto-downloaded.' },
  { q: 'What file formats can I read?', a: 'manga-dl supports CBZ, ZIP, and EPUB archives. Drag-and-drop a file onto the library or use the Upload button in the header.' },
  { q: 'How does cloud sync work?', a: 'Sign in with your account. Your reading progress, bookmarks, and library sync automatically across all 3 of your registered devices via Supabase.' },
  { q: 'Can I read offline?', a: 'Yes. Download chapters first (tap the download icon on any chapter). Downloaded chapters are stored locally and accessible without internet.' },
  { q: 'How do I link AniList or MAL?', a: 'Go to Settings → Trackers, enter your API credentials or OAuth token. Your reading progress will sync automatically when you finish a chapter.' },
]

export default function HelpPage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-6 pt-6 pb-4" style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button onClick={() => navigate(-1)} className="icon-btn"><ChevronLeft style={{ width: 16, height: 16 }} /></button>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,6vw,3rem)', fontWeight: 900, color: 'var(--fg)', lineHeight: 1.1, marginBottom: 6 }}>Help Center</h1>
        <p style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 20 }}>How can we assist you with your manga experience today?</p>
        <input
          type="search"
          placeholder="Search FAQs, features, or issues..."
          style={{ width: '100%', padding: '11px 14px 11px 40px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, color: 'var(--fg)', outline: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: '14px center', marginBottom: 0 }}
        />
      </div>

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1" style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>

        {/* Featured Guide Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/guide/import')}
          className="mb-6 p-4 md:p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-base font-bold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                    MangaKatana & OmegaScans Import Guide
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)] text-white">
                    Guide
                  </span>
                </div>
                <p className="text-xs text-[var(--muted2)] mt-0.5">
                  Learn how to download archives (.zip / .cbz) in batches of 10 and read them offline on Web, Mobile & Desktop.
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--fg)] shrink-0 group-hover:bg-[var(--accent)] group-hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* Icon Glossary — navigation focused */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info style={{ width: 16, height: 16, color: 'var(--accent)' }} />
            Icon Glossary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {NAV_CARDS.map(({ icon: Icon, label, desc }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ accordion */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>Frequently Asked Questions</div>
          <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>{faq.q}</span>
                  <ChevronDown style={{ width: 16, height: 16, color: 'var(--muted3)', flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--muted1)', lineHeight: 1.6 }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Icon legend sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>Icon Reference</div>
          {Object.entries(groupedIcons).map(([section, items], si) => (
            <motion.section key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.04 }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>{section}</div>
              <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
                {items.map((item, i) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon style={{ width: 15, height: 15, color: 'var(--muted1)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>{item.label}</span>
                        <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted3)', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 5 }}>{item.location}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* GitHub CTA */}
        <div style={{ marginTop: 32, padding: '20px 22px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Still need help?</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Open an issue on GitHub or browse existing discussions.</div>
          </div>
          <a
            href="https://github.com/zenmisan/manga-dl/issues"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-hover)', fontSize: 12, fontWeight: 700, color: 'var(--fg)', textDecoration: 'none', flexShrink: 0 }}
          >
            <ExternalLink style={{ width: 14, height: 14 }} />
            GitHub
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: 'var(--muted3)', paddingTop: 16 }}>
          <Info style={{ width: 12, height: 12 }} />
          Hover over any button to see its tooltip on desktop
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  BookOpen,
  Download,
  FolderArchive,
  Smartphone,
  Monitor,
  Sparkles,
  FileCode2,
  HardDrive,
  ArrowRight,
} from 'lucide-react'

export default function ImportGuide() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true)

  const steps = [
    {
      number: '01',
      title: 'Search What You Want to Read',
      desc: 'Head over to MangaKatana and search for your favorite manga or webtoon series.',
      actionLink: {
        text: 'Open MangaKatana',
        url: 'https://mangakatana.com',
      },
    },
    {
      number: '02',
      title: 'Open the Series Title Page',
      desc: 'Select the manga from the search results to navigate to its main chapter list and metadata overview.',
    },
    {
      number: '03',
      title: 'Click "Offline Reading"',
      desc: 'On the manga page, click the "Offline Reading" button. MangaKatana presents chapters in convenient batches of 10 (e.g. Chapters 1–10, 11–20, 21–30). Pick the exact chapter range you want to download.',
      badge: 'Batches of 10',
    },
    {
      number: '04',
      title: 'Complete Robot Verification',
      desc: 'Complete the quick "I am not a robot" / Cloudflare verification prompt to generate your secure download session.',
    },
    {
      number: '05',
      title: 'Copy & Paste Download Link',
      desc: 'Copy the generated download link, paste it in your browser address bar or download manager, and press Enter.',
    },
    {
      number: '06',
      title: 'Download the Archive (.ZIP or .CBZ)',
      desc: 'Wait for the archive to finish downloading to your local device storage.',
    },
    {
      number: '07',
      title: 'Upload to manga-dl Library',
      desc: 'Open manga-dl on Web, Desktop, or Mobile. Go to your Library and drag-and-drop the file or tap the "Import File" button.',
      badge: 'Instant Parsing',
    },
    {
      number: '08',
      title: 'Voila! Read & Auto-Resume Anywhere',
      desc: 'manga-dl immediately unpacks and indexes all pages. You can pause reading at any time and return later — it will automatically remember your exact chapter and page position!',
    },
  ]

  return (
    <div className="min-h-full flex flex-col pb-24 bg-[var(--bg)] text-[var(--fg)] transition-colors">
      {/* Top Header */}
      <div className="px-4 md:px-6 pt-6 pb-4 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--fg)] transition-colors"
            title="Go Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
            Offline Archive Guide
          </span>
        </div>

        <h1 className="text-2xl md:text-4xl font-black text-[var(--fg)] tracking-tight leading-tight mb-2">
          How to Import & Read Offline Manga
        </h1>
        <p className="text-xs md:text-sm text-[var(--muted2)] leading-relaxed">
          Learn how to download manga archives (.zip / .cbz) from sources like MangaKatana and OmegaScans and read them seamlessly across Web, Desktop, and Mobile.
        </p>
      </div>

      <div className="px-4 md:px-6 max-w-3xl w-full mx-auto space-y-6">
        {/* Origin & Story Card */}
        <div className="p-5 md:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] relative overflow-hidden backdrop-blur-xl">
          <div
            className="absolute -right-12 -top-12 w-48 h-48 rounded-full pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
          />

          <div className="flex items-center gap-2 mb-3 text-[var(--accent)]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Why We Built This</span>
          </div>

          <p className="text-xs md:text-sm text-[var(--muted1)] leading-relaxed mb-4">
            Originally, readers who downloaded manga from <strong>MangaKatana</strong> had to use desktop-only scripts to convert chapters into HTML files for browser reading. While that worked well on desktop computers, mobile and tablet readers had no comfortable way to read their offline collections.
          </p>

          <p className="text-xs md:text-sm text-[var(--muted1)] leading-relaxed">
            <strong>manga-dl</strong> was created to bridge this gap: a high-performance, cross-platform reader that works seamlessly on <strong>Web PWA, Android APK, Linux Desktop (Wayland/X11), and iOS</strong>. You get continuous webtoon scrolling, left-to-right manga mode, automatic progress bookmarks, and full offline autonomy.
          </p>
        </div>

        {/* Quick Format Compatibility */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
            <FolderArchive className="w-5 h-5 mx-auto mb-1.5 text-[var(--accent)]" />
            <div className="font-bold text-xs text-[var(--fg)]">.ZIP Archives</div>
            <div className="text-[10px] text-[var(--muted3)] mt-0.5">Image sequence folders</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-1.5 text-[var(--accent)]" />
            <div className="font-bold text-xs text-[var(--fg)]">.CBZ Comics</div>
            <div className="text-[10px] text-[var(--muted3)] mt-0.5">Comic book standard</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
            <Monitor className="w-5 h-5 mx-auto mb-1.5 text-[var(--accent)]" />
            <div className="font-bold text-xs text-[var(--fg)]">Desktop Native</div>
            <div className="text-[10px] text-[var(--muted3)] mt-0.5">Linux & Wayland</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
            <Smartphone className="w-5 h-5 mx-auto mb-1.5 text-[var(--accent)]" />
            <div className="font-bold text-xs text-[var(--fg)]">Mobile & PWA</div>
            <div className="text-[10px] text-[var(--muted3)] mt-0.5">Android APK & iOS</div>
          </div>
        </div>

        {/* MangaKatana Step-by-Step Accordion Section */}
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full p-4 md:p-5 flex items-center justify-between gap-4 text-left hover:bg-[var(--surface-hover)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm md:text-base font-bold text-[var(--fg)] flex items-center gap-2">
                  MangaKatana Download & Import Walkthrough
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--accent)] text-white">
                    Step-by-step
                  </span>
                </div>
                <div className="text-xs text-[var(--muted2)] mt-0.5">
                  Click to {isOpen ? 'collapse' : 'reveal'} the detailed guide (experienced readers can collapse this)
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-[var(--muted2)] transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="border-t border-[var(--border)] px-4 md:px-6 py-5 space-y-4"
              >
                {steps.map((step) => (
                  <div key={step.number} className="flex items-start gap-3.5 relative">
                    <div className="w-7 h-7 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center font-black text-xs text-[var(--accent)] shrink-0 mt-0.5">
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0 pb-3 border-b border-[var(--border)] last:border-none last:pb-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-xs md:text-sm font-bold text-[var(--fg)]">{step.title}</span>
                        {step.badge && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                            {step.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted2)] leading-relaxed">{step.desc}</p>
                      {step.actionLink && (
                        <div className="mt-2.5">
                          <a
                            href={step.actionLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-xs font-bold shadow-[0_0_12px_var(--accent-glow)] hover:opacity-90 transition-opacity"
                          >
                            <span>{step.actionLink.text}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Persistence & Device Notes Card */}
        <div className="p-4 md:p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]">
            <HardDrive className="w-4 h-4 text-[var(--accent)]" />
            <span>Important: Storage & File Persistence</span>
          </div>
          <p className="text-xs text-[var(--muted2)] leading-relaxed">
            As long as you do not move or delete the downloaded file from its original storage location, it remains indexed in your <strong>manga-dl library</strong> ready for reading. Reading performance and caching are optimized across Web, Linux Desktop, and Android APK.
          </p>
        </div>

        {/* OmegaScans & Downloader Context */}
        <div className="p-4 md:p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]">
            <FileCode2 className="w-4 h-4 text-[var(--accent)]" />
            <span>OmegaScans Downloader & Custom Scripts</span>
          </div>
          <p className="text-xs text-[var(--muted2)] leading-relaxed">
            OmegaScans downloads also work seamlessly in <strong>manga-dl</strong>. You can check out the standalone downloader scripts on GitHub. In the future, a dedicated graphical downloader UI with automated background job storage will also be added!
          </p>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={() => navigate('/r')}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--accent)] text-white text-xs font-bold shadow-[0_0_15px_var(--accent-glow)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span>Go to My Library</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="https://mangakatana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--fg)] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span>Visit MangaKatana</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--muted2)]" />
          </a>
        </div>
      </div>
    </div>
  )
}

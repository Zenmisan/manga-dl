import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Globe, Wifi, Star, Layers, Zap,
  ArrowRight, Monitor, Smartphone,
  Shield, Send,
} from 'lucide-react'
import api from '../lib/api'

/*
 * Hallmark · genre: atmospheric · macrostructure: Split Studio (15)
 * theme: Midnight · nav: N5 Floating Pill · footer: Ft5 Statement
 * enrichment: none (typography only — real source/tracker names as proof)
 * P5 H4 E4 S5 R5 V5
 */

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
const GRID = `repeating-linear-gradient(90deg,rgba(255,255,255,.02) 0px,transparent 1px,transparent 140px),repeating-linear-gradient(rgba(255,255,255,.02) 0px,transparent 1px,transparent 140px)`

const MIDNIGHT_TOKENS = `
  :root {
    --color-paper:         oklch(9%  0.008 245);
    --color-paper-2:       oklch(13% 0.009 245);
    --color-paper-3:       oklch(18% 0.010 245);
    --color-ink:           oklch(94% 0.006 220);
    --color-ink-2:         oklch(65% 0.010 235);
    --color-ink-3:         oklch(38% 0.010 240);
    --color-accent:        oklch(50% 0.230  27);
    --color-accent-glow:   oklch(50% 0.230  27 / 0.20);
    --color-accent-subtle: oklch(18% 0.100  27);
    --color-rule:          oklch(20% 0.009 240);
    --color-focus:         oklch(50% 0.230  27);

    --font-display: 'Anton', sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;

    --space-3xs: 0.25rem;   --space-2xs: 0.5rem;    --space-xs: 0.75rem;
    --space-sm:  1rem;      --space-md:  1.5rem;    --space-lg: 2.5rem;
    --space-xl:  4rem;      --space-2xl: 6rem;      --space-3xl: 9rem;

    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --dur-short: 220ms;

    --radius-pill:  999px;
    --radius-card:  1rem;
    --radius-input: 0.75rem;
  }
`

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const FEATURES = [
  { icon: Wifi,    title: 'Read Offline',        desc: 'Download entire series as CBZ or EPUB. Read anywhere, no connection required.' },
  { icon: Globe,   title: '50+ Sources',          desc: 'MangaDex, MangaKatana, Komga, Suwayomi, and many more — all in one interface.' },
  { icon: Layers,  title: 'Cross-Device Sync',    desc: 'Progress, categories, and notes sync across all devices via encrypted cloud storage.' },
  { icon: Star,    title: 'Tracker Integration',  desc: 'AniList, MAL, Kitsu, MangaUpdates, Shikimori, Bangumi. Mark as read, automatically.' },
  { icon: Zap,     title: '3 Platforms',          desc: 'Web PWA, native desktop via Tauri, and a native Android APK. One library everywhere.' },
  { icon: Shield,  title: 'No Ads. No DRM.',      desc: 'Open source, zero paywalls. Your data stays yours, forever.' },
]

const STEPS = [
  { n: '01', title: 'Search', desc: 'One query hits 50+ sources simultaneously.' },
  { n: '02', title: 'Read or Download', desc: 'Stream instantly online or save offline as CBZ.' },
  { n: '03', title: 'Track Automatically', desc: 'Progress syncs to AniList and MAL without extra steps.' },
]

const PLATFORMS = [
  {
    icon: Globe,
    name: 'Web',
    badge: 'PWA · Installable',
    desc: 'Works in any browser. Install it as a PWA for offline reads and a native-like experience.',
    cta: 'Open in Browser',
    href: '/r',
    internal: true,
  },
  {
    icon: Monitor,
    name: 'Desktop',
    badge: 'macOS · Windows · Linux',
    desc: 'Native Tauri app with background sync, system tray, and push notifications.',
    cta: 'Download Desktop App',
    href: '/download',
    internal: true,
  },
  {
    icon: Smartphone,
    name: 'Android',
    badge: 'Native APK',
    desc: 'Biometric lock, background chapter syncing, and native reading controls.',
    cta: 'Download APK',
    href: 'https://gyivwfweldwvzccbpgoz.supabase.co/storage/v1/object/public/manga-library/releases/MangaOS.apk',
    internal: false,
  },
]

const TAGLINES = [
  'A product of ZΞNMƗ',
  "ZΞNMƗ's hobby project that grew out of hand",
  'Hobby project taken too seriously',
]

const CATEGORIES = ['general', 'bug', 'feature', 'question']

const SOURCE_NAMES = [
  'MangaDex', 'Komga', 'MangaKatana', 'Suwayomi',
  'Webtoons', 'Bato.to', 'MangaPlus', 'MangaHere',
  'TCBScans', 'MangaPill', 'AsuraScans', 'MangaFire',
]

const TRACKER_NAMES = ['AniList', 'MyAnimeList', 'Kitsu', 'MangaUpdates', 'Shikimori', 'Bangumi']

export default function LandingPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [taglineIdx, setTaglineIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTaglineIdx(i => (i + 1) % TAGLINES.length), 4000)
    return () => clearInterval(id)
  }, [])

  const [ctName, setCtName] = useState('')
  const [ctEmail, setCtEmail] = useState('')
  const [ctCategory, setCtCategory] = useState('general')
  const [ctMessage, setCtMessage] = useState('')
  const [ctSending, setCtSending] = useState(false)
  const [ctDone, setCtDone] = useState(false)
  const [ctError, setCtError] = useState('')

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ctMessage.trim()) return
    setCtSending(true)
    setCtError('')
    try {
      await api.post('/support/ticket', {
        name: ctName.trim() || null,
        email: ctEmail.trim() || null,
        category: ctCategory,
        message: ctMessage.trim(),
      })
      setCtDone(true)
      setCtName(''); setCtEmail(''); setCtCategory('general'); setCtMessage('')
    } catch {
      setCtError('Failed to send. Try emailing zenmisan@gmail.com directly.')
    } finally {
      setCtSending(false)
    }
  }

  const handleCTA = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(email ? `/register?email=${encodeURIComponent(email)}` : '/register')
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: 'var(--color-paper)', color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}
    >
      <style>{MIDNIGHT_TOKENS}</style>

      {/* ── N5 FLOATING PILL NAV ─────────────────────────────── */}
      <nav
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-4 py-2.5"
        style={{
          width: 'min(92%, 640px)',
          borderRadius: 'var(--radius-pill)',
          background: 'oklch(9% 0.008 245 / 0.82)',
          border: '1px solid var(--color-rule)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 24px oklch(0% 0 0 / 0.4)',
        }}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="manga-dl home">
          <img src="/Manga-dl1.png" alt="" className="w-7 h-7 object-contain" />
          <span className="font-black text-sm tracking-tight hidden sm:block" style={{ color: 'var(--color-ink)' }}>
            manga-dl
          </span>
        </Link>
        <div className="flex items-center gap-1 flex-1 justify-center">
          <Link
            to="/r"
            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
            style={{ color: 'var(--color-ink-2)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-2)')}
          >
            Library
          </Link>
          <Link
            to="/help"
            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
            style={{ color: 'var(--color-ink-2)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-2)')}
          >
            Help
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/login"
            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
            style={{ color: 'var(--color-ink-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-3)')}
          >
            Sign In
          </Link>
          <Link
            to="/r"
            className="px-4 py-1.5 text-xs font-black rounded-xl transition-all hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-ink)',
              boxShadow: '0 2px 12px var(--color-accent-glow)',
            }}
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* ── HERO — left text / right stat column ─────────────── */}
      <section className="relative min-h-[100dvh] flex items-center" style={{ paddingTop: '5rem' }}>
        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 55% at 30% -5%, var(--color-accent-glow) 0%, transparent 65%)' }}
          />
          <div className="absolute inset-0" style={{ backgroundImage: GRID }} />
          <div className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat', opacity: 0.03 }} />
          <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: 'linear-gradient(to bottom, transparent, var(--color-paper))' }} />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 py-20">
          <div className="grid md:grid-cols-[3fr_2fr] gap-12 md:gap-16 items-center">

            {/* Left — declaration */}
            <div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[.2em] mb-8"
                style={{
                  border: '1px solid var(--color-rule)',
                  background: 'var(--color-paper-2)',
                  color: 'var(--color-ink-3)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--color-accent)' }}
                />
                Web · Desktop · Android
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="leading-none uppercase tracking-wide font-normal"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(3.5rem, 13vw, 10rem)',
                  overflow: 'hidden',
                  overflowWrap: 'anywhere',
                  minWidth: 0,
                }}
              >
                Read<br />
                <span style={{ color: 'var(--color-accent)' }}>Everything.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="mt-6 text-base leading-relaxed max-w-md"
                style={{ color: 'var(--color-ink-2)' }}
              >
                50+ sources. Offline reading. AniList sync.{' '}
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Free, forever.</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link
                  to="/r"
                  className="group inline-flex items-center gap-2 px-7 py-3.5 font-black text-sm rounded-2xl transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-ink)',
                    boxShadow: '0 8px 28px var(--color-accent-glow)',
                  }}
                >
                  Start Reading
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-sm rounded-2xl transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  style={{
                    border: '1px solid var(--color-rule)',
                    background: 'var(--color-paper-2)',
                    color: 'var(--color-ink-2)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-2)')}
                >
                  Sign In
                </Link>
              </motion.div>
            </div>

            {/* Right — stat column */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              className="hidden md:block"
              aria-label="Key statistics"
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)' }}
              >
                {[
                  { val: '50+', label: 'Sources' },
                  { val: '3',   label: 'Platforms' },
                  { val: '6+',  label: 'Trackers' },
                  { val: '$0',  label: 'Always' },
                ].map(({ val, label }, i) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-6 py-4"
                    style={{
                      borderBottom: i < 3 ? '1px solid var(--color-rule)' : undefined,
                    }}
                  >
                    <span
                      className="font-normal text-4xl leading-none"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
                    >
                      {val}
                    </span>
                    <span
                      className="text-[10px] font-black uppercase tracking-[.2em]"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── FEATURES — Split Studio alternating ──────────────── */}
      <section className="px-6 md:px-12 py-24" aria-label="Features">
        <div className="max-w-6xl mx-auto">

          {/* Section eyebrow — left-aligned, NOT centered */}
          <FadeIn className="mb-16">
            <p
              className="text-[10px] font-black uppercase tracking-[.25em] mb-3"
              style={{ color: 'var(--color-accent)' }}
            >
              What it does
            </p>
            <h2
              className="text-4xl md:text-6xl font-normal uppercase leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Built different.
            </h2>
          </FadeIn>

          {/* Split row 1 — Offline Reading: text left, format proof right */}
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center py-12" style={{ borderTop: '1px solid var(--color-rule)' }}>
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-glow)' }}>
                  <Wifi className="w-5 h-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black mb-3" style={{ color: 'var(--color-ink)' }}>Read Offline</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
                  Download entire series as CBZ or EPUB. Read anywhere, no connection required.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-3)' }}>Supported formats</p>
                {[
                  { fmt: 'CBZ', note: 'Comic Book Archive — universal reader support' },
                  { fmt: 'EPUB', note: 'Reflowable — works in Kindle, Apple Books' },
                  { fmt: 'PDF', note: 'Fixed layout — print-ready' },
                ].map(({ fmt, note }) => (
                  <div
                    key={fmt}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl"
                    style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)' }}
                  >
                    <span className="text-sm font-black w-12 shrink-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>{fmt}</span>
                    <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Split row 2 — 50+ Sources: proof left, text right */}
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center py-12" style={{ borderTop: '1px solid var(--color-rule)' }}>
              <div className="order-2 md:order-1 flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-3)' }}>Available sources</p>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_NAMES.map(name => (
                    <span
                      key={name}
                      className="px-3 py-1 text-xs font-bold rounded-full"
                      style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', color: 'var(--color-ink-2)' }}
                    >
                      {name}
                    </span>
                  ))}
                  <span
                    className="px-3 py-1 text-xs font-bold rounded-full"
                    style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-glow)', color: 'var(--color-accent)' }}
                  >
                    + 38 more
                  </span>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-glow)' }}>
                  <Globe className="w-5 h-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black mb-3" style={{ color: 'var(--color-ink)' }}>50+ Sources</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
                  MangaDex, MangaKatana, Komga, Suwayomi, and many more — all in one interface. One search, every source.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Split row 3 — Tracker Sync: text left, tracker pill list right */}
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center py-12" style={{ borderTop: '1px solid var(--color-rule)' }}>
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-glow)' }}>
                  <Star className="w-5 h-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black mb-3" style={{ color: 'var(--color-ink)' }}>Tracker Integration</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
                  Mark as read, automatically. All six major trackers. No manual updates, ever.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-3)' }}>Supported trackers</p>
                <div className="grid grid-cols-2 gap-2">
                  {TRACKER_NAMES.map(name => (
                    <div
                      key={name}
                      className="px-4 py-2.5 rounded-lg text-sm font-bold"
                      style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', color: 'var(--color-ink-2)' }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Compact strip for remaining 3 features */}
          <FadeIn>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-10 mt-4"
              style={{ borderTop: '1px solid var(--color-rule)' }}
            >
              {FEATURES.slice(2, 3).concat(FEATURES.slice(4)).map(f => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 px-5 py-4 rounded-xl"
                  style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)' }}
                >
                  <f.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  <div>
                    <div className="text-sm font-black mb-0.5" style={{ color: 'var(--color-ink)' }}>{f.title}</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS — vertical step sequence ─────────────── */}
      <section className="px-6 md:px-12 py-24" style={{ borderTop: '1px solid var(--color-rule)' }} aria-label="How it works">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="mb-16">
            <p className="text-[10px] font-black uppercase tracking-[.25em] mb-3" style={{ color: 'var(--color-accent)' }}>
              Getting started
            </p>
            <h2
              className="text-4xl md:text-6xl font-normal uppercase leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Zero to reading<br />in one minute.
            </h2>
          </FadeIn>

          <ol className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <li className="grid md:grid-cols-[5rem_1fr] gap-6 md:gap-12 items-start py-10" style={{ borderTop: '1px solid var(--color-rule)' }}>
                  <span
                    className="text-6xl leading-none font-normal"
                    aria-hidden="true"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)' }}
                  >
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-2xl font-black mb-3" style={{ color: 'var(--color-ink)' }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>{s.desc}</p>
                  </div>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      {/* ── PLATFORMS ─────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24" aria-label="Available platforms">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="mb-12">
            <p className="text-[10px] font-black uppercase tracking-[.25em] mb-3" style={{ color: 'var(--color-accent)' }}>
              Every device
            </p>
            <h2
              className="text-4xl md:text-6xl font-normal uppercase leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              One library,<br />everywhere.
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLATFORMS.map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.07}>
                <div
                  className="group flex flex-col gap-4 p-6 rounded-2xl transition-all h-full"
                  style={{
                    background: 'var(--color-paper-2)',
                    border: '1px solid var(--color-rule)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--color-paper-3)', border: '1px solid var(--color-rule)' }}
                    >
                      <p.icon className="w-5 h-5" style={{ color: 'var(--color-ink-2)' }} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-black text-base leading-tight" style={{ color: 'var(--color-ink)' }}>{p.name}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-accent)' }}>{p.badge}</div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--color-ink-2)' }}>{p.desc}</p>
                  {p.internal ? (
                    <Link
                      to={p.href}
                      className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                      style={{ color: 'var(--color-accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {p.cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                      style={{ color: 'var(--color-accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {p.cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — left-aligned statement form ─────────────────── */}
      <FadeIn>
        <section className="px-6 md:px-12 py-24" style={{ borderTop: '1px solid var(--color-rule)' }} aria-label="Sign up">
          <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_auto] gap-12 items-center">
            <div>
              <h2
                className="font-normal uppercase leading-none mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 6vw, 5rem)',
                  overflowWrap: 'anywhere',
                }}
              >
                Start your library<br />
                <span style={{ color: 'var(--color-accent)' }}>in 30 seconds.</span>
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>No credit card. No ads. Just manga.</p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-72">
              <form onSubmit={handleCTA} className="flex flex-col gap-2.5">
                <label htmlFor="cta-email" className="sr-only">Email address</label>
                <input
                  id="cta-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                  style={{
                    background: 'var(--color-paper-2)',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--color-ink)',
                  }}
                />
                <button
                  type="submit"
                  className="w-full px-6 py-3 font-black text-sm transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-ink)',
                    borderRadius: 'var(--radius-input)',
                    boxShadow: '0 4px 16px var(--color-accent-glow)',
                  }}
                >
                  Get Started
                </button>
              </form>
              <p className="text-[11px] text-center" style={{ color: 'var(--color-ink-3)' }}>
                Or{' '}
                <Link
                  to="/r"
                  className="underline underline-offset-2 transition-colors"
                  style={{ color: 'var(--color-ink-2)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-2)')}
                >
                  jump straight into the app
                </Link>
              </p>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ── CONTACT — split: description left, form right ─────── */}
      <FadeIn>
        <section className="px-6 md:px-12 py-24" style={{ borderTop: '1px solid var(--color-rule)' }} aria-label="Contact and support">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] mb-4" style={{ color: 'var(--color-accent)' }}>Get in touch</p>
              <h2
                className="text-3xl md:text-5xl font-normal uppercase leading-none mb-5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Bug? Feature?<br />Just hi?
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
                Drop a message — it lands straight in the dashboard.
                Or open an issue on{' '}
                <a
                  href="https://github.com/zenmisan/manga-dl"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 transition-colors"
                  style={{ color: 'var(--color-ink-2)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-2)')}
                >
                  GitHub
                </a>
                .
              </p>
            </div>

            {ctDone ? (
              <div className="flex flex-col items-start gap-4 py-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'oklch(35% 0.15 145 / 0.15)', border: '1px solid oklch(55% 0.15 145 / 0.25)' }}
                >
                  <svg className="w-7 h-7" style={{ color: 'oklch(70% 0.15 145)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-black text-lg" style={{ color: 'var(--color-ink)' }}>Message sent!</p>
                <p className="text-sm" style={{ color: 'var(--color-ink-2)' }}>We'll get back to you if you left an email.</p>
                <button
                  onClick={() => setCtDone(false)}
                  className="text-sm underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                  style={{ color: 'var(--color-ink-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink-2)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-3)')}
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ct-name" className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-ink-3)' }}>
                      Name (optional)
                    </label>
                    <input
                      id="ct-name"
                      type="text"
                      value={ctName}
                      onChange={e => setCtName(e.target.value)}
                      placeholder="Your name"
                      className="px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors"
                      style={{
                        background: 'var(--color-paper-2)',
                        border: '1px solid var(--color-rule)',
                        borderRadius: 'var(--radius-input)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ct-email" className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-ink-3)' }}>
                      Email (optional)
                    </label>
                    <input
                      id="ct-email"
                      type="email"
                      value={ctEmail}
                      onChange={e => setCtEmail(e.target.value)}
                      placeholder="for a reply"
                      className="px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors"
                      style={{
                        background: 'var(--color-paper-2)',
                        border: '1px solid var(--color-rule)',
                        borderRadius: 'var(--radius-input)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ct-category" className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-ink-3)' }}>
                    Category
                  </label>
                  <select
                    id="ct-category"
                    value={ctCategory}
                    onChange={e => setCtCategory(e.target.value)}
                    className="px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors appearance-none cursor-pointer"
                    style={{
                      background: 'var(--color-paper-2)',
                      border: '1px solid var(--color-rule)',
                      borderRadius: 'var(--radius-input)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} style={{ background: 'oklch(13% 0.009 245)' }}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ct-message" className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-ink-3)' }}>
                    Message <span style={{ color: 'var(--color-accent)' }} aria-label="required">*</span>
                  </label>
                  <textarea
                    id="ct-message"
                    value={ctMessage}
                    onChange={e => setCtMessage(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={5}
                    required
                    aria-required="true"
                    className="px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors resize-none"
                    style={{
                      background: 'var(--color-paper-2)',
                      border: '1px solid var(--color-rule)',
                      borderRadius: 'var(--radius-input)',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>

                {ctError && (
                  <p className="text-xs font-bold" role="alert" style={{ color: 'var(--color-accent)' }}>{ctError}</p>
                )}

                <button
                  type="submit"
                  disabled={ctSending || !ctMessage.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 font-black text-sm transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-ink)',
                    borderRadius: 'var(--radius-input)',
                    boxShadow: '0 4px 16px var(--color-accent-glow)',
                  }}
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  {ctSending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </section>
      </FadeIn>

      {/* ── Ft5 STATEMENT FOOTER ──────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--color-rule)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 pt-20 pb-10">
          {/* Statement */}
          <p
            className="font-normal uppercase leading-none mb-12"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 8vw, 7rem)',
              color: 'var(--color-ink)',
              overflowWrap: 'anywhere',
            }}
          >
            Read more.<br />
            <span style={{ color: 'var(--color-ink-3)' }}>Spend less.</span>
          </p>

          {/* Lower bar */}
          <div
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-8"
            style={{ borderTop: '1px solid var(--color-rule)' }}
          >
            <Link to="/" className="flex items-center gap-2" aria-label="manga-dl home">
              <img src="/Manga-dl1.png" alt="" className="w-6 h-6 object-contain" />
              <span className="font-black text-sm tracking-tight" style={{ color: 'var(--color-ink)' }}>manga-dl</span>
            </Link>

            <nav className="flex flex-wrap items-center gap-4" aria-label="Footer navigation">
              {[
                { label: 'Library', to: '/r', internal: true },
                { label: 'Sign In', to: '/login', internal: true },
                { label: 'Help', to: '/help', internal: true },
                { label: 'Contact', href: 'mailto:zenmisan@gmail.com' },
                { label: 'GitHub', href: 'https://github.com/zenmisan/manga-dl' },
              ].map(link => (
                'to' in link ? (
                  <Link
                    key={link.label}
                    to={link.to!}
                    className="text-sm font-bold transition-colors"
                    style={{ color: 'var(--color-ink-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-3)')}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href?.startsWith('http') ? '_blank' : undefined}
                    rel={link.href?.startsWith('http') ? 'noreferrer' : undefined}
                    className="text-sm font-bold transition-colors"
                    style={{ color: 'var(--color-ink-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-3)')}
                  >
                    {link.label}
                  </a>
                )
              ))}
            </nav>

            <div className="flex flex-col items-start md:items-end gap-1">
              <motion.p
                key={taglineIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-[11px] font-bold"
                style={{ color: 'var(--color-ink-3)' }}
                aria-live="polite"
                aria-atomic="true"
              >
                {TAGLINES[taglineIdx]}
              </motion.p>
              <p className="text-[10px]" style={{ color: 'oklch(25% 0.009 240)' }}>© {new Date().getFullYear()} manga-dl</p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}

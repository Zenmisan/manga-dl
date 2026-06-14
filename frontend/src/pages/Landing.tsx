import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Globe, Wifi, Star, Layers, Zap,
  ChevronDown, ArrowRight, Monitor, Smartphone,
  Shield,
} from 'lucide-react'

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

const GRID = `repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0px,transparent 1px,transparent 140px),repeating-linear-gradient(rgba(255,255,255,.025) 0px,transparent 1px,transparent 140px)`

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.21, 1.02, 0.73, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const FEATURES = [
  { icon: Wifi, title: 'Read Offline', desc: 'Download entire series as CBZ or EPUB. Read anywhere, no connection required.' },
  { icon: Globe, title: '50+ Sources', desc: 'MangaDex, MangaKatana, Komga, Suwayomi, and many more — all in one interface.' },
  { icon: Layers, title: 'Cross-Device Sync', desc: 'Progress, categories, and notes sync across all devices via encrypted cloud storage.' },
  { icon: Star, title: 'Tracker Integration', desc: 'AniList, MAL, Kitsu, MangaUpdates, Shikimori, Bangumi. Mark as read, automatically.' },
  { icon: Zap, title: '3 Platforms', desc: 'Web PWA, native desktop via Tauri, and a native Android APK. One library everywhere.' },
  { icon: Shield, title: 'No Ads. No DRM.', desc: 'Open source, zero paywalls. Your data stays yours, forever.' },
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
    desc: 'Volume key page-turn, biometric lock, and background chapter syncing.',
    cta: 'Download APK',
    href: 'https://github.com/zenmisan/manga-dl/releases',
    internal: false,
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const handleCTA = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(email ? `/register?email=${encodeURIComponent(email)}` : '/register')
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#fafafa]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex flex-col overflow-hidden">

        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(220,38,38,.28) 0%, transparent 65%)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: GRID }} />
          <div className="absolute inset-0 opacity-[.035] mix-blend-overlay" style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat' }} />
          <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: 'linear-gradient(to bottom, transparent, #050505)' }} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-red-600/30 group-hover:rotate-6 transition-transform duration-300">
              M
            </div>
            <span className="font-black text-lg tracking-tight hidden sm:block">manga-dl</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-bold text-white/50 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/r" className="px-4 py-2 text-sm font-black bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-lg shadow-red-600/20 hover:-translate-y-px">
              Open App
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-28">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[.04] text-[10px] font-black uppercase tracking-[.2em] text-white/40 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Web · Desktop · Android
          </motion.div>

          {/* Headline */}
          <div className="overflow-hidden mb-2">
            <motion.div
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: [0.21, 1.02, 0.73, 1] }}
            >
              <h1
                className="text-[clamp(4.5rem,16vw,12rem)] leading-none font-black uppercase tracking-tighter"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                Read
              </h1>
            </motion.div>
          </div>
          <div className="overflow-hidden mb-6">
            <motion.div
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.75, delay: 0.3, ease: [0.21, 1.02, 0.73, 1] }}
            >
              <h1
                className="text-[clamp(4.5rem,16vw,12rem)] leading-none font-black uppercase tracking-tighter text-red-500"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                Everything.
              </h1>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.52 }}
            className="text-[clamp(1rem,2.5vw,1.25rem)] text-white/45 max-w-lg leading-relaxed mb-10"
          >
            50+ sources. Offline reading. AniList sync.{' '}
            <span className="text-white/80 font-semibold">Free, forever.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <Link
              to="/r"
              className="group flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-[.9375rem] transition-all shadow-xl shadow-red-600/25 hover:shadow-red-500/35 hover:-translate-y-0.5"
            >
              Start Reading
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-[.9375rem] border border-white/10 hover:border-white/20 bg-white/[.04] hover:bg-white/[.08] transition-all text-white/60 hover:text-white"
            >
              Sign In
            </Link>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20 pointer-events-none"
        >
          <span className="text-[9px] font-black uppercase tracking-[.25em]">Scroll</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut' }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────── */}
      <FadeUp>
        <section className="border-y border-white/5 py-12 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: '50+', label: 'Sources' },
              { val: '3', label: 'Platforms' },
              { val: '∞', label: 'Chapters' },
              { val: '$0', label: 'Forever' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div
                  className="text-[clamp(2.5rem,6vw,4rem)] leading-none font-black text-red-500 mb-1.5"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {val}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-white/25">{label}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <h2
              className="text-[clamp(2.5rem,7vw,5rem)] font-black uppercase tracking-tighter mb-3"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Built Different
            </h2>
            <p className="text-white/35 max-w-sm mx-auto text-sm">
              Everything a manga reader needs. Nothing it doesn't.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.07}>
                <div className="group p-6 rounded-2xl border border-white/[.06] bg-white/[.02] hover:bg-white/[.05] hover:border-red-500/25 transition-all duration-300 h-full cursor-default">
                  <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mb-4 group-hover:bg-red-600/20 transition-colors">
                    <f.icon className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="font-black text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-white/38 leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="py-28 px-6 border-y border-white/[.04]" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,.01), transparent)' }}>
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <h2
              className="text-[clamp(2.5rem,7vw,5rem)] font-black uppercase tracking-tighter mb-3"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              How It Works
            </h2>
            <p className="text-white/35 max-w-sm mx-auto text-sm">From zero to reading in under a minute.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {STEPS.map((s, i) => (
              <FadeUp key={s.n} delay={i * 0.1}>
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center font-black text-2xl shadow-xl shadow-red-600/25 flex-shrink-0"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {s.n}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="hidden md:block flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(220,38,38,.4), transparent)' }} />
                    )}
                  </div>
                  <h3 className="font-black text-xl">{s.title}</h3>
                  <p className="text-sm text-white/38 leading-relaxed">{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ───────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <h2
              className="text-[clamp(2.5rem,7vw,5rem)] font-black uppercase tracking-tighter mb-3"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Every Platform
            </h2>
            <p className="text-white/35 max-w-sm mx-auto text-sm">One library, synced across all your devices.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLATFORMS.map((p, i) => (
              <FadeUp key={p.name} delay={i * 0.08}>
                <div className="group p-7 rounded-2xl border border-white/[.06] bg-white/[.02] hover:border-red-500/25 transition-all duration-300 flex flex-col gap-5 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/[.04] border border-white/[.06] flex items-center justify-center flex-shrink-0">
                      <p.icon className="w-6 h-6 text-white/50" />
                    </div>
                    <div>
                      <div className="font-black text-lg leading-tight">{p.name}</div>
                      <div className="text-[10px] text-red-400/80 font-black uppercase tracking-widest mt-0.5">{p.badge}</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/38 leading-relaxed flex-1">{p.desc}</p>
                  {p.internal ? (
                    <Link
                      to={p.href}
                      className="text-sm font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors group-hover:gap-2.5"
                    >
                      {p.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors group-hover:gap-2.5"
                    >
                      {p.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <FadeUp>
        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto">
            <div className="relative rounded-3xl border border-red-500/20 p-10 md:p-14 text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,.07) 0%, transparent 60%)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(220,38,38,.12) 0%, transparent 70%)' }} />
              <div className="relative">
                <h2
                  className="text-[clamp(2rem,6vw,3.5rem)] font-black uppercase tracking-tighter leading-none mb-3"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Start your library<br />
                  <span className="text-red-500">in 30 seconds.</span>
                </h2>
                <p className="text-white/35 mb-8 text-sm">No credit card. No ads. Just manga.</p>
                <form onSubmit={handleCTA} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-white/[.05] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/40 placeholder:text-white/18 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-sm transition-all shadow-lg shadow-red-600/20 hover:-translate-y-px whitespace-nowrap"
                  >
                    Get Started
                  </button>
                </form>
                <p className="mt-5 text-[11px] text-white/20 font-bold uppercase tracking-wider">
                  Or{' '}
                  <Link to="/r" className="text-white/35 hover:text-white/60 transition-colors underline underline-offset-2">
                    jump straight into the app
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/[.05] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center font-black text-sm">M</div>
            <span className="font-black text-sm tracking-tight">manga-dl</span>
          </Link>
          <div className="flex items-center gap-5 text-sm text-white/28">
            <Link to="/r" className="hover:text-white transition-colors">Library</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/help" className="hover:text-white transition-colors">Help</Link>
            <a href="https://github.com/zenmisan/manga-dl" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <p className="text-white/18 text-xs">© 2026 manga-dl. Open source.</p>
        </div>
      </footer>
    </div>
  )
}

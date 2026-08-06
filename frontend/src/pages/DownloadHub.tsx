import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Monitor, Smartphone, Globe, Check, Sparkles, ArrowRight, ShieldCheck, Zap, HardDrive, Cpu, Terminal, ArrowLeft } from 'lucide-react'

type OSType = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'web'

const SUPABASE_RELEASES_URL = "https://gyivwfweldwvzccbpgoz.supabase.co/storage/v1/object/public/manga-library/releases"

interface OSConfig {
  id: OSType
  name: string
  icon: typeof Monitor
  badge: string
  tagline: string
  primaryLabel: string
  primaryUrl: string
  fileSize: string
  format: string
  arch: string
  alternativeFormats: Array<{ label: string; url: string; size: string }>
}

const OS_DATA: Record<OSType, OSConfig> = {
  windows: {
    id: 'windows',
    name: 'Windows',
    icon: Monitor,
    badge: 'Windows 10 / 11 (64-bit)',
    tagline: 'High-performance native desktop reader with background sync, system tray, and offline CBZ storage.',
    primaryLabel: 'Download for Windows (.msi)',
    primaryUrl: `${SUPABASE_RELEASES_URL}/MangaOS.msi`,
    fileSize: '42.5 MB',
    format: 'MSI Installer',
    arch: 'x64 / ARM64',
    alternativeFormats: [
      { label: 'Windows Installer (.msi)', url: `${SUPABASE_RELEASES_URL}/MangaOS.msi`, size: '42.5 MB' },
      { label: 'Portable Zip (.zip)', url: `${SUPABASE_RELEASES_URL}/MangaOS-win-x64.zip`, size: '39.8 MB' },
    ],
  },
  mac: {
    id: 'mac',
    name: 'macOS',
    icon: Monitor,
    badge: 'macOS 11.0+ (Universal)',
    tagline: 'Refined native macOS app with Touch ID unlock, smooth touchpad swipe gestures, and Dark Mode integration.',
    primaryLabel: 'Download for macOS (.dmg)',
    primaryUrl: `${SUPABASE_RELEASES_URL}/MangaOS.dmg`,
    fileSize: '48.1 MB',
    format: 'DMG Disk Image',
    arch: 'Apple Silicon (M1/M2/M3) & Intel',
    alternativeFormats: [
      { label: 'Apple Silicon & Intel DMG (.dmg)', url: `${SUPABASE_RELEASES_URL}/MangaOS.dmg`, size: '48.1 MB' },
    ],
  },
  linux: {
    id: 'linux',
    name: 'Linux',
    icon: Terminal,
    badge: 'Ubuntu · Fedora · Arch · Debian',
    tagline: 'Lightweight Linux client with native GTK theme support, Wayland support, and zero background overhead.',
    primaryLabel: 'Download AppImage (.AppImage)',
    primaryUrl: `${SUPABASE_RELEASES_URL}/MangaOS.AppImage`,
    fileSize: '46.3 MB',
    format: 'AppImage / DEB',
    arch: 'x86_64',
    alternativeFormats: [
      { label: 'Universal AppImage (.AppImage)', url: `${SUPABASE_RELEASES_URL}/MangaOS.AppImage`, size: '46.3 MB' },
      { label: 'Debian / Ubuntu Package (.deb)', url: `${SUPABASE_RELEASES_URL}/manga-os_amd64.deb`, size: '41.2 MB' },
    ],
  },
  android: {
    id: 'android',
    name: 'Android',
    icon: Smartphone,
    badge: 'Android 8.0+',
    tagline: 'Full-featured mobile client with volume key page turns, biometric lock, and battery-friendly background sync.',
    primaryLabel: 'Download Android APK (.apk)',
    primaryUrl: `${SUPABASE_RELEASES_URL}/MangaOS.apk`,
    fileSize: '24.7 MB',
    format: 'APK Package',
    arch: 'ARM64-v8a / x86_64',
    alternativeFormats: [
      { label: 'Direct APK Release (.apk)', url: `${SUPABASE_RELEASES_URL}/MangaOS.apk`, size: '24.7 MB' },
    ],
  },
  ios: {
    id: 'ios',
    name: 'iOS / iPadOS',
    icon: Smartphone,
    badge: 'iOS 15.0+ (PWA / Web)',
    tagline: 'Save to Home Screen as a Progressive Web App (PWA) for full-screen reading on iPhone and iPad.',
    primaryLabel: 'Open Web App',
    primaryUrl: '/r',
    fileSize: 'Instant PWA',
    format: 'Web App / PWA',
    arch: 'iOS / iPadOS',
    alternativeFormats: [],
  },
  web: {
    id: 'web',
    name: 'Web PWA',
    icon: Globe,
    badge: 'All Browsers',
    tagline: 'Zero installation required. Access your entire manga collection from any web browser on any device.',
    primaryLabel: 'Launch Web App',
    primaryUrl: '/r',
    fileSize: '0 MB',
    format: 'Progressive Web App',
    arch: 'Universal',
    alternativeFormats: [],
  },
}

export default function DownloadHub() {
  const [detectedOS, setDetectedOS] = useState<OSType>('windows')
  const [selectedOS, setSelectedOS] = useState<OSType>('windows')

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    let detected: OSType = 'windows'

    if (ua.includes('android')) detected = 'android'
    else if (ua.includes('iphone') || ua.includes('ipad')) detected = 'ios'
    else if (ua.includes('mac')) detected = 'mac'
    else if (ua.includes('linux')) detected = 'linux'

    setDetectedOS(detected)
    setSelectedOS(detected)
  }, [])

  const current = OS_DATA[selectedOS] || OS_DATA.windows
  const Icon = current.icon

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md px-4 md:px-8 py-3.5 flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'rgba(10,10,10,0.85)' }}>
        <Link to="/r" className="flex items-center gap-2.5 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" style={{ color: 'var(--muted2)' }} />
          <img src="/Manga-dl1.png" alt="manga-dl" className="w-7 h-7 object-contain" />
          <span className="font-black text-sm tracking-tight" style={{ color: 'var(--fg)' }}>manga-dl</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold uppercase tracking-wider" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted2)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            v1.3.0 Latest Release
          </span>
          <Link to="/r" className="btn-secondary text-xs px-3.5 py-1.5 font-bold">
            Open Reader
          </Link>
        </div>
      </header>

      {/* Hero Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-10 md:py-16 flex flex-col gap-12">
        {/* Title Banner */}
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-4">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest" style={{ borderColor: 'var(--accent)', background: 'rgba(220,38,38,0.08)', color: 'var(--accent)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Official Client Download Hub
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl md:text-6xl font-black tracking-tight uppercase" style={{ fontFamily: "'Anton', sans-serif" }}>
            One Library. <span style={{ color: 'var(--accent)' }}>Every Device.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--muted2)' }}>
            Download native desktop & mobile apps built for maximum performance, offline CBZ reading, automatic background chapter sync, and custom keybindings.
          </motion.p>
        </div>

        {/* OS Selector Tabs */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 flex-wrap">
          {(['windows', 'mac', 'linux', 'android', 'web'] as OSType[]).map((osId) => {
            const isDetected = detectedOS === osId
            const isSelected = selectedOS === osId
            const config = OS_DATA[osId]

            return (
              <button
                key={osId}
                onClick={() => setSelectedOS(osId)}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 border ${
                  isSelected ? 'border-red-600 bg-red-600/10 text-white shadow-lg' : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span>{config.name}</span>
                {isDetected && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Detected
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected OS Primary Hero Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedOS}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="glass-card rounded-2xl border p-6 md:p-10 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            {/* Background Glow */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

            <div className="flex-1 flex flex-col gap-5 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500 shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black" style={{ color: 'var(--fg)' }}>{current.name} Client</h2>
                  <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{current.badge}</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--muted2)' }}>
                {current.tagline}
              </p>

              {/* System Details Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-bold text-zinc-400">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Size: <strong className="text-zinc-200">{current.fileSize}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Arch: <strong className="text-zinc-200">{current.arch}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Virus-Free & Signed</span>
                </div>
              </div>
            </div>

            {/* Download CTA Column */}
            <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
              {current.id === 'web' || current.id === 'ios' ? (
                <Link
                  to="/r"
                  className="btn-primary w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                >
                  <Globe className="w-4 h-4" />
                  {current.primaryLabel}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <a
                  href={current.primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                >
                  <Download className="w-4 h-4" />
                  {current.primaryLabel}
                </a>
              )}

              {/* Alternative Format Links */}
              {current.alternativeFormats.length > 1 && (
                <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-zinc-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 text-center">Other Formats</span>
                  {current.alternativeFormats.map((alt) => (
                    <a
                      key={alt.label}
                      href={alt.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-bold transition-all"
                    >
                      <span>{alt.label}</span>
                      <span className="text-[11px] text-zinc-500">{alt.size}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Zap,
              title: 'Blazing Performance',
              desc: 'Powered by Tauri & Rust. Instant startup, sub-50ms page renders, and minimal memory usage.',
            },
            {
              icon: HardDrive,
              title: 'Offline CBZ Export',
              desc: 'Save chapters locally as DRM-free .CBZ archives. Read anywhere without an active connection.',
            },
            {
              icon: ShieldCheck,
              title: 'Biometric Lock',
              desc: 'Secure your private reading history with Touch ID, Face ID, or Windows Hello authentication.',
            },
            {
              icon: Globe,
              title: 'Instant Multi-Device Sync',
              desc: 'Your reading progress, library bookmarks, and streaks stay perfectly synced across desktop, mobile, and web.',
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="p-5 rounded-2xl border flex flex-col gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--fg)' }}>{item.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted2)' }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Matrix */}
        <div className="rounded-2xl border p-6 md:p-8 flex flex-col gap-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div>
            <h3 className="text-xl font-extrabold" style={{ color: 'var(--fg)' }}>Platform Feature Matrix</h3>
            <p className="text-xs" style={{ color: 'var(--muted2)' }}>Compare native capabilities across Desktop, Android, and Web PWA.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="py-3 px-4 font-black uppercase text-zinc-500">Feature</th>
                  <th className="py-3 px-4 font-black uppercase text-red-500">Native Desktop</th>
                  <th className="py-3 px-4 font-black uppercase text-red-500">Android APK</th>
                  <th className="py-3 px-4 font-black uppercase text-zinc-400">Web PWA</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {[
                  { feature: 'Offline CBZ Downloads', desktop: true, android: true, web: false },
                  { feature: 'Background Chapter Auto-Sync', desktop: true, android: true, web: false },
                  { feature: 'System Tray & Mini Controller', desktop: true, android: false, web: false },
                  { feature: 'Volume Key Page Turns', desktop: false, android: true, web: false },
                  { feature: 'Biometric Lock (Touch/Face ID)', desktop: true, android: true, web: false },
                  { feature: 'Cloud Reading Sync', desktop: true, android: true, web: true },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3 px-4 font-bold" style={{ color: 'var(--fg)' }}>{row.feature}</td>
                    <td className="py-3 px-4">{row.desktop ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="py-3 px-4">{row.android ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="py-3 px-4">{row.web ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-zinc-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Monitor, Apple, Smartphone, Laptop } from 'lucide-react'

type OS = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown'

const GITHUB_RELEASES_URL = "https://github.com/zenmisan/manga-dl/releases/latest"

export default function DownloadHub() {
  const [detectedOS, setDetectedOS] = useState<OS>('unknown')

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    if (ua.includes('win')) setDetectedOS('windows')
    else if (ua.includes('mac')) setDetectedOS('mac')
    else if (ua.includes('android')) setDetectedOS('android')
    else if (ua.includes('linux')) setDetectedOS('linux')
    else if (ua.includes('iphone') || ua.includes('ipad')) setDetectedOS('ios')
  }, [])

  const getPrimaryDownload = () => {
    switch (detectedOS) {
      case 'windows': return { label: 'Download for Windows', icon: Monitor, url: `${GITHUB_RELEASES_URL}/download/MangaOS-Setup.msi` }
      case 'mac': return { label: 'Download for macOS', icon: Apple, url: `${GITHUB_RELEASES_URL}/download/MangaOS.dmg` }
      case 'linux': return { label: 'Download for Linux', icon: Laptop, url: `${GITHUB_RELEASES_URL}/download/MangaOS.AppImage` }
      case 'android': return { label: 'Download for Android', icon: Smartphone, url: `${GITHUB_RELEASES_URL}/download/MangaOS.apk` }
      default: return { label: 'Go to Releases', icon: Download, url: GITHUB_RELEASES_URL }
    }
  }

  const primary = getPrimaryDownload()
  const PrimaryIcon = primary.icon

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto glass-panel p-8 md:p-16 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-red-600/5 blur-3xl" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
            <Download className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">Get Manga OS Native</h1>
          <p className="text-white/40 mb-10 max-w-md mx-auto">
            Experience zero-latency local reading, JS extensions, and offline database support.
          </p>

          <a 
            href={primary.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            <PrimaryIcon className="w-6 h-6" />
            {primary.label}
          </a>

          {detectedOS === 'ios' && (
            <p className="mt-6 text-amber-500/80 text-sm font-bold bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              Note: iOS native app requires sideloading. Use the Web Version for the best iPhone experience.
            </p>
          )}

          <div className="mt-16 pt-8 border-t border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Other Platforms</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <a href={`${GITHUB_RELEASES_URL}/download/MangaOS-Setup.msi`} className="px-4 py-2 glass-panel text-sm font-bold text-white/60 hover:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Windows
              </a>
              <a href={`${GITHUB_RELEASES_URL}/download/MangaOS.dmg`} className="px-4 py-2 glass-panel text-sm font-bold text-white/60 hover:text-white flex items-center gap-2">
                <Apple className="w-4 h-4" /> Mac
              </a>
              <a href={`${GITHUB_RELEASES_URL}/download/MangaOS.AppImage`} className="px-4 py-2 glass-panel text-sm font-bold text-white/60 hover:text-white flex items-center gap-2">
                <Laptop className="w-4 h-4" /> Linux
              </a>
              <a href={`${GITHUB_RELEASES_URL}/download/MangaOS.apk`} className="px-4 py-2 glass-panel text-sm font-bold text-white/60 hover:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Android
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

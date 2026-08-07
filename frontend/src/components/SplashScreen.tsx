import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const start = performance.now()
    const duration = 1600

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setProgress(p)
      if (p < 1) {
        requestAnimationFrame(tick)
      } else {
        setTimeout(() => {
          setLeaving(true)
          setTimeout(onDone, 400)
        }, 100)
      }
    }
    requestAnimationFrame(tick)
  }, [onDone])

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] bg-[var(--bg)] flex flex-col items-center justify-center transition-colors"
        >
          {/* Theme Accent Radial Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, var(--accent-glow, rgba(220,38,38,.18)) 0%, transparent 70%)' }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.21, 1.02, 0.73, 1] }}
            className="relative"
          >
            <div className="w-24 h-24 flex items-center justify-center">
              <img src="/Manga-dl1.png" alt="manga-dl logo" className="w-full h-full object-contain drop-shadow-[0_0_25px_var(--accent-glow,rgba(220,38,38,0.4))]" />
            </div>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-[var(--accent,#dc2626)]/40"
              animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-6 text-center"
          >
            <p className="font-black text-2xl tracking-tight text-[var(--fg)]">manga-dl</p>
            <p className="text-[var(--muted2)] text-xs font-bold uppercase tracking-[.2em] mt-1">Your manga, everywhere</p>
          </motion.div>

          {/* Dynamic Theme Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--border)]">
            <motion.div
              className="h-full bg-[var(--accent,#dc2626)] shadow-[0_0_10px_var(--accent-glow)]"
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

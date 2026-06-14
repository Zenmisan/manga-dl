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
          className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center"
        >
          {/* Red glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(220,38,38,.18) 0%, transparent 70%)' }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.21, 1.02, 0.73, 1] }}
            className="relative"
          >
            <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-600/40">
              <span
                className="text-5xl font-black text-white leading-none select-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                M
              </span>
            </div>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-red-500/40"
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
            <p className="font-black text-2xl tracking-tight text-white">manga-dl</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-[.2em] mt-1">Your manga, everywhere</p>
          </motion.div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
            <motion.div
              className="h-full bg-red-500"
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

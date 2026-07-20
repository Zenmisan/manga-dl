import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard } from 'lucide-react'

interface Props {
  show: boolean
  onDismiss: () => void
}

const SHORTCUTS = [
  { label: 'Next Page', keys: ['→', '↓', 'Space'] },
  { label: 'Previous Page', keys: ['←', '↑'] },
  { label: 'Exit Reader', keys: ['Esc'] },
]

export function ShortcutOverlay({ show, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0d0d11]/90 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-600/10 rounded-full blur-2xl -z-10" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-red-600/10 rounded-full blur-2xl -z-10" />

            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl mb-4">
              <Keyboard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2" style={{ fontFamily: "'Anton', sans-serif" }}>
              Reading Controls
            </h3>
            <p className="text-xs text-white/40 mb-6 font-sans">
              Quick guide for navigating the reader on desktop & mobile devices.
            </p>

            <div className="w-full space-y-3 mb-8 font-sans">
              {SHORTCUTS.map(item => (
                <div key={item.label} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl">
                  <span className="text-xs font-semibold text-white/60">{item.label}</span>
                  <div className="flex gap-1">
                    {item.keys.map(k => (
                      <kbd key={k} className="px-2 py-1 bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono font-bold shadow-md">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-xs font-semibold text-white/60">Toggle Controls UI</span>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Tap Center / Click</span>
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20 font-sans"
            >
              Let's Read
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

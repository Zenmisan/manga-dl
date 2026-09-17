import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import CommentSection from './CommentSection'

interface Props {
  open: boolean
  onClose: () => void
  provider: string
  mangaId: string
  chapterId?: string
}

export default function CommentSheet({ open, onClose, provider, mangaId, chapterId }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-white/10 rounded-t-2xl max-h-[80dvh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
              <span className="text-sm font-black uppercase tracking-widest text-zinc-400">
                Chapter Comments
              </span>
              <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-8" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
              <CommentSection provider={provider} mangaId={mangaId} chapterId={chapterId} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

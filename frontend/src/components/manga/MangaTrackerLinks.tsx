import { motion } from 'framer-motion'
import { ListPlus } from 'lucide-react'

interface Props {
  trackerLinks: Record<string, { id: number; title: string; score?: number; status?: string; progress?: number }>
  openSyncModal: (tracker: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi') => void
  removeTrackerLink: (tracker: string) => void
  onOpenTrackerModal: (tracker: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi') => void
}

export function MangaTrackerLinks({
  trackerLinks, openSyncModal, removeTrackerLink, onOpenTrackerModal,
}: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="p-6 glass-card border-white/5">
      <h3 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
        <ListPlus className="w-3.5 h-3.5" />
        Tracker Links
      </h3>
      <div className="space-y-3">
        {(['anilist', 'mal', 'mangaupdates', 'shikimori', 'bangumi'] as const).map(tracker => {
          const link = trackerLinks[tracker]
          const label = tracker === 'anilist' ? 'AniList' : tracker === 'mal' ? 'MyAnimeList' : tracker === 'mangaupdates' ? 'MangaUpdates' : tracker === 'shikimori' ? 'Shikimori' : 'Bangumi'
          return (
            <div key={tracker} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="text-xs font-bold text-white/80">{label}</p>
                {link ? (
                  <p className="text-[10px] text-emerald-400 font-mono truncate max-w-[180px]">
                    ✓ Linked: {link.title}
                  </p>
                ) : (
                  <p className="text-[10px] text-white/30">Not linked</p>
                )}
              </div>
              <div className="flex gap-1">
                {link ? (
                  <>
                    {(tracker === 'anilist' || tracker === 'mal') && (
                      <button
                        onClick={() => openSyncModal(tracker)}
                        className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400/60 hover:text-emerald-400 transition-colors"
                      >
                        Sync
                      </button>
                    )}
                    <button onClick={() => removeTrackerLink(tracker)} className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors">
                      Unlink
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onOpenTrackerModal(tracker)}
                    className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/30 hover:border-white/20 hover:text-white/60 transition-all"
                  >
                    Link
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

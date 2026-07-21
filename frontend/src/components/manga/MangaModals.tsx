import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface TrackerResult {
  id: number
  title: string
  cover?: string
  year?: number
  score?: number
  status?: string
  progress?: number
}

interface Props {
  // Tracker Search Modal
  showTrackerModal: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null
  setShowTrackerModal: (v: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null) => void
  trackerSearch: string
  setTrackerSearch: (v: string) => void
  trackerSearching: boolean
  trackerResults: TrackerResult[]
  searchTracker: (query: string, tracker: string | null) => void
  saveTrackerLink: (tracker: string, entry: { id: number; title: string; score?: number; status?: string; progress?: number }) => void

  // Tracker Sync Modal
  showSyncModal: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null
  setShowSyncModal: (v: 'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null) => void
  syncStatus: string
  setSyncStatus: (v: string) => void
  syncScore: number
  setSyncScore: (v: number) => void
  syncProgress: number
  setSyncProgress: (v: number) => void
  syncStartDate: string
  setSyncStartDate: (v: string) => void
  syncEndDate: string
  setSyncEndDate: (v: string) => void
  syncing: boolean
  handleTrackerSync: () => void

  // Metadata Edit Modal
  editingMeta: boolean
  setEditingMeta: (v: boolean) => void
  metaDraft: { title: string; cover_url: string; description: string }
  setMetaDraft: React.Dispatch<React.SetStateAction<{ title: string; cover_url: string; description: string }>>
  saveMetaEdit: () => void
}

export function MangaModals({
  showTrackerModal, setShowTrackerModal, trackerSearch, setTrackerSearch,
  trackerSearching, trackerResults, searchTracker, saveTrackerLink,
  showSyncModal, setShowSyncModal, syncStatus, setSyncStatus, syncScore,
  setSyncScore, syncProgress, setSyncProgress, syncStartDate, setSyncStartDate,
  syncEndDate, setSyncEndDate, syncing, handleTrackerSync, editingMeta,
  setEditingMeta, metaDraft, setMetaDraft, saveMetaEdit,
}: Props) {
  return (
    <>
      {/* Tracker Search Modal */}
      <AnimatePresence>
        {showTrackerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowTrackerModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-md p-6 border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg mb-4">
                Link to {showTrackerModal === 'anilist' ? 'AniList' : 'MAL'}
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={trackerSearch}
                  onChange={e => setTrackerSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchTracker(trackerSearch, showTrackerModal)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                  placeholder="Search manga title..."
                />
                <button
                  onClick={() => searchTracker(trackerSearch, showTrackerModal)}
                  disabled={trackerSearching}
                  className="btn-primary py-2 px-4 text-xs font-bold shrink-0"
                >
                  {trackerSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar">
                {trackerResults.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      saveTrackerLink(showTrackerModal, { id: item.id, title: item.title, score: item.score, status: item.status, progress: item.progress })
                      setShowTrackerModal(null)
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-white/10"
                  >
                    {item.cover && <img src={item.cover} alt="" className="w-10 h-14 object-cover rounded-lg shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs truncate text-white/90">{item.title}</p>
                      <p className="text-[10px] text-white/40">{item.year ? `${item.year} • ` : ''}{item.score ? `★ ${item.score}` : 'No rating'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracker Sync Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSyncModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-sm p-6 border-white/10 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg">Sync to {showSyncModal === 'anilist' ? 'AniList' : 'MAL'}</h3>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Status</label>
                <select
                  value={syncStatus}
                  onChange={e => setSyncStatus(e.target.value)}
                  className="select-styled w-full text-xs"
                >
                  <option value="CURRENT">Reading (Current)</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PAUSED">On Hold / Paused</option>
                  <option value="DROPPED">Dropped</option>
                  <option value="PLANNING">Plan to Read</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Score (0 - 10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={syncScore}
                  onChange={e => setSyncScore(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Chapters Read</label>
                <input
                  type="number"
                  min="0"
                  value={syncProgress}
                  onChange={e => setSyncProgress(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={syncStartDate}
                    onChange={e => setSyncStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Finish Date</label>
                  <input
                    type="date"
                    value={syncEndDate}
                    onChange={e => setSyncEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSyncModal(null)}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/40 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTrackerSync}
                  disabled={syncing}
                  className="flex-1 btn-primary py-2 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Sync'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Metadata Edit Modal */}
      <AnimatePresence>
        {editingMeta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingMeta(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-md p-6 border-white/10 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg">Edit Series Metadata</h3>
              <p className="text-xs text-white/40">Custom changes persist locally for this series.</p>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Title</label>
                <input
                  type="text"
                  value={metaDraft.title}
                  onChange={e => setMetaDraft({ ...metaDraft, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Cover Image URL</label>
                <input
                  type="text"
                  value={metaDraft.cover_url}
                  onChange={e => setMetaDraft({ ...metaDraft, cover_url: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Synopsis</label>
                <textarea
                  value={metaDraft.description}
                  onChange={e => setMetaDraft({ ...metaDraft, description: e.target.value })}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingMeta(false)}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/40 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMetaEdit}
                  className="flex-1 btn-primary py-2 text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

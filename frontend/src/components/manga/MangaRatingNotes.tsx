import { Star, MessageSquare } from 'lucide-react'
import { cn } from '../../lib/utils'
import { setMangaNote, setMangaRating } from '../../lib/mangaNotes'

interface Props {
  provider: string | undefined
  mangaId: string | undefined
  userRating: number
  setUserRating: (val: number) => void
  userNote: string
  setUserNote: (val: string) => void
  noteEditing: boolean
  setNoteEditing: React.Dispatch<React.SetStateAction<boolean>>
  noteDraft: string
  setNoteDraft: (val: string) => void
}

export function MangaRatingNotes({
  provider, mangaId, userRating, setUserRating,
  userNote, setUserNote, noteEditing, setNoteEditing,
  noteDraft, setNoteDraft,
}: Props) {
  return (
    <div className="glass-panel p-6 border-white/5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/20 flex items-center gap-2">
          <Star className="w-4 h-4" />
          My Rating & Notes
        </h3>
        <button
          onClick={() => { setNoteEditing(e => !e); setNoteDraft(userNote) }}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Star rating */}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => {
              const newRating = star === userRating ? 0 : star
              setUserRating(newRating)
              if (provider && mangaId) setMangaRating(provider, mangaId, newRating)
            }}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                star <= userRating ? "text-amber-400 fill-amber-400" : "text-white/20"
              )}
            />
          </button>
        ))}
        {userRating > 0 && (
          <span className="ml-2 text-sm font-bold text-amber-400 self-center">{userRating}/5</span>
        )}
      </div>

      {/* Note */}
      {noteEditing ? (
        <div className="space-y-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Write a personal note about this manga..."
            rows={3}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (provider && mangaId) { setMangaNote(provider, mangaId, noteDraft); setUserNote(noteDraft) }
                setNoteEditing(false)
              }}
              className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >Save</button>
            <button
              onClick={() => { setNoteEditing(false); setNoteDraft(userNote) }}
              className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >Cancel</button>
          </div>
        </div>
      ) : userNote ? (
        <p className="text-sm text-white/50 italic leading-relaxed">&ldquo;{userNote}&rdquo;</p>
      ) : (
        <p className="text-xs text-white/20 italic">No personal notes yet — click the icon to add one.</p>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Heart, Reply, Trash2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

interface CommentData {
  id: string
  user_id: string
  username: string
  display_name: string
  body: string
  likes: number
  liked: boolean
  created_at: string
  parent_id: string | null
  replies: CommentData[]
}

interface Props {
  provider: string
  mangaId: string
  chapterId?: string
  preview?: boolean   // true = show only 3, with expand button
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase()
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 select-none"
      style={{ background: `hsl(${hue},55%,30%)`, color: `hsl(${hue},80%,85%)` }}
    >
      {initials}
    </div>
  )
}

function CommentCard({
  comment, currentUserId, onLike, onDelete, onReply, depth = 0,
}: {
  comment: CommentData
  currentUserId: string | null
  onLike: (id: string) => void
  onDelete: (id: string) => void
  onReply: (id: string, username: string) => void
  depth?: number
}) {
  const isOwn = currentUserId === comment.user_id

  return (
    <div className={cn('flex gap-3', depth > 0 && 'ml-10 mt-3')}>
      <Avatar name={comment.display_name || comment.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold text-white">{comment.display_name || comment.username}</span>
          <span className="text-[11px] text-zinc-500">@{comment.username}</span>
          <span className="text-[11px] text-zinc-600">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-zinc-300 mt-1 leading-relaxed break-words">{comment.body}</p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => onLike(comment.id)}
            className={cn('flex items-center gap-1 text-xs font-semibold transition-colors',
              comment.liked ? 'text-red-400' : 'text-zinc-500 hover:text-red-400')}
          >
            <Heart className={cn('w-3.5 h-3.5', comment.liked && 'fill-red-400')} />
            {comment.likes > 0 && comment.likes}
          </button>
          {depth === 0 && currentUserId && (
            <button
              onClick={() => onReply(comment.id, comment.username)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white font-semibold transition-colors"
            >
              <Reply className="w-3.5 h-3.5" /> Reply
            </button>
          )}
          {isOwn && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors ml-auto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies?.length > 0 && (
          <div className="mt-3 border-l border-white/5 pl-0">
            {comment.replies.map(r => (
              <CommentCard
                key={r.id}
                comment={r}
                currentUserId={currentUserId}
                onLike={onLike}
                onDelete={onDelete}
                onReply={onReply}
                depth={1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommentSection({ provider, mangaId, chapterId, preview = false }: Props) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(!preview)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [posting, setPosting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null)
      if (session?.user?.id) {
        api.get('/users/me').then(r => setHasProfile(!!r.data.username)).catch(() => {})
      }
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { provider, manga_id: mangaId }
      if (chapterId) params.chapter_id = chapterId
      const r = await api.get('/comments', { params })
      setComments(r.data.comments)
      setTotal(r.data.total)
    } catch { /* silent */ }
    setLoading(false)
  }, [provider, mangaId, chapterId])

  useEffect(() => { load() }, [load])

  const handleLike = async (id: string) => {
    if (!currentUserId) return
    try {
      const r = await api.post(`/comments/${id}/like`)
      setComments(prev => prev.map(c => {
        if (c.id === id) return { ...c, liked: r.data.liked, likes: r.data.likes }
        return { ...c, replies: c.replies.map(rep => rep.id === id ? { ...rep, liked: r.data.liked, likes: r.data.likes } : rep) }
      }))
    } catch { /* silent */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/comments/${id}`)
      setComments(prev => prev
        .filter(c => c.id !== id)
        .map(c => ({ ...c, replies: c.replies.filter(r => r.id !== id) }))
      )
      setTotal(t => Math.max(0, t - 1))
    } catch { /* silent */ }
  }

  const handlePost = async () => {
    if (!body.trim() || posting) return
    setPosting(true)
    try {
      const r = await api.post('/comments', {
        provider, manga_id: mangaId,
        chapter_id: chapterId ?? null,
        parent_id: replyTo?.id ?? null,
        body: body.trim(),
      })
      if (replyTo) {
        setComments(prev => prev.map(c =>
          c.id === replyTo.id ? { ...c, replies: [...c.replies, r.data] } : c
        ))
      } else {
        setComments(prev => [r.data, ...prev])
        setTotal(t => t + 1)
      }
      setBody('')
      setReplyTo(null)
    } catch { /* silent */ }
    setPosting(false)
  }

  const displayed = preview && !expanded ? comments.slice(0, 3) : comments

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-black uppercase tracking-widest text-zinc-400">
          Comments {total > 0 && <span className="text-zinc-500">({total})</span>}
        </span>
      </div>

      {/* Compose */}
      {currentUserId && hasProfile ? (
        <div className="mb-5">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
              <Reply className="w-3 h-3" /> Replying to @{replyTo.username}
              <button onClick={() => setReplyTo(null)} className="ml-1 text-zinc-600 hover:text-white">✕</button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost() }}
                placeholder={replyTo ? `Reply to @${replyTo.username}…` : 'Share your thoughts…'}
                rows={2}
                maxLength={2000}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-white/20 transition-colors"
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-[11px] text-zinc-600">{body.length}/2000</span>
                <button
                  onClick={handlePost}
                  disabled={!body.trim() || posting}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition-colors"
                >
                  {posting ? '…' : replyTo ? 'Reply' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : currentUserId && !hasProfile ? (
        <p className="text-xs text-zinc-500 mb-4">Set a username in Settings to comment.</p>
      ) : (
        <p className="text-xs text-zinc-500 mb-4">Sign in to leave a comment.</p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-600">Be the first to comment.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {displayed.map(c => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CommentCard
                  comment={c}
                  currentUserId={currentUserId}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onReply={(id, username) => { setReplyTo({ id, username }); setBody('') }}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Expand / collapse for preview mode */}
          {preview && total > 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white font-semibold transition-colors mt-2"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Show less' : `View all ${total} comments`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

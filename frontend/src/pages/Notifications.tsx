import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BookOpen, Book } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMangaUpdates } from '../lib/queries'
import { buildSmartReadUrl } from '../lib/smartUrl'
import api from '../lib/api'

interface UpdateEntry {
  manga_title: string
  manga_id: string
  provider: string
  cover_url: string | null
  chapter_id: string
  chapter_title: string
  chapter_number: number
  published_at: string | null
}

const READ_KEY = 'manga-dl-notif-read'

function getReadSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'))
  } catch { return new Set() }
}

function saveReadSet(s: Set<string>) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...s])) } catch { /* noop */ }
}

function notifId(u: UpdateEntry) { return `${u.provider}:${u.manga_id}:${u.chapter_id}` }

function dateBucket(iso: string | null): string {
  if (!iso) return 'Earlier'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Earlier'
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { data: rawUpdates = [], isLoading } = useMangaUpdates()
  const updates = rawUpdates as UpdateEntry[]
  const [readSet, setReadSet] = useState<Set<string>>(getReadSet)
  const [coverErrors, setCoverErrors] = useState<Set<string>>(new Set())
  const apiKey = localStorage.getItem('manga-api-key') || ''

  const markRead = (id: string) => {
    setReadSet(prev => {
      const next = new Set(prev)
      next.add(id)
      saveReadSet(next)
      return next
    })
  }

  const markAllRead = () => {
    const all = new Set(updates.map(notifId))
    setReadSet(all)
    saveReadSet(all)
  }

  const unreadCount = updates.filter(u => !readSet.has(notifId(u))).length

  // Group by date bucket
  const buckets = useMemo(() => {
    const map = new Map<string, UpdateEntry[]>()
    for (const u of updates) {
      const bucket = dateBucket(u.published_at)
      if (!map.has(bucket)) map.set(bucket, [])
      map.get(bucket)!.push(u)
    }
    const BUCKET_ORDER = ['Today', 'Yesterday']
    return [...map.entries()].sort(([a], [b]) => {
      const ai = BUCKET_ORDER.indexOf(a)
      const bi = BUCKET_ORDER.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
  }, [updates])

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky glass header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 h-[60px] border-b"
        style={{
          background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--border)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h1 className="font-black text-base uppercase tracking-wider" style={{ color: 'var(--fg)' }}>Notifications</h1>
          {unreadCount > 0 && (
            <span
              className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white"
              style={{ background: 'var(--accent)' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-black uppercase tracking-wider transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            Mark all read
          </button>
        )}
      </header>

      <div className="flex-1 px-4 pt-4 pb-28">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : updates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center py-16 gap-4"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Bell className="w-6 h-6" style={{ color: 'var(--muted3)' }} />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--muted2)' }}>No notifications yet</p>
            <p className="text-xs" style={{ color: 'var(--muted3)', maxWidth: 240 }}>When library updates arrive, they'll appear here</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {buckets.map(([bucket, items]) => {
              const bucketUnread = items.filter(u => !readSet.has(notifId(u))).length
              return (
                <section key={bucket}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[10px] font-black uppercase tracking-[.15em]"
                      style={{ color: 'var(--muted3)' }}
                    >
                      {bucket}
                    </span>
                    {bucketUnread > 0 && (
                      <span
                        className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[9px] font-black"
                        style={{ background: 'rgba(220,38,38,0.2)', color: 'var(--accent)' }}
                      >
                        {bucketUnread}
                      </span>
                    )}
                  </div>

                  {/* Notification cards */}
                  <div className="space-y-2">
                    {items.map((u, i) => {
                      const id = notifId(u)
                      const isRead = readSet.has(id)
                      const coverSrc = u.cover_url && !coverErrors.has(id)
                        ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(u.cover_url)}&api_key=${apiKey}`
                        : null
                      const readUrl = buildSmartReadUrl(u.provider, u.manga_id, u.chapter_id, u.manga_title, u.chapter_title)
                      const mangaUrl = `/${u.provider}/${u.manga_id}`

                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="rounded-xl flex gap-3 p-3 transition-all cursor-pointer"
                          style={{
                            background: 'var(--surface)',
                            border: `1px solid ${isRead ? 'var(--border)' : 'rgba(220,38,38,0.15)'}`,
                            opacity: isRead ? 0.6 : 1,
                          }}
                          onClick={() => { markRead(id); navigate(mangaUrl) }}
                        >
                          {/* Cover */}
                          <div className="relative shrink-0">
                            <div
                              className="rounded-md overflow-hidden"
                              style={{ width: 64, height: 88, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}
                            >
                              {coverSrc ? (
                                <img
                                  src={coverSrc}
                                  alt={u.manga_title}
                                  className="w-full h-full object-cover"
                                  onError={() => setCoverErrors(prev => new Set(prev).add(id))}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Book className="w-5 h-5" style={{ color: 'var(--muted3)' }} />
                                </div>
                              )}
                            </div>
                            {!isRead && (
                              <span
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                                style={{
                                  background: 'var(--accent)',
                                  boxShadow: '0 0 8px rgba(220,38,38,0.8)',
                                }}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <p
                                className="font-black text-sm truncate mb-0.5"
                                style={{ color: 'var(--fg)' }}
                              >
                                {u.manga_title}
                              </p>
                              <p
                                className="text-xs font-semibold truncate"
                                style={{ color: 'var(--muted2)' }}
                              >
                                {u.chapter_title || `Chapter ${u.chapter_number}`}
                              </p>
                              <p
                                className="text-[10px] font-medium mt-1"
                                style={{ color: 'var(--muted3)' }}
                              >
                                {timeAgo(u.published_at)}
                              </p>
                            </div>

                            {!isRead && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markRead(id); navigate(readUrl) }}
                                className="mt-2 self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                style={{
                                  background: 'var(--accent)',
                                  color: '#fff',
                                  boxShadow: '0 0 10px rgba(220,38,38,0.25)',
                                }}
                              >
                                <BookOpen className="w-3 h-3" />
                                Read Now
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

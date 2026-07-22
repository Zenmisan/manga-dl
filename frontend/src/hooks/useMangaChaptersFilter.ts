import { useState, useMemo } from 'react'
import type { MangaDetail } from './useMangaDetail'
import { markRead, markUnread, markAllRead } from '../lib/readTracking'

export function useMangaChaptersFilter(
  provider: string | undefined,
  mangaId: string | undefined,
  manga: MangaDetail | null,
  readChapters: Set<string>,
  setReadChapters: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const [chapterSort, setChapterSort] = useState<'default' | 'newest' | 'oldest' | 'num-asc' | 'num-desc'>('default')
  const [chapterSearch, setChapterSearch] = useState('')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [scanlatorFilter, setScanlatorFilter] = useState<string>('all')
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')
      return new Set(stored[`${provider}:${mangaId}`] || [])
    } catch {
      return new Set()
    }
  })

  const toggleBookmark = (chId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(bookmarks)
    if (next.has(chId)) next.delete(chId)
    else next.add(chId)
    setBookmarks(next)
    const key = `${provider}:${mangaId}`
    const all = JSON.parse(localStorage.getItem('manga-dl-bookmarks') || '{}')
    all[key] = Array.from(next)
    localStorage.setItem('manga-dl-bookmarks', JSON.stringify(all))
  }

  const toggleReadStatus = (chId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!provider || !mangaId) return
    if (readChapters.has(chId)) {
      markUnread(provider, mangaId, chId)
      setReadChapters(prev => { const n = new Set(prev); n.delete(chId); return n })
    } else {
      markRead(provider, mangaId, chId)
      setReadChapters(prev => new Set(prev).add(chId))
    }
  }

  const handleMarkAllRead = () => {
    if (!provider || !mangaId || !manga) return
    const allIds = manga.chapters.map(c => c.id)
    markAllRead(provider, mangaId, allIds)
    setReadChapters(new Set(allIds))
  }

  const scanlators = useMemo(() => {
    if (!manga) return []
    const set = new Set<string>()
    for (const c of manga.chapters) {
      const match = c.title?.match(/\[(.*?)\]|\((.*?)\)/)
      if (match) set.add(match[1] || match[2])
    }
    return Array.from(set)
  }, [manga])

  const displayedChapters = useMemo(() => {
    if (!manga) return []
    let list = [...manga.chapters]
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase()
      list = list.filter(c => c.title.toLowerCase().includes(q) || String(c.number).includes(q))
    }
    if (scanlatorFilter !== 'all') {
      list = list.filter(c => c.title.includes(`[${scanlatorFilter}]`) || c.title.includes(`(${scanlatorFilter})`))
    }
    if (readFilter === 'unread') list = list.filter(c => !readChapters.has(c.id))
    if (readFilter === 'read') list = list.filter(c => readChapters.has(c.id))
    switch (chapterSort) {
      case 'newest': list.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')); break
      case 'oldest': list.sort((a, b) => (a.published_at || '').localeCompare(b.published_at || '')); break
      case 'num-asc': list.sort((a, b) => a.number - b.number); break
      case 'num-desc': list.sort((a, b) => b.number - a.number); break
    }
    return list
  }, [manga, chapterSort, chapterSearch, readFilter, scanlatorFilter, readChapters])

  const resumeTarget = useMemo(() => {
    if (!manga || manga.chapters.length === 0) return null
    const sorted = [...manga.chapters].sort((a, b) => a.number - b.number)
    const firstUnread = sorted.find(c => !readChapters.has(c.id))
    if (firstUnread) {
      return { chapter: firstUnread, label: `Resume Ch. ${firstUnread.number}` }
    }
    const last = sorted[sorted.length - 1]
    return { chapter: last, label: `Re-read Ch. ${last.number}` }
  }, [manga, readChapters])

  return {
    chapterSort, setChapterSort, chapterSearch, setChapterSearch,
    readFilter, setReadFilter, scanlatorFilter, setScanlatorFilter,
    bookmarks, toggleBookmark, toggleReadStatus, handleMarkAllRead,
    scanlators, displayedChapters, resumeTarget,
  }
}

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
  const [chapterSort, setChapterSort] = useState<'default' | 'newest' | 'oldest' | 'num-asc' | 'num-desc'>('num-asc')
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

    // Build index map for stable fallback (backend order = source order)
    const indexMap = new Map(manga.chapters.map((c, i) => [c.id, i]))

    // Extract chapter number: prefer c.number if non-zero, else parse from title
    const getNum = (c: { number: number; title: string }) => {
      if (c.number && c.number !== 0) return c.number
      const m = c.title.match(/[\d]+(?:\.\d+)?/)
      return m ? parseFloat(m[0]) : 0
    }

    let list = [...manga.chapters]
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase()
      list = list.filter(c => c.title.toLowerCase().includes(q) || String(getNum(c)).includes(q))
    }
    if (scanlatorFilter !== 'all') {
      list = list.filter(c => c.title.includes(`[${scanlatorFilter}]`) || c.title.includes(`(${scanlatorFilter})`))
    }
    if (readFilter === 'unread') list = list.filter(c => !readChapters.has(c.id))
    if (readFilter === 'read') list = list.filter(c => readChapters.has(c.id))

    switch (chapterSort) {
      case 'newest':
        // published_at if available, else reverse source order (latest = lowest index from provider)
        list.sort((a, b) => {
          if (a.published_at && b.published_at) return b.published_at.localeCompare(a.published_at)
          return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0)
        })
        break
      case 'oldest':
        list.sort((a, b) => {
          if (a.published_at && b.published_at) return a.published_at.localeCompare(b.published_at)
          return (indexMap.get(b.id) ?? 0) - (indexMap.get(a.id) ?? 0)
        })
        break
      case 'num-asc':
        list.sort((a, b) => getNum(a) - getNum(b))
        break
      case 'num-desc':
        list.sort((a, b) => getNum(b) - getNum(a))
        break
    }
    return list
  }, [manga, chapterSort, chapterSearch, readFilter, scanlatorFilter, readChapters])

  const resumeTarget = useMemo(() => {
    if (!manga || manga.chapters.length === 0) return null
    // Check last-read chapter saved by reader
    try {
      const lastChapterId = localStorage.getItem(`manga-dl-last-chapter:${provider}:${mangaId}`)
      if (lastChapterId) {
        const lastChapter = manga.chapters.find(c => c.id === lastChapterId)
        if (lastChapter) return { chapter: lastChapter, label: `Continue Ch. ${lastChapter.number}` }
      }
    } catch { /* private browsing */ }
    const getNum = (c: { number: number; title: string }) => {
      if (c.number && c.number !== 0) return c.number
      const m = c.title.match(/[\d]+(?:\.\d+)?/)
      return m ? parseFloat(m[0]) : 0
    }
    const sorted = [...manga.chapters].sort((a, b) => getNum(a) - getNum(b))
    const firstUnread = sorted.find(c => !readChapters.has(c.id))
    if (firstUnread) {
      return { chapter: firstUnread, label: `Resume Ch. ${firstUnread.number}` }
    }
    const last = sorted[sorted.length - 1]
    return { chapter: last, label: `Re-read Ch. ${last.number}` }
  }, [manga, readChapters, provider, mangaId])

  return {
    chapterSort, setChapterSort, chapterSearch, setChapterSearch,
    readFilter, setReadFilter, scanlatorFilter, setScanlatorFilter,
    bookmarks, toggleBookmark, toggleReadStatus, handleMarkAllRead,
    scanlators, displayedChapters, resumeTarget,
  }
}

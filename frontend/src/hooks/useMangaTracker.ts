import { useState } from 'react'
import api from '../lib/api'

const TRACKER_LINKS_KEY = 'manga-dl-tracker-links'

export interface TrackerLinkEntry {
  id: number
  title: string
  score?: number
  status?: string
  progress?: number
}

export function useMangaTracker(provider: string | undefined, mangaId: string | undefined) {
  const trackerKey = `${provider}:${mangaId}`

  const getTrackerLinks = (): Record<string, Record<string, TrackerLinkEntry>> => {
    try {
      return JSON.parse(localStorage.getItem(TRACKER_LINKS_KEY) || '{}')
    } catch {
      return {}
    }
  }

  const [trackerLinks, setTrackerLinksState] = useState<Record<string, TrackerLinkEntry>>(
    () => getTrackerLinks()[trackerKey] || {}
  )
  const [showTrackerModal, setShowTrackerModal] = useState<'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null>(null)
  const [trackerSearch, setTrackerSearch] = useState('')
  const [trackerResults, setTrackerResults] = useState<{ id: number; title: string; cover?: string; year?: number; score?: number; status?: string; progress?: number }[]>([])
  const [trackerSearching, setTrackerSearching] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState<'anilist' | 'mal' | 'mangaupdates' | 'shikimori' | 'bangumi' | null>(null)
  const [syncStatus, setSyncStatus] = useState('CURRENT')
  const [syncScore, setSyncScore] = useState(0)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncStartDate, setSyncStartDate] = useState('')
  const [syncEndDate, setSyncEndDate] = useState('')
  const [syncing, setSyncing] = useState(false)

  const openSyncModal = (tracker: typeof showSyncModal) => {
    const link = trackerLinks[tracker!]
    setSyncStatus(link?.status || 'CURRENT')
    setSyncScore(link?.score || 0)
    setSyncProgress(link?.progress || 0)
    setSyncStartDate('')
    setSyncEndDate('')
    setShowSyncModal(tracker)
  }

  const saveTrackerLink = (tracker: string, entry: TrackerLinkEntry) => {
    const all = getTrackerLinks()
    all[trackerKey] = { ...(all[trackerKey] || {}), [tracker]: entry }
    localStorage.setItem(TRACKER_LINKS_KEY, JSON.stringify(all))
    setTrackerLinksState(all[trackerKey])
  }

  const removeTrackerLink = (tracker: string) => {
    const all = getTrackerLinks()
    if (all[trackerKey]) {
      delete all[trackerKey][tracker]
      if (Object.keys(all[trackerKey]).length === 0) delete all[trackerKey]
    }
    localStorage.setItem(TRACKER_LINKS_KEY, JSON.stringify(all))
    setTrackerLinksState(all[trackerKey] || {})
  }

  const handleTrackerSync = async () => {
    if (!showSyncModal) return
    const link = trackerLinks[showSyncModal]
    if (!link) return
    setSyncing(true)
    try {
      if (showSyncModal === 'anilist') {
        const token = localStorage.getItem('anilist-token')
        if (!token) { alert('Log in to AniList first'); setSyncing(false); return }
        await api.post('/auth/anilist/track', {
          access_token: token,
          media_id: link.id,
          status: syncStatus,
          score: syncScore,
          progress: syncProgress,
          start_date: syncStartDate || undefined,
          finish_date: syncEndDate || undefined,
        })
      } else if (showSyncModal === 'mal') {
        const token = localStorage.getItem('mal-token')
        if (!token) { alert('Log in to MAL first'); setSyncing(false); return }
        await api.post('/auth/mal/track', {
          access_token: token,
          manga_id: link.id,
          status: syncStatus.toLowerCase().replace('current', 'reading'),
          chapters_read: syncProgress,
          score: syncScore,
          start_date: syncStartDate || undefined,
          finish_date: syncEndDate || undefined,
        })
      }
      saveTrackerLink(showSyncModal, { ...link, status: syncStatus, score: syncScore, progress: syncProgress })
      setShowSyncModal(null)
    } catch {
      alert('Sync failed. Check your login or try again.')
    }
    setSyncing(false)
  }

  const searchTracker = async (query: string, tracker: string | null) => {
    if (!query.trim() || !tracker) return
    setTrackerSearching(true)
    try {
      if (tracker === 'anilist') {
        const res = await api.get(`/auth/anilist/search?q=${encodeURIComponent(query)}`)
        setTrackerResults(res.data)
      } else if (tracker === 'mal') {
        const token = localStorage.getItem('mal-token')
        if (!token) { alert('Log in to MyAnimeList first in Settings'); setTrackerSearching(false); return }
        const res = await api.get(`/auth/mal/search?q=${encodeURIComponent(query)}&access_token=${token}`)
        setTrackerResults(res.data)
      }
    } catch {
      setTrackerResults([])
    }
    setTrackerSearching(false)
  }

  return {
    trackerLinks, showTrackerModal, setShowTrackerModal,
    trackerSearch, setTrackerSearch, trackerResults, setTrackerResults,
    trackerSearching, searchTracker, showSyncModal, setShowSyncModal,
    syncStatus, setSyncStatus, syncScore, setSyncScore,
    syncProgress, setSyncProgress, syncStartDate, setSyncStartDate,
    syncEndDate, setSyncEndDate, syncing, openSyncModal,
    handleTrackerSync, saveTrackerLink, removeTrackerLink,
  }
}

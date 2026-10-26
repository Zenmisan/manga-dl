/**
 * Offline Cloud Tracker Mutation Queue
 * Buffers and replays AniList & MyAnimeList progress updates when reading offline
 * or encountering transient network timeouts.
 */

import api from './api'

export interface TrackerMutation {
  id: string
  tracker: 'anilist' | 'mal'
  targetId: number | string
  chapterProgress: number
  status?: string
  score?: number
  startDate?: string
  finishDate?: string
  timestamp: number
  attempts: number
  lastAttemptAt?: number
  lastError?: string
}

const DB_NAME = 'manga-dl-trackers'
const STORE_NAME = 'tracker_mutation_queue'

function openTrackerDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'))
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('tracker_target', ['tracker', 'targetId'], { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueTrackerMutation(
  mutation: Omit<TrackerMutation, 'id' | 'timestamp' | 'attempts'>
): Promise<TrackerMutation> {
  const db = await openTrackerDb()
  const all = await getPendingTrackerMutations()

  // Collapse / deduplicate existing pending mutation for the same tracker and media/manga ID
  const existing = all.find(
    (m) => m.tracker === mutation.tracker && String(m.targetId) === String(mutation.targetId)
  )

  const finalMutation: TrackerMutation = {
    ...mutation,
    id: existing ? existing.id : `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    chapterProgress: existing
      ? Math.max(existing.chapterProgress, mutation.chapterProgress)
      : mutation.chapterProgress,
    status: mutation.status || existing?.status || 'reading',
    score: mutation.score ?? existing?.score,
    startDate: mutation.startDate || existing?.startDate,
    finishDate: mutation.finishDate || existing?.finishDate,
    timestamp: Date.now(),
    attempts: 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(finalMutation)
    req.onsuccess = () => resolve(finalMutation)
    req.onerror = () => reject(req.error)
  })
}

export async function getPendingTrackerMutations(): Promise<TrackerMutation[]> {
  try {
    const db = await openTrackerDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function removeTrackerMutation(id: string): Promise<void> {
  try {
    const db = await openTrackerDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Ignore cleanup error
  }
}

export async function incrementMutationAttempt(id: string, errorMsg: string): Promise<void> {
  try {
    const db = await openTrackerDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)

    req.onsuccess = () => {
      const item: TrackerMutation = req.result
      if (!item) return
      item.attempts = (item.attempts || 0) + 1
      item.lastAttemptAt = Date.now()
      item.lastError = errorMsg
      if (item.attempts >= 5) {
        // Drop after 5 failed attempts to prevent queue poisoning
        store.delete(id)
      } else {
        store.put(item)
      }
    }
  } catch {
    // Ignore error
  }
}

export async function executeSingleTrackerSync(item: TrackerMutation): Promise<boolean> {
  if (item.tracker === 'anilist') {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('anilist-token') : null
    if (!token) return false

    const mutation = `mutation ($id: Int, $progress: Int, $status: MediaListStatus, $score: Float) {
      SaveMediaListEntry (mediaId: $id, progress: $progress, status: $status, score: $score) {
        id
        progress
        status
      }
    }`

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: Number(item.targetId),
          progress: item.chapterProgress,
          status: item.status ? item.status.toUpperCase() : 'CURRENT',
          score: item.score,
        },
      }),
    })

    if (!res.ok) {
      throw new Error(`AniList returned HTTP ${res.status}`)
    }
    return true
  }

  if (item.tracker === 'mal') {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mal-token') : null
    if (!token) return false

    const malStatus = (item.status || 'reading').toLowerCase().replace('current', 'reading')
    await api.post('/auth/mal/track', {
      access_token: token,
      manga_id: Number(item.targetId),
      status: malStatus,
      chapters_read: item.chapterProgress,
      score: item.score,
      start_date: item.startDate,
      finish_date: item.finishDate,
    })
    return true
  }

  return false
}

export async function drainTrackerQueue(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  const items = await getPendingTrackerMutations()
  let succeeded = 0
  let failed = 0

  for (const item of items) {
    try {
      const ok = await executeSingleTrackerSync(item)
      if (ok) {
        await removeTrackerMutation(item.id)
        succeeded++
      } else {
        await incrementMutationAttempt(item.id, 'Authentication token missing or invalid')
        failed++
      }
    } catch (err: any) {
      await incrementMutationAttempt(item.id, err?.message || 'Network error')
      failed++
    }
  }

  return { processed: items.length, succeeded, failed }
}

// Auto-drain when the browser goes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    drainTrackerQueue().catch(() => {})
  })
}

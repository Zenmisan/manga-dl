import { clearAllLocalManga, getLocalLibraryStats, clearZipMemoryCache } from './localLibrary'

export interface StorageEstimateInfo {
  usageBytes: number
  quotaBytes: number
  usageFormatted: string
  quotaFormatted: string
  percentUsed: number
  localArchivesBytes: number
  localArchivesFormatted: string
  localArchivesCount: number
  cacheStorageNames: string[]
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export async function getStorageEstimate(): Promise<StorageEstimateInfo> {
  let usageBytes = 0
  let quotaBytes = 0

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      usageBytes = estimate.usage || 0
      quotaBytes = estimate.quota || 0
    } catch {
      // Non-fatal fallback
    }
  }

  const { count, totalSizeBytes } = await getLocalLibraryStats()

  let cacheStorageNames: string[] = []
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      cacheStorageNames = await window.caches.keys()
    } catch {
      // Non-fatal fallback
    }
  }

  const percentUsed = quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0

  return {
    usageBytes,
    quotaBytes,
    usageFormatted: formatBytes(usageBytes),
    quotaFormatted: formatBytes(quotaBytes),
    percentUsed,
    localArchivesBytes: totalSizeBytes,
    localArchivesFormatted: formatBytes(totalSizeBytes),
    localArchivesCount: count,
    cacheStorageNames,
  }
}

/**
 * Deletes all image and chapter caches from CacheStorage API (manga-images, library-images, api-cache)
 * without deleting user subscriptions, auth, bookmarks, or uploaded local archives.
 */
export async function clearImageAndReadingCaches(): Promise<{ clearedCaches: string[] }> {
  const cleared: string[] = []
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const names = await window.caches.keys()
      for (const name of names) {
        await window.caches.delete(name)
        cleared.push(name)
      }
    } catch (err) {
      console.warn('Error clearing CacheStorage:', err)
    }
  }

  // Clear offline chapter markers & API caches in localStorage
  try {
    localStorage.removeItem('manga-dl-offline-cached')
    localStorage.removeItem('cache:library')
    localStorage.removeItem('cache:sources:builtins')
    localStorage.removeItem('cache:sources:market')
    localStorage.removeItem('cache:history')
    // Remove smart context caches
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('smart-ctx:') || k.startsWith('cache:')) {
        localStorage.removeItem(k)
      }
    })
  } catch {
    // Non-fatal
  }

  // Clear in-memory zip cache
  clearZipMemoryCache()

  return { clearedCaches: cleared }
}

/**
 * Deletes all uploaded local archives (.cbz, .zip, .epub) from browser IndexedDB.
 */
export async function clearLocalUploadedArchives(): Promise<void> {
  await clearAllLocalManga()
}

/**
 * 30-day LRU cache eviction policy:
 * Scans CacheStorage and temporary localStorage caches (smart-ctx:*, cache:*, offline chapter markers),
 * purging stale entries older than maxAgeDays (default 30 days) while preserving user library,
 * bookmarks, subscriptions, and active reading progress.
 */
export async function pruneStaleCaches(maxAgeDays = 30): Promise<{ prunedEntriesCount: number }> {
  let prunedCount = 0
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
  const now = Date.now()

  // 1. Prune stale requests from CacheStorage API
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await window.caches.keys()
      for (const name of cacheNames) {
        // We only prune non-essential caches (images, api cache)
        if (name.includes('sw') || name.includes('workbox') || name.includes('precache')) continue
        const cache = await window.caches.open(name)
        const requests = await cache.keys()
        for (const req of requests) {
          const resp = await cache.match(req)
          if (!resp) continue
          const dateHeader = resp.headers.get('date')
          if (dateHeader) {
            const entryTime = new Date(dateHeader).getTime()
            if (!isNaN(entryTime) && now - entryTime > maxAgeMs) {
              await cache.delete(req)
              prunedCount++
            }
          }
        }
      }
    } catch (err) {
      console.warn('[storageManager] Stale CacheStorage prune non-fatal error:', err)
    }
  }

  // 2. Prune ephemeral localStorage caches and smart routing contexts
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith('smart-ctx:') || k.startsWith('cache:')) {
        try {
          const val = localStorage.getItem(k)
          if (val) {
            const parsed = JSON.parse(val)
            const timestamp = parsed.timestamp || parsed.cachedAt || parsed.savedAt
            if (timestamp && typeof timestamp === 'number' && now - timestamp > maxAgeMs) {
              keysToRemove.push(k)
            } else if (!timestamp) {
              // Unversioned ephemeral key older than default cleanup interval
              keysToRemove.push(k)
            }
          }
        } catch {
          keysToRemove.push(k)
        }
      }
    }

    for (const k of keysToRemove) {
      localStorage.removeItem(k)
      prunedCount++
    }

    // 3. Prune stale offline chapter download markers
    const offlineRaw = localStorage.getItem('manga-dl-offline-cached')
    if (offlineRaw) {
      try {
        const offlineMap = JSON.parse(offlineRaw)
        if (typeof offlineMap === 'object' && offlineMap !== null) {
          let modified = false
          for (const [key, val] of Object.entries(offlineMap)) {
            const time = typeof val === 'number' ? val : (val as { timestamp?: number })?.timestamp
            if (time && now - time > maxAgeMs) {
              delete (offlineMap as Record<string, unknown>)[key]
              modified = true
              prunedCount++
            }
          }
          if (modified) {
            localStorage.setItem('manga-dl-offline-cached', JSON.stringify(offlineMap))
          }
        }
      } catch { /* ignore */ }
    }
  } catch (err) {
    console.warn('[storageManager] Stale localStorage prune non-fatal error:', err)
  }

  // Mark last run timestamp
  try {
    localStorage.setItem('manga-dl-last-lru-prune', String(now))
  } catch { /* ignore */ }

  return { prunedEntriesCount: prunedCount }
}

/**
 * Runs a debounced background LRU cache prune on application startup
 * (at most once every 24 hours).
 */
export function runBackgroundAutoPrune(maxAgeDays = 30): void {
  try {
    const lastRun = parseInt(localStorage.getItem('manga-dl-last-lru-prune') || '0', 10)
    const oneDayMs = 24 * 60 * 60 * 1000
    if (Date.now() - lastRun > oneDayMs) {
      // Execute in idle callback or background microtask
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
          pruneStaleCaches(maxAgeDays).catch(() => {})
        })
      } else {
        setTimeout(() => {
          pruneStaleCaches(maxAgeDays).catch(() => {})
        }, 5000)
      }
    }
  } catch { /* ignore */ }
}

/**
 * Nuclear option: Clears both CacheStorage and IndexedDB uploaded archives.
 */
export async function clearAllOfflineStorage(): Promise<void> {
  await clearImageAndReadingCaches()
  await clearLocalUploadedArchives()
}

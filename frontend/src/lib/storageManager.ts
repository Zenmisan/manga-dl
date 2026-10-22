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
 * Nuclear option: Clears both CacheStorage and IndexedDB uploaded archives.
 */
export async function clearAllOfflineStorage(): Promise<void> {
  await clearImageAndReadingCaches()
  await clearLocalUploadedArchives()
}

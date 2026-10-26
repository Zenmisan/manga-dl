import { describe, it, expect, beforeEach } from 'bun:test'

// Polyfill minimal indexedDB and localStorage for Bun runtime tests
const store = new Map<string, any>()
const localStore = new Map<string, string>()

if (typeof (globalThis as any).localStorage === 'undefined') {
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => localStore.get(k) ?? null,
    setItem: (k: string, v: string) => localStore.set(k, String(v)),
    removeItem: (k: string) => localStore.delete(k),
    clear: () => localStore.clear(),
    get length() { return localStore.size },
    key: (i: number) => Array.from(localStore.keys())[i] ?? null,
  }
}
if (typeof (globalThis as any).indexedDB === 'undefined') {
  ;(globalThis as any).indexedDB = {
    open: () => {
      const req: any = {
        result: {
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              put: (entry: any) => {
                store.set(entry.id, entry)
              },
              get: (id: string) => {
                const r: any = {}
                setTimeout(() => {
                  r.result = store.get(id)
                  if (r.onsuccess) r.onsuccess({ target: r })
                }, 0)
                return r
              },
              getAll: () => {
                const r: any = {}
                setTimeout(() => {
                  r.result = Array.from(store.values())
                  if (r.onsuccess) r.onsuccess({ target: r })
                }, 0)
                return r
              },
              delete: (id: string) => {
                store.delete(id)
              },
              clear: () => {
                store.clear()
              },
            }),
            set oncomplete(cb: any) {
              setTimeout(cb, 0)
            },
            set onerror(_cb: any) {},
          }),
        },
        set onsuccess(cb: any) {
          setTimeout(cb, 0)
        },
        set onerror(_cb: any) {},
        set onupgradeneeded(cb: any) {
          setTimeout(cb, 0)
        },
      }
      return req
    },
  }
}

import { formatBytes, getStorageEstimate, clearImageAndReadingCaches, pruneStaleCaches } from './storageManager'
import { saveLocalManga, getAllLocalManga, clearAllLocalManga, deleteLocalMangaBySeries, getLocalLibraryStats } from './localLibrary'

describe('storageManager and localLibrary cleanup', () => {
  beforeEach(async () => {
    store.clear()
    localStorage.clear()
    await clearAllLocalManga()
  })

  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
    expect(formatBytes(1536 * 1024 * 1024)).toBe('1.5 GB')
  })

  it('calculates local library storage stats and clears all local manga', async () => {
    const fakeBlob1 = new Blob(['x'.repeat(5000)], { type: 'application/zip' })
    const fakeBlob2 = new Blob(['y'.repeat(7000)], { type: 'application/zip' })

    await saveLocalManga({
      id: 'local-test-1',
      title: 'Solo Leveling Vol 1',
      seriesTitle: 'Solo Leveling',
      filename: 'solo_01.cbz',
      fileSize: 5000,
      addedAt: Date.now(),
      file: fakeBlob1,
      chaptersCount: 10,
    })

    await saveLocalManga({
      id: 'local-test-2',
      title: 'Solo Leveling Vol 2',
      seriesTitle: 'Solo Leveling',
      filename: 'solo_02.cbz',
      fileSize: 7000,
      addedAt: Date.now() + 100,
      file: fakeBlob2,
      chaptersCount: 10,
    })

    const all = await getAllLocalManga()
    expect(all.length).toBe(2)

    const stats = await getLocalLibraryStats()
    expect(stats.count).toBe(2)
    expect(stats.totalSizeBytes).toBe(12000)

    // Delete by series should delete both sibling archives
    const deletedCount = await deleteLocalMangaBySeries('Solo Leveling')
    expect(deletedCount).toBe(2)

    const afterDelete = await getAllLocalManga()
    expect(afterDelete.length).toBe(0)
  })

  it('returns storage estimate with formatted values', async () => {
    const estimate = await getStorageEstimate()
    expect(typeof estimate.usageBytes).toBe('number')
    expect(typeof estimate.usageFormatted).toBe('string')
    expect(typeof estimate.localArchivesCount).toBe('number')
    expect(typeof estimate.localArchivesFormatted).toBe('string')
  })

  it('clears image and reading caches without throwing', async () => {
    const res = await clearImageAndReadingCaches()
    expect(Array.isArray(res.clearedCaches)).toBe(true)
  })

  it('prunes stale caches and expired ephemeral keys older than 30 days', async () => {
    const now = Date.now()
    const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000
    const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000

    localStorage.setItem('smart-ctx:stale', JSON.stringify({ timestamp: thirtyOneDaysAgo, data: 'old' }))
    localStorage.setItem('smart-ctx:fresh', JSON.stringify({ timestamp: fiveDaysAgo, data: 'new' }))
    localStorage.setItem('cache:stale-search', JSON.stringify({ cachedAt: thirtyOneDaysAgo, results: [] }))
    localStorage.setItem('manga-dl-offline-cached', JSON.stringify({
      'ch-old': thirtyOneDaysAgo,
      'ch-new': fiveDaysAgo,
    }))

    const result = await pruneStaleCaches(30)
    expect(result.prunedEntriesCount).toBeGreaterThanOrEqual(3)
    expect(localStorage.getItem('smart-ctx:stale')).toBeNull()
    expect(localStorage.getItem('smart-ctx:fresh')).not.toBeNull()
    expect(localStorage.getItem('cache:stale-search')).toBeNull()

    const offlineRemains = JSON.parse(localStorage.getItem('manga-dl-offline-cached') || '{}')
    expect(offlineRemains['ch-old']).toBeUndefined()
    expect(offlineRemains['ch-new']).toBeDefined()
  })
})

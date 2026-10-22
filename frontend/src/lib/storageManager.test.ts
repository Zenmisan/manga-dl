import { describe, it, expect, beforeEach } from 'bun:test'

// Polyfill minimal indexedDB for Bun runtime tests
const store = new Map<string, any>()
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

import { formatBytes, getStorageEstimate, clearImageAndReadingCaches } from './storageManager'
import { saveLocalManga, getAllLocalManga, clearAllLocalManga, deleteLocalMangaBySeries, getLocalLibraryStats } from './localLibrary'

describe('storageManager and localLibrary cleanup', () => {
  beforeEach(async () => {
    store.clear()
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
})

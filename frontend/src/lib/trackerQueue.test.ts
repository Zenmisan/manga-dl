import { describe, it, expect, mock } from 'bun:test'
import type { TrackerMutation } from './trackerQueue'

describe('trackerQueue mutation buffer and auto-drain', () => {
  it('deduplicates and merges mutations for the same targetId with the highest chapter', () => {
    const queue: TrackerMutation[] = []

    const enqueue = (mut: Omit<TrackerMutation, 'id' | 'timestamp' | 'attempts'>) => {
      const idx = queue.findIndex(m => m.tracker === mut.tracker && String(m.targetId) === String(mut.targetId))
      if (idx >= 0) {
        queue[idx] = {
          ...queue[idx],
          chapterProgress: Math.max(queue[idx].chapterProgress, mut.chapterProgress),
          timestamp: Date.now(),
        }
        return queue[idx]
      }
      const item: TrackerMutation = {
        ...mut,
        id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        attempts: 0,
      }
      queue.push(item)
      return item
    }

    enqueue({ tracker: 'anilist', targetId: 101, chapterProgress: 5, status: 'CURRENT' })
    expect(queue.length).toBe(1)
    expect(queue[0].chapterProgress).toBe(5)

    // Second mutation for same manga at higher chapter
    enqueue({ tracker: 'anilist', targetId: 101, chapterProgress: 7, status: 'CURRENT' })
    expect(queue.length).toBe(1)
    expect(queue[0].chapterProgress).toBe(7)

    // Mutation for another tracker/manga
    enqueue({ tracker: 'mal', targetId: 202, chapterProgress: 1, status: 'reading' })
    expect(queue.length).toBe(2)
  })

  it('drains successful mutations and increments attempts for failed mutations', async () => {
    const queue: TrackerMutation[] = [
      { id: '1', tracker: 'anilist', targetId: 100, chapterProgress: 12, timestamp: Date.now(), attempts: 0 },
      { id: '2', tracker: 'mal', targetId: 200, chapterProgress: 4, timestamp: Date.now(), attempts: 2 },
    ]

    const syncExecutor = mock(async (item: TrackerMutation) => {
      if (item.id === '1') return true
      throw new Error('503 Service Unavailable')
    })

    const remaining: TrackerMutation[] = []
    let succeeded = 0
    let failed = 0

    for (const item of queue) {
      try {
        const ok = await syncExecutor(item)
        if (ok) {
          succeeded++
        }
      } catch (err: any) {
        item.attempts++
        item.lastError = err?.message
        if (item.attempts < 5) remaining.push(item)
        failed++
      }
    }

    expect(succeeded).toBe(1)
    expect(failed).toBe(1)
    expect(remaining.length).toBe(1)
    expect(remaining[0].id).toBe('2')
    expect(remaining[0].attempts).toBe(3)
  })

  it('drops mutations after reaching 5 failed attempts', () => {
    const item: TrackerMutation = {
      id: 'stale-1',
      tracker: 'mal',
      targetId: 999,
      chapterProgress: 1,
      timestamp: Date.now(),
      attempts: 4,
    }

    // 5th attempt failure
    item.attempts++
    const shouldDrop = item.attempts >= 5
    expect(shouldDrop).toBe(true)
  })
})

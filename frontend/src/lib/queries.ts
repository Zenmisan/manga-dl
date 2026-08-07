import { useQuery } from '@tanstack/react-query'
import api from './api'

// ── Query keys ────────────────────────────────────────────────────────────────

export const QK = {
  library: ['library'] as const,
  libraryStats: ['library', 'stats'] as const,
  libraryManga: (title: string) => ['library', title] as const,
  sources: ['sources'] as const,
  sourcesMarket: ['sources', 'market'] as const,
  mangaUpdates: ['manga', 'updates'] as const,
  mangaDetail: (provider: string, mangaId: string) => ['manga', provider, mangaId] as const,
  mangaSubscription: (provider: string, mangaId: string) => ['subscription', provider, mangaId] as const,
  history: ['history'] as const,
  downloadHistory: ['downloads', 'history'] as const,
}

// ── Per-endpoint stale times (ms) ─────────────────────────────────────────────

const STALE = {
  library: 30_000,        // 30s — changes when downloads complete
  libraryStats: 120_000,  // 2min
  sources: 5 * 60_000,    // 5min — rarely changes
  sourcesMarket: 10 * 60_000,
  updates: 5 * 60_000,
  mangaDetail: 2 * 60_000,
  subscription: 30_000,
  history: 60_000,
  downloadHistory: 15_000,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useLibrary() {
  return useQuery<unknown>({
    queryKey: QK.library,
    queryFn: () => api.get('/library').then(r => r.data),
    staleTime: STALE.library,
  })
}

export function useLibraryStats() {
  return useQuery<unknown>({
    queryKey: QK.libraryStats,
    queryFn: async () => {
      // 1. Try fetching authenticated user's reading stats first
      try {
        const userRes = await api.get('/users/me/stats')
        if (userRes.data && typeof userRes.data === 'object') {
          const d = userRes.data
          return {
            ...d,
            daily_downloads: d.daily_downloads || d.daily_reads || [],
            yearly_downloads: d.yearly_downloads || d.yearly_reads || [],
          }
        }
      } catch {
        // User not logged in or backend endpoint unauthenticated
      }

      // 2. Compute local reading stats for guest / offline users
      try {
        const localReadMap: Record<string, string[]> = JSON.parse(localStorage.getItem('manga-dl-read') || '{}')
        const entries = Object.entries(localReadMap)
        if (entries.length > 0) {
          let totalChapters = 0
          const mangaSet = new Set<string>()
          const providerCount: Record<string, number> = {}

          for (const [key, chs] of entries) {
            const parts = key.split(':')
            const provider = parts[0] || 'local'
            const mangaId = parts.slice(1).join(':')
            mangaSet.add(mangaId)
            totalChapters += chs.length
            providerCount[provider] = (providerCount[provider] || 0) + chs.length
          }

          const providerBreakdown = Object.entries(providerCount).map(([provider, count]) => ({ provider, count }))

          return {
            total_chapters: totalChapters,
            total_manga: mangaSet.size,
            total_pages: totalChapters * 20,
            storage_bytes: 0,
            daily_downloads: [],
            yearly_downloads: [],
            provider_breakdown: providerBreakdown,
            streak_days: totalChapters > 0 ? 1 : 0,
          }
        }
      } catch {
        /* non-fatal */
      }

      // 3. Fallback to server library stats
      const libRes = await api.get('/library/stats')
      const d = libRes.data
      return {
        ...d,
        daily_downloads: d.daily_downloads || d.daily_reads || [],
        yearly_downloads: d.yearly_downloads || d.yearly_reads || [],
      }
    },
    staleTime: STALE.libraryStats,
  })
}

export function useBuiltinSources() {
  return useQuery<unknown>({
    queryKey: QK.sources,
    queryFn: () => api.get('/sources/builtins').then(r => r.data),
    staleTime: STALE.sources,
  })
}

export function useMarketSources() {
  return useQuery<unknown>({
    queryKey: QK.sourcesMarket,
    queryFn: () => api.get('/sources/market').then(r => r.data),
    staleTime: STALE.sourcesMarket,
  })
}

export function useMangaUpdates() {
  return useQuery<unknown>({
    queryKey: QK.mangaUpdates,
    queryFn: () => api.get('/manga/updates').then(r => r.data),
    staleTime: STALE.updates,
  })
}

export function useMangaDetail(provider: string, mangaId: string, enabled = true) {
  return useQuery<unknown>({
    queryKey: QK.mangaDetail(provider, mangaId),
    queryFn: () => api.get(`/manga/${provider}/${encodeURIComponent(mangaId)}`).then(r => r.data),
    staleTime: STALE.mangaDetail,
    enabled: enabled && !!provider && !!mangaId,
  })
}

export function useMangaSubscription(provider: string, mangaId: string, enabled = true) {
  return useQuery<unknown>({
    queryKey: QK.mangaSubscription(provider, mangaId),
    queryFn: () => api.get(`/manga/subscription/${provider}/${mangaId}`).then(r => r.data),
    staleTime: STALE.subscription,
    enabled: enabled && !!provider && !!mangaId,
  })
}

export function useHistory(enabled = true) {
  return useQuery<unknown>({
    queryKey: QK.history,
    queryFn: () => api.get('/users/history').then(r => r.data),
    staleTime: STALE.history,
    enabled,
  })
}

export function useDownloadHistory() {
  return useQuery<unknown>({
    queryKey: QK.downloadHistory,
    queryFn: () => api.get('/downloads/history').then(r => r.data),
    staleTime: STALE.downloadHistory,
  })
}

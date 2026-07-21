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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLibrary() {
  return useQuery<any>({
    queryKey: QK.library,
    queryFn: () => api.get('/library').then(r => r.data),
    staleTime: STALE.library,
  })
}

export function useLibraryStats() {
  return useQuery<any>({
    queryKey: QK.libraryStats,
    queryFn: () => api.get('/library/stats').then(r => r.data),
    staleTime: STALE.libraryStats,
  })
}

export function useBuiltinSources() {
  return useQuery<any>({
    queryKey: QK.sources,
    queryFn: () => api.get('/sources/builtins').then(r => r.data),
    staleTime: STALE.sources,
  })
}

export function useMarketSources() {
  return useQuery<any>({
    queryKey: QK.sourcesMarket,
    queryFn: () => api.get('/sources/market').then(r => r.data),
    staleTime: STALE.sourcesMarket,
  })
}

export function useMangaUpdates() {
  return useQuery<any>({
    queryKey: QK.mangaUpdates,
    queryFn: () => api.get('/manga/updates').then(r => r.data),
    staleTime: STALE.updates,
  })
}

export function useMangaDetail(provider: string, mangaId: string, enabled = true) {
  return useQuery<any>({
    queryKey: QK.mangaDetail(provider, mangaId),
    queryFn: () => api.get(`/manga/${provider}/${encodeURIComponent(mangaId)}`).then(r => r.data),
    staleTime: STALE.mangaDetail,
    enabled: enabled && !!provider && !!mangaId,
  })
}

export function useMangaSubscription(provider: string, mangaId: string, enabled = true) {
  return useQuery<any>({
    queryKey: QK.mangaSubscription(provider, mangaId),
    queryFn: () => api.get(`/manga/subscription/${provider}/${mangaId}`).then(r => r.data),
    staleTime: STALE.subscription,
    enabled: enabled && !!provider && !!mangaId,
  })
}

export function useHistory(enabled = true) {
  return useQuery<any>({
    queryKey: QK.history,
    queryFn: () => api.get('/users/history').then(r => r.data),
    staleTime: STALE.history,
    enabled,
  })
}

export function useDownloadHistory() {
  return useQuery<any>({
    queryKey: QK.downloadHistory,
    queryFn: () => api.get('/downloads/history').then(r => r.data),
    staleTime: STALE.downloadHistory,
  })
}

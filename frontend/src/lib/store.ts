import { create } from 'zustand'

interface MangaResult {
  id: string
  title: string
  cover_url: string | null
  provider: string
  url: string
  status: string | null
  anilist_score?: number
  anilist_url?: string
}

interface AppState {
  // Search State
  searchQuery: string
  searchResults: MangaResult[]
  selectedProvider: string | null
  hasSearched: boolean
  
  setSearchQuery: (query: string) => void
  setSearchResults: (results: MangaResult[]) => void
  setSelectedProvider: (provider: string | null) => void
  setHasSearched: (val: boolean) => void

  // Reader Preferences
  readingMode: 'webtoon' | 'manga'
  setReadingMode: (mode: 'webtoon' | 'manga') => void
}

export const useAppStore = create<AppState>((set) => ({
  searchQuery: '',
  searchResults: [],
  selectedProvider: null,
  hasSearched: false,
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setHasSearched: (val) => set({ hasSearched: val }),

  readingMode: 'webtoon',
  setReadingMode: (mode) => set({ readingMode: mode }),
}))

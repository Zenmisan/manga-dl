import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export interface ReaderFilters {
  brightness: number   // 0.5–1.5, default 1
  contrast: number     // 0.5–1.5, default 1
  grayscale: boolean
  invert: boolean
  sepia: boolean
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
  readingMode: 'webtoon' | 'manga' | 'manga-rtl'
  upscaling: boolean
  readerFilters: ReaderFilters
  imageScale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original'
  setReadingMode: (mode: 'webtoon' | 'manga' | 'manga-rtl') => void
  setUpscaling: (val: boolean) => void
  setReaderFilters: (filters: Partial<ReaderFilters>) => void
  resetReaderFilters: () => void
  setImageScale: (scale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original') => void

  // Privacy
  incognitoMode: boolean
  setIncognitoMode: (val: boolean) => void
}

const defaultFilters: ReaderFilters = {
  brightness: 1,
  contrast: 1,
  grayscale: false,
  invert: false,
  sepia: false,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      searchQuery: '',
      searchResults: [],
      selectedProvider: null,
      hasSearched: false,
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      setHasSearched: (val) => set({ hasSearched: val }),

      readingMode: 'webtoon',
      upscaling: false,
      readerFilters: defaultFilters,
      imageScale: 'fit-screen',
      setReadingMode: (mode) => set({ readingMode: mode }),
      setUpscaling: (val) => set({ upscaling: val }),
      setReaderFilters: (filters) =>
        set((state) => ({ readerFilters: { ...state.readerFilters, ...filters } })),
      resetReaderFilters: () => set({ readerFilters: defaultFilters }),
      setImageScale: (scale) => set({ imageScale: scale }),

      incognitoMode: false,
      setIncognitoMode: (val) => set({ incognitoMode: val }),
    }),
    {
      name: 'manga-dl-prefs',
      partialize: (state) => ({
        readingMode: state.readingMode,
        upscaling: state.upscaling,
        readerFilters: state.readerFilters,
        imageScale: state.imageScale,
        incognitoMode: state.incognitoMode,
      }),
    }
  )
)

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

export type TapZoneLayout = 'default' | 'l-nav' | 'edge' | 'disabled'
export type AppTheme = 'dark' | 'light' | 'system'

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
  readingMode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager'
  upscaling: boolean
  readerFilters: ReaderFilters
  imageScale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original'
  skipReadChapters: boolean
  cropBorders: boolean
  dualPageSpread: 'auto' | 'on' | 'off'
  tapZoneLayout: TapZoneLayout
  setReadingMode: (mode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager') => void
  setUpscaling: (val: boolean) => void
  setReaderFilters: (filters: Partial<ReaderFilters>) => void
  resetReaderFilters: () => void
  setImageScale: (scale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original') => void
  setSkipReadChapters: (val: boolean) => void
  setCropBorders: (val: boolean) => void
  setDualPageSpread: (val: 'auto' | 'on' | 'off') => void
  setTapZoneLayout: (val: TapZoneLayout) => void

  // Appearance
  theme: AppTheme
  amoledBlack: boolean
  setTheme: (val: AppTheme) => void
  setAmoledBlack: (val: boolean) => void

  // Privacy
  incognitoMode: boolean
  setIncognitoMode: (val: boolean) => void

  // Android native
  hapticFeedback: boolean
  setHapticFeedback: (val: boolean) => void

  // Grid / layout
  gridColumns: number
  setGridColumns: (val: number) => void

  // Webtoon
  webtoonSidePadding: number
  setWebtoonSidePadding: (val: number) => void
  cropBordersWebtoon: boolean
  setCropBordersWebtoon: (val: boolean) => void

  // Auto-backup
  autoBackupEnabled: boolean
  autoBackupInterval: 'daily' | 'weekly'
  setAutoBackupEnabled: (val: boolean) => void
  setAutoBackupInterval: (val: 'daily' | 'weekly') => void

  // Sync gates
  syncWifiOnly: boolean
  syncChargingOnly: boolean
  setSyncWifiOnly: (val: boolean) => void
  setSyncChargingOnly: (val: boolean) => void
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
      skipReadChapters: false,
      cropBorders: false,
      dualPageSpread: 'auto',
      tapZoneLayout: 'default',
      setReadingMode: (mode) => set({ readingMode: mode }),
      setUpscaling: (val) => set({ upscaling: val }),
      setReaderFilters: (filters) =>
        set((state) => ({ readerFilters: { ...state.readerFilters, ...filters } })),
      resetReaderFilters: () => set({ readerFilters: defaultFilters }),
      setImageScale: (scale) => set({ imageScale: scale }),
      setSkipReadChapters: (val) => set({ skipReadChapters: val }),
      setCropBorders: (val) => set({ cropBorders: val }),
      setDualPageSpread: (val) => set({ dualPageSpread: val }),
      setTapZoneLayout: (val) => set({ tapZoneLayout: val }),

      theme: 'dark',
      amoledBlack: false,
      setTheme: (val) => set({ theme: val }),
      setAmoledBlack: (val) => set({ amoledBlack: val }),

      incognitoMode: false,
      setIncognitoMode: (val) => set({ incognitoMode: val }),

      hapticFeedback: true,
      setHapticFeedback: (val) => set({ hapticFeedback: val }),

      gridColumns: 3,
      setGridColumns: (val) => set({ gridColumns: val }),

      webtoonSidePadding: 0,
      setWebtoonSidePadding: (val) => set({ webtoonSidePadding: val }),
      cropBordersWebtoon: false,
      setCropBordersWebtoon: (val) => set({ cropBordersWebtoon: val }),

      autoBackupEnabled: false,
      autoBackupInterval: 'weekly',
      setAutoBackupEnabled: (val) => set({ autoBackupEnabled: val }),
      setAutoBackupInterval: (val) => set({ autoBackupInterval: val }),
    }),
    {
      name: 'manga-dl-prefs',
      partialize: (state) => ({
        readingMode: state.readingMode,
        upscaling: state.upscaling,
        readerFilters: state.readerFilters,
        imageScale: state.imageScale,
        incognitoMode: state.incognitoMode,
        skipReadChapters: state.skipReadChapters,
        cropBorders: state.cropBorders,
        dualPageSpread: state.dualPageSpread,
        tapZoneLayout: state.tapZoneLayout,
        theme: state.theme,
        amoledBlack: state.amoledBlack,
        hapticFeedback: state.hapticFeedback,
        gridColumns: state.gridColumns,
        webtoonSidePadding: state.webtoonSidePadding,
        cropBordersWebtoon: state.cropBordersWebtoon,
        autoBackupEnabled: state.autoBackupEnabled,
        autoBackupInterval: state.autoBackupInterval,
      }),
    }
  )
)

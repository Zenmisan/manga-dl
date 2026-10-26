import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export interface ReaderFilters {
  brightness: number
  contrast: number
  grayscale: boolean
  invert: boolean
  sepia: boolean
}

export interface ReaderKeybindingParams {
  readingMode: string
  readingDirection?: 'ltr' | 'rtl'
  volumeKeyMode: 'navigation' | 'brightness'
  readerFilters: ReaderFilters
  setReaderFilters: (partial: Partial<ReaderFilters>) => void
  pagesLength: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  prevPage: (e?: React.MouseEvent) => void
  nextPage: (e?: React.MouseEvent) => void
  onExit?: () => void
  onNextChapter?: () => void
  onPrevChapter?: () => void
  onToggleUi?: () => void
  onToggleShortcuts?: () => void
}

export function handleReaderKeydown(
  e: KeyboardEvent,
  params: {
    readingMode: string
    readingDirection?: 'ltr' | 'rtl'
    volumeKeyMode?: 'navigation' | 'brightness'
    readerFilters?: ReaderFilters
    setReaderFilters?: (partial: Partial<ReaderFilters>) => void
    prevPage: () => void
    nextPage: () => void
    onExit?: () => void
    onNextChapter?: () => void
    onPrevChapter?: () => void
    onToggleUi?: () => void
    onToggleShortcuts?: () => void
  }
) {
  const target = e.target as HTMLElement | null
  const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || (target as any)?.isContentEditable

  if (e.key === 'Escape') {
    e.preventDefault?.()
    params.onExit?.()
    return
  }

  if (isInput) return

  const isRtl = params.readingDirection === 'rtl' || params.readingMode === 'manga-rtl'
  const isScrollMode = params.readingMode === 'webtoon' || params.readingMode === 'vertical-pager'

  if (e.ctrlKey && e.key === 'ArrowRight') {
    e.preventDefault?.()
    params.onNextChapter?.()
  } else if (e.ctrlKey && e.key === 'ArrowLeft') {
    e.preventDefault?.()
    params.onPrevChapter?.()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: 350, behavior: 'smooth' })
    } else if (isRtl) {
      params.prevPage()
    } else {
      params.nextPage()
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: -350, behavior: 'smooth' })
    } else if (isRtl) {
      params.nextPage()
    } else {
      params.prevPage()
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: 350, behavior: 'smooth' })
    } else {
      params.nextPage()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: -350, behavior: 'smooth' })
    } else {
      params.prevPage()
    }
  } else if (e.code === 'Space') {
    e.preventDefault?.()
    if (e.shiftKey) {
      if (isScrollMode) {
        if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: -450, behavior: 'smooth' })
      } else {
        params.prevPage()
      }
    } else {
      if (isScrollMode) {
        if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: 450, behavior: 'smooth' })
      } else {
        params.nextPage()
      }
    }
  } else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: 350, behavior: 'smooth' })
    } else if (isRtl) {
      params.prevPage()
    } else {
      params.nextPage()
    }
  } else if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: -350, behavior: 'smooth' })
    } else if (isRtl) {
      params.nextPage()
    } else {
      params.prevPage()
    }
  } else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: 350, behavior: 'smooth' })
    } else {
      params.nextPage()
    }
  } else if ((e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault?.()
    if (isScrollMode) {
      if (typeof window !== 'undefined' && window.scrollBy) window.scrollBy({ top: -350, behavior: 'smooth' })
    } else {
      params.prevPage()
    }
  } else if ((e.key === 'm' || e.key === 'M' || e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault?.()
    params.onToggleUi?.()
  } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault?.()
    params.onToggleShortcuts?.()
  } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault?.()
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch?.(() => {})
      } else {
        document.exitFullscreen?.().catch?.(() => {})
      }
    }
  } else if (e.key === 'VolumeDown') {
    e.preventDefault?.()
    if (params.volumeKeyMode === 'navigation') {
      if (params.readingMode !== 'webtoon') params.nextPage()
    } else if (params.readerFilters && params.setReaderFilters) {
      params.setReaderFilters({ brightness: Math.max(0.3, params.readerFilters.brightness - 0.1) })
    }
  } else if (e.key === 'VolumeUp') {
    e.preventDefault?.()
    if (params.volumeKeyMode === 'navigation') {
      if (params.readingMode !== 'webtoon') params.prevPage()
    } else if (params.readerFilters && params.setReaderFilters) {
      params.setReaderFilters({ brightness: Math.min(2, params.readerFilters.brightness + 0.1) })
    }
  }
}

export function useReaderKeybindings({
  readingMode,
  readingDirection,
  volumeKeyMode,
  readerFilters,
  setReaderFilters,
  pagesLength: _pagesLength,
  setCurrentPage: _setCurrentPage,
  prevPage,
  nextPage,
  onExit,
  onNextChapter,
  onPrevChapter,
  onToggleUi,
  onToggleShortcuts,
}: ReaderKeybindingParams) {
  // Native Volume keys (Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || readingMode === 'webtoon') return
    import('../lib/volumeKeys').then(({ VolumeKeys }) => {
      VolumeKeys.enable()
      const upSub = VolumeKeys.addListener('volumeUp', () => prevPage())
      const downSub = VolumeKeys.addListener('volumeDown', () => nextPage())
      return () => {
        VolumeKeys.disable()
        upSub.then(h => h.remove())
        downSub.then(h => h.remove())
      }
    }).catch(() => {})
  }, [readingMode, prevPage, nextPage])

  // Keyboard navigation
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      handleReaderKeydown(e, {
        readingMode,
        readingDirection,
        volumeKeyMode,
        readerFilters,
        setReaderFilters,
        prevPage: () => prevPage(),
        nextPage: () => nextPage(),
        onExit,
        onNextChapter,
        onPrevChapter,
        onToggleUi,
        onToggleShortcuts,
      })
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [
    readingMode,
    readingDirection,
    volumeKeyMode,
    readerFilters,
    setReaderFilters,
    prevPage,
    nextPage,
    onExit,
    onNextChapter,
    onPrevChapter,
    onToggleUi,
    onToggleShortcuts,
  ])
}

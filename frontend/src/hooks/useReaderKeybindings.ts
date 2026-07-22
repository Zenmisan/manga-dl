import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

interface ReaderFilters {
  brightness: number
  contrast: number
  grayscale: boolean
  invert: boolean
  sepia: boolean
}

interface Params {
  readingMode: string
  volumeKeyMode: 'navigation' | 'brightness'
  readerFilters: ReaderFilters
  setReaderFilters: (partial: Partial<ReaderFilters>) => void
  pagesLength: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  prevPage: (e?: React.MouseEvent) => void
  nextPage: (e?: React.MouseEvent) => void
  onExit?: () => void
}

export function useReaderKeybindings({
  readingMode, volumeKeyMode, readerFilters, setReaderFilters,
  pagesLength, setCurrentPage, prevPage, nextPage, onExit,
}: Params) {
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
      if (e.key === 'Escape') {
        e.preventDefault()
        onExit?.()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (readingMode !== 'webtoon') setCurrentPage(p => Math.min(p + 1, pagesLength))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (readingMode !== 'webtoon') setCurrentPage(p => Math.max(p - 1, 1))
      } else if (e.key === 'VolumeDown') {
        e.preventDefault()
        if (volumeKeyMode === 'navigation') {
          if (readingMode !== 'webtoon') setCurrentPage(p => Math.min(p + 1, pagesLength))
        } else {
          setReaderFilters({ brightness: Math.max(0.3, readerFilters.brightness - 0.1) })
        }
      } else if (e.key === 'VolumeUp') {
        e.preventDefault()
        if (volumeKeyMode === 'navigation') {
          if (readingMode !== 'webtoon') setCurrentPage(p => Math.max(p - 1, 1))
        } else {
          setReaderFilters({ brightness: Math.min(2, readerFilters.brightness + 0.1) })
        }
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [readingMode, pagesLength, volumeKeyMode, readerFilters.brightness, setCurrentPage, setReaderFilters, onExit])
}

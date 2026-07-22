import { useState, useEffect, useCallback } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { getReadChapters } from '../lib/readTracking'
import { buildSmartReadUrl } from '../lib/smartUrl'
import type { OnlineParts } from './useReaderData'
import { useReaderKeybindings } from './useReaderKeybindings'

interface ReaderFilters {
  brightness: number
  contrast: number
  grayscale: boolean
  invert: boolean
  sepia: boolean
}

interface Params {
  pages: string[]
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  readingMode: string
  dualPageSpread: string
  tapZoneLayout: string
  hapticFeedback: boolean
  skipReadChapters: boolean
  onlinePartsRef: React.MutableRefObject<OnlineParts | null>
  chapterListRef: React.MutableRefObject<{ id: string; number?: number }[]>
  nextChapterId: string | null
  navigate: NavigateFunction
  readerFilters: ReaderFilters
  setReaderFilters: (partial: Partial<ReaderFilters>) => void
}

export function useReaderNavigation({
  pages, currentPage, setCurrentPage,
  readingMode, dualPageSpread, tapZoneLayout, hapticFeedback, skipReadChapters,
  onlinePartsRef, chapterListRef, nextChapterId, navigate,
  readerFilters, setReaderFilters,
}: Params) {
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight)
  const [volumeKeyMode, setVolumeKeyMode] = useState<'navigation' | 'brightness'>('navigation')

  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const spreadActive = dualPageSpread === 'on' || (dualPageSpread === 'auto' && isLandscape)
  const pagerMode = readingMode === 'manga' || readingMode === 'manga-rtl' || readingMode === 'vertical-pager'
  const showSpread = spreadActive && pagerMode && readingMode !== 'vertical-pager'
  const spreadPage2Idx = showSpread ? currentPage : -1

  const tapZoneLeft = tapZoneLayout === 'l-nav' ? 'w-1/2' : tapZoneLayout === 'edge' ? 'w-[15%]' : tapZoneLayout === 'disabled' ? 'w-0' : 'w-1/3'
  const tapZoneRight = tapZoneLayout === 'l-nav' ? 'w-1/2' : tapZoneLayout === 'edge' ? 'w-[15%]' : tapZoneLayout === 'disabled' ? 'w-0' : 'w-1/3'

  const triggerHaptic = useCallback(() => {
    if (Capacitor.isNativePlatform() && hapticFeedback) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    }
  }, [hapticFeedback])

  const nextPage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    const step = showSpread ? 2 : 1
    if (currentPage < pages.length) { triggerHaptic(); setCurrentPage(prev => Math.min(prev + step, pages.length)) }
  }, [currentPage, pages.length, showSpread, triggerHaptic, setCurrentPage])

  const prevPage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    const step = showSpread ? 2 : 1
    if (currentPage > 1) { triggerHaptic(); setCurrentPage(prev => Math.max(prev - step, 1)) }
  }, [currentPage, showSpread, triggerHaptic, setCurrentPage])

  const getNextUnreadChapterId = useCallback((): string | null => {
    const parts = onlinePartsRef.current
    if (!parts || !skipReadChapters) return nextChapterId
    const readSet = getReadChapters(parts.provider, parts.mangaId)
    const chapters = chapterListRef.current
    const currentIdx = chapters.findIndex(c => c.id === parts.chapterId)
    for (let i = currentIdx + 1; i < chapters.length; i++) {
      if (!readSet.has(chapters[i].id)) return chapters[i].id
    }
    return null
  }, [nextChapterId, skipReadChapters, onlinePartsRef, chapterListRef])

  const navigateToNextChapter = useCallback(() => {
    const parts = onlinePartsRef.current
    if (!parts) return
    const targetId = getNextUnreadChapterId()
    if (!targetId) return
    navigate(buildSmartReadUrl(parts.provider, parts.mangaId, targetId, parts.mangaTitle ?? 'manga', 'Next Chapter'))
  }, [navigate, getNextUnreadChapterId, onlinePartsRef])

  const nextUnreadChapterId = getNextUnreadChapterId()

  // Keybindings sub-hook
  useReaderKeybindings({
    readingMode, volumeKeyMode, readerFilters, setReaderFilters,
    pagesLength: pages.length, setCurrentPage, prevPage, nextPage,
  })

  return {
    nextPage, prevPage,
    tapZoneLeft, tapZoneRight,
    showSpread, spreadPage2Idx,
    isLandscape,
    nextUnreadChapterId,
    navigateToNextChapter,
    volumeKeyMode, setVolumeKeyMode,
  }
}

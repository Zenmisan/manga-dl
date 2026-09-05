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
  chapterListRef: React.MutableRefObject<{ id: string; number?: number; title?: string }[]>
  nextChapterId: string | null
  prevChapterId: string | null
  mangaTitle: string | undefined
  navigate: NavigateFunction
  readerFilters: ReaderFilters
  setReaderFilters: (partial: Partial<ReaderFilters>) => void
  isWidePage: boolean[]
}

export function useReaderNavigation({
  pages, currentPage, setCurrentPage,
  readingMode, dualPageSpread, tapZoneLayout, hapticFeedback, skipReadChapters,
  onlinePartsRef, chapterListRef, nextChapterId, prevChapterId, mangaTitle, navigate,
  readerFilters, setReaderFilters, isWidePage,
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
  // Suppress spread if either paired page is a wide/splash image (auto-detected from naturalWidth > naturalHeight)
  const page1Wide = isWidePage[currentPage - 1] ?? false
  const page2Wide = isWidePage[currentPage] ?? false
  const showSpread = spreadActive && pagerMode && readingMode !== 'vertical-pager' && !page1Wide && !page2Wide
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
    // Chapters are newest-first (descending) — next unread = walk toward lower indices
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (!readSet.has(chapters[i].id)) return chapters[i].id
    }
    return null
  }, [nextChapterId, skipReadChapters, onlinePartsRef, chapterListRef])

  const navigateToNextChapter = useCallback(() => {
    const targetId = getNextUnreadChapterId()
    if (!targetId) return
    const parts = onlinePartsRef.current
    if (parts && parts.provider !== 'local') {
      const chapters = chapterListRef.current
      const targetChapter = chapters.find(c => c.id === targetId)
      navigate(buildSmartReadUrl(parts.provider, parts.mangaId, targetId, parts.mangaTitle ?? 'manga', targetChapter?.title ?? targetId))
    } else if (mangaTitle === 'local' || parts?.provider === 'local') {
      // Compound IDs (archiveId:chapterId) navigate directly; simple IDs get the current archive prefixed
      if (targetId.includes(':')) {
        navigate(`/read/local/${targetId}`)
      } else {
        navigate(`/read/local/${parts?.mangaId ?? encodeURIComponent(targetId)}:${targetId}`)
      }
    }
    // parts is null and not local — cannot build a valid ctx URL; bail out
  }, [navigate, getNextUnreadChapterId, onlinePartsRef, chapterListRef, mangaTitle])

  const navigateToPrevChapter = useCallback(() => {
    if (!prevChapterId) return
    const parts = onlinePartsRef.current
    if (parts && parts.provider !== 'local') {
      const chapters = chapterListRef.current
      const targetChapter = chapters.find(c => c.id === prevChapterId)
      navigate(buildSmartReadUrl(parts.provider, parts.mangaId, prevChapterId, parts.mangaTitle ?? 'manga', targetChapter?.title ?? prevChapterId))
    } else if (mangaTitle === 'local' || parts?.provider === 'local') {
      if (prevChapterId.includes(':')) {
        navigate(`/read/local/${prevChapterId}`)
      } else {
        navigate(`/read/local/${parts?.mangaId ?? encodeURIComponent(prevChapterId)}:${prevChapterId}`)
      }
    }
  }, [navigate, prevChapterId, mangaTitle, onlinePartsRef, chapterListRef])

  // eslint-disable-next-line react-hooks/refs
  const nextUnreadChapterId = getNextUnreadChapterId()

  // Keybindings sub-hook
  useReaderKeybindings({
    readingMode, volumeKeyMode, readerFilters, setReaderFilters,
    pagesLength: pages.length, setCurrentPage, prevPage, nextPage,
    onExit: () => navigate(-1),
    onNextChapter: navigateToNextChapter,
    onPrevChapter: navigateToPrevChapter,
  })

  return {
    nextPage, prevPage,
    tapZoneLeft, tapZoneRight,
    showSpread, spreadPage2Idx,
    isLandscape,
    nextUnreadChapterId,
    navigateToNextChapter,
    navigateToPrevChapter,
    volumeKeyMode, setVolumeKeyMode,
  }
}

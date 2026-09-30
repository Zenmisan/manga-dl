import { useState, useEffect, useCallback, useMemo } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { getReadChapters } from '../lib/readTracking'
import { buildSmartReadUrl } from '../lib/smartUrl'
import type { OnlineParts } from './useReaderData'
import { useReaderKeybindings } from './useReaderKeybindings'

export interface DisplaySlot {
  type: 'single' | 'pair' | 'wide'
  page1: number  // 1-based source page index (primary / left for LTR / right for RTL)
  page2?: number // 1-based, only for 'pair'
}

// Compute the display slot list for a chapter.
// Spread mode: page 1 always shown alone (cover); subsequent non-wide pages paired; wide pages shown alone.
// Single mode: every page is its own slot.
function buildDisplaySlots(pageCount: number, isWidePage: boolean[], spreadEnabled: boolean): DisplaySlot[] {
  if (!spreadEnabled || pageCount === 0) {
    return Array.from({ length: pageCount }, (_, i) => ({ type: 'single' as const, page1: i + 1 }))
  }
  const slots: DisplaySlot[] = []
  let i = 0
  while (i < pageCount) {
    const wide = isWidePage[i] ?? false
    if (wide) {
      slots.push({ type: 'wide', page1: i + 1 })
      i++
    } else if (slots.length === 0) {
      // Cover page always shown alone
      slots.push({ type: 'single', page1: i + 1 })
      i++
    } else if (i + 1 < pageCount && !(isWidePage[i + 1] ?? false)) {
      slots.push({ type: 'pair', page1: i + 1, page2: i + 2 })
      i += 2
    } else {
      slots.push({ type: 'single', page1: i + 1 })
      i++
    }
  }
  return slots
}

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
  onExit?: () => void
}

export function useReaderNavigation({
  pages, currentPage, setCurrentPage,
  readingMode, dualPageSpread, tapZoneLayout, hapticFeedback, skipReadChapters,
  onlinePartsRef, chapterListRef, nextChapterId, prevChapterId, mangaTitle, navigate,
  readerFilters, setReaderFilters, isWidePage, onExit,
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
  const spreadEnabled = spreadActive && pagerMode && readingMode !== 'vertical-pager'

  // Slot-based page model — eliminates step=2 navigation and pairing parity bugs.
  // Each slot is one "screen": single page, a spread pair, or a wide/splash image shown alone.
  // Navigation always steps 1 slot; currentPage (1-based src index) is the source of truth.
  const displaySlots = useMemo(
    () => buildDisplaySlots(pages.length, isWidePage, spreadEnabled),
    [pages.length, isWidePage, spreadEnabled]
  )

  const currentSlotIdx = useMemo(() => {
    const idx = displaySlots.findIndex(s => s.page1 === currentPage || s.page2 === currentPage)
    return idx >= 0 ? idx : 0
  }, [displaySlots, currentPage])

  const currentSlot = displaySlots[currentSlotIdx] ?? { type: 'single' as const, page1: currentPage }

  const tapZoneLeft = tapZoneLayout === 'l-nav' ? 'w-1/2' : tapZoneLayout === 'edge' ? 'w-[15%]' : tapZoneLayout === 'disabled' ? 'w-0' : 'w-1/3'
  const tapZoneRight = tapZoneLayout === 'l-nav' ? 'w-1/2' : tapZoneLayout === 'edge' ? 'w-[15%]' : tapZoneLayout === 'disabled' ? 'w-0' : 'w-1/3'

  const triggerHaptic = useCallback(() => {
    if (Capacitor.isNativePlatform() && hapticFeedback) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    }
  }, [hapticFeedback])

  const nextPage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    const nextIdx = currentSlotIdx + 1
    if (nextIdx < displaySlots.length) {
      triggerHaptic()
      setCurrentPage(displaySlots[nextIdx].page1)
    }
  }, [currentSlotIdx, displaySlots, triggerHaptic, setCurrentPage])

  const prevPage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    const prevIdx = currentSlotIdx - 1
    if (prevIdx >= 0) {
      triggerHaptic()
      setCurrentPage(displaySlots[prevIdx].page1)
    }
  }, [currentSlotIdx, displaySlots, triggerHaptic, setCurrentPage])

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
    onExit: onExit || (() => navigate(-1)),
    onNextChapter: navigateToNextChapter,
    onPrevChapter: navigateToPrevChapter,
  })

  return {
    nextPage, prevPage,
    tapZoneLeft, tapZoneRight,
    currentSlot,
    isLandscape,
    nextUnreadChapterId,
    navigateToNextChapter,
    navigateToPrevChapter,
    volumeKeyMode, setVolumeKeyMode,
  }
}

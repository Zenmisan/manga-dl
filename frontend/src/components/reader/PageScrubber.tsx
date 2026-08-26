import { useEffect, useRef, memo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  pages: string[]
  currentPage: number
  setCurrentPage: (n: number) => void
  getImageUrl: (pageName: string) => string
  show: boolean
  readingMode: string
}

const THUMB_W = 36
const THUMB_H = 52
const THUMB_W_ACTIVE = 42
const THUMB_H_ACTIVE = 60

export const PageScrubber = memo(function PageScrubber({
  pages, currentPage, setCurrentPage, getImageUrl, show, readingMode,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Webtoon: no discrete pages, no scrubber
  if (readingMode === 'webtoon') return null

  const useFilmstrip = isDesktop && pages.length <= 60

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const getPageFromClientX = useCallback((clientX: number): number => {
    const rail = railRef.current
    if (!rail) return currentPage
    const rect = rail.getBoundingClientRect()
    const relX = clientX - rect.left + rail.scrollLeft
    // Each slot is roughly THUMB_W + gap(4)
    const slotW = THUMB_W + 4
    const idx = Math.floor(relX / slotW)
    return Math.max(1, Math.min(pages.length, idx + 1))
  }, [currentPage, pages.length])

  // Auto-scroll so current thumb stays centred in the rail
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const slotW = THUMB_W + 4
    const target = (currentPage - 1) * slotW - rail.clientWidth / 2 + THUMB_W / 2
    rail.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [currentPage])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    railRef.current?.setPointerCapture(e.pointerId)
    setCurrentPage(getPageFromClientX(e.clientX))
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    setCurrentPage(getPageFromClientX(e.clientX))
  }

  const onPointerUp = () => { isDragging.current = false }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setCurrentPage(Math.max(1, currentPage - 1))
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setCurrentPage(Math.min(pages.length, currentPage + 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCurrentPage(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCurrentPage(pages.length)
    }
  }

  return (
    <AnimatePresence>
      {show && pages.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
          style={{ bottom: '5rem' }}
          aria-hidden={!show}
        >
          {useFilmstrip ? (
            /* Desktop filmstrip — ≤60 pages */
            <div
              ref={railRef}
              role="slider"
              tabIndex={0}
              aria-label="Page scrubber"
              aria-valuemin={1}
              aria-valuemax={pages.length}
              aria-valuenow={currentPage}
              aria-valuetext={`Page ${currentPage} of ${pages.length}`}
              className="flex items-end gap-1 overflow-x-auto py-2 px-3 rounded-2xl pointer-events-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black outline-none"
              style={{
                maxWidth: 'min(100%, 560px)',
                background: 'rgba(8,8,8,0.88)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              {pages.map((page, idx) => {
                const pageNum = idx + 1
                const isCurrent = pageNum === currentPage
                return (
                  <div
                    key={page}
                    className="flex-shrink-0 relative"
                    style={{
                      width: isCurrent ? THUMB_W_ACTIVE : THUMB_W,
                      height: isCurrent ? THUMB_H_ACTIVE : THUMB_H,
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: isCurrent
                        ? '2px solid rgba(220,38,38,0.9)'
                        : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: isCurrent ? '0 0 10px rgba(220,38,38,0.35)' : undefined,
                      background: 'rgba(255,255,255,0.04)',
                      transition: 'width 0.15s ease, height 0.15s ease, border-color 0.15s ease',
                      alignSelf: 'flex-end',
                    }}
                  >
                    <img
                      src={getImageUrl(page)}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', display: 'block', userSelect: 'none' }}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 text-center"
                      style={{ fontSize: 7, fontWeight: 900, color: isCurrent ? '#fff' : 'rgba(255,255,255,0.35)', background: isCurrent ? 'rgba(220,38,38,0.7)' : 'rgba(0,0,0,0.55)', padding: '1px 0 2px', lineHeight: 1.4 }}
                    >
                      {pageNum}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Mobile / large chapter — range scrubber */
            <div
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(8,8,8,0.88)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', width: '100%', maxWidth: 400 }}
            >
              <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
                {currentPage}
              </span>
              <input
                type="range"
                min={1}
                max={pages.length}
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                onKeyDown={onKeyDown}
                aria-label={`Page ${currentPage} of ${pages.length}`}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                style={{ accentColor: '#dc2626', background: `linear-gradient(to right, #dc2626 ${((currentPage - 1) / (pages.length - 1)) * 100}%, rgba(255,255,255,0.15) 0%)` }}
              />
              <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>
                {pages.length}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
})

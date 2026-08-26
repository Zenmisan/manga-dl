import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SourceSwimlaneProps {
  title: string
  providerId?: string
  count?: number
  isTopMatches?: boolean
  children: React.ReactNode
  onViewAll?: () => void
}

export function SourceSwimlane({
  title,
  count,
  isTopMatches = false,
  children,
  onViewAll,
}: SourceSwimlaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    // Recheck after child images load / render
    const timer = setTimeout(checkScroll, 300)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      clearTimeout(timer)
    }
  }, [checkScroll, children])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = Math.max(el.clientWidth * 0.75, 320)
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative group/lane mb-7">
      {/* Swimlane Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {isTopMatches ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] font-black text-xs uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Top Matches</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[var(--fg)] tracking-tight">
                {title}
              </span>
              {count !== undefined && (
                <span className="text-[11px] font-bold text-[var(--muted3)] bg-[var(--surface2)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                  {count}
                </span>
              )}
            </div>
          )}
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-[11px] font-extrabold text-[var(--muted2)] hover:text-[var(--accent)] transition-colors cursor-pointer"
          >
            View All →
          </button>
        )}
      </div>

      {/* Swimlane Container & Desktop Side Buttons */}
      <div className="relative">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-12 flex items-center justify-center",
              "bg-black/70 hover:bg-black/90 text-white rounded-r-xl backdrop-blur-md border-r border-y border-white/20 shadow-xl",
              "transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
            )}
            title="Scroll left"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Scroll Track */}
        <div
          ref={scrollRef}
          className="flex gap-3.5 overflow-x-auto scrollbar-none py-1 px-1 snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth' }}
        >
          {children}
        </div>

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-12 flex items-center justify-center",
              "bg-black/70 hover:bg-black/90 text-white rounded-l-xl backdrop-blur-md border-l border-y border-white/20 shadow-xl",
              "transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
            )}
            title="Scroll right"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

interface MangaResult {
  id: string
  title: string
  cover_url: string | null
  provider: string
  url: string
  status: string | null
}

interface DiscoverySwimlaneProps {
  title: string
  items: MangaResult[]
  loading?: boolean
  browseHref: string
  renderCard: (r: MangaResult, idx: number) => React.ReactNode
}

const MAX_ARROW_CLICKS = 3

function Skeleton() {
  return (
    <div style={{ width: 110, flexShrink: 0 }}>
      <motion.div animate={{ opacity: [0.4, 0.65, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 110, height: 155, borderRadius: 10, background: 'var(--surface)' }} />
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        style={{ marginTop: 6, height: 12, borderRadius: 4, background: 'var(--surface)', width: '80%' }} />
      <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        style={{ marginTop: 4, height: 10, borderRadius: 4, background: 'var(--surface)', width: '55%' }} />
    </div>
  )
}

export function DiscoverySwimlane({ title, items, loading, browseHref, renderCard }: DiscoverySwimlaneProps) {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [arrowClicks, setArrowClicks] = useState(0)
  const [atEnd, setAtEnd] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 10
    setHasOverflow(overflow)
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    const timer = setTimeout(checkScroll, 400)
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      clearTimeout(timer)
    }
  }, [checkScroll, items])

  const handleArrow = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: Math.max(el.clientWidth * 0.8, 280), behavior: 'smooth' })
    setArrowClicks(c => c + 1)
  }

  const showBrowse = arrowClicks >= MAX_ARROW_CLICKS || (arrowClicks > 0 && atEnd)
  const showArrow = !showBrowse && !loading && items.length > 0 && hasOverflow

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)', lineHeight: 1.2, margin: 0 }}>{title}</h2>
        {showBrowse && (
          <motion.button
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => navigate(browseHref)}
            style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
          >
            Browse →
          </motion.button>
        )}
      </div>

      {/* Scroll row + arrow */}
      <div style={{ position: 'relative' }}>
        <div
          ref={scrollRef}
          className="no-scrollbar"
          style={{
            display: 'flex', gap: 12, overflowX: 'auto', flexWrap: 'nowrap',
            paddingBottom: 4,
            paddingRight: showArrow ? 50 : 4,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
            : items.map((r, i) => renderCard(r, i))
          }
        </div>

        {/* Hollow circle arrow — fades out / replaced by Browse in header */}
        {showArrow && (
          <HollowArrow onClick={handleArrow} />
        )}
      </div>
    </div>
  )
}

function HollowArrow({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Scroll right"
      style={{
        position: 'absolute', right: 0, top: '50%',
        transform: 'translateY(-50%)',
        width: 36, height: 36, borderRadius: '50%',
        border: `1.5px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: hovered ? 'var(--accent)' : 'var(--muted2)',
        transition: 'border-color 0.15s, color 0.15s',
        flexShrink: 0,
        zIndex: 2,
      }}
    >
      <ChevronRight style={{ width: 15, height: 15 }} />
    </button>
  )
}

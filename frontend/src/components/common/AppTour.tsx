import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Globe, Search, Library, Download, BookOpen, Keyboard, Smartphone } from 'lucide-react'

interface TourStep {
  id: string
  targetSelector: string | null  // null = full-screen modal / bottom sheet (no spotlight)
  title: string
  body: string
  icon: typeof Globe | null
  extra?: React.ReactNode
  tooltipSide?: 'above' | 'below' | 'center'
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia('(max-width: 767px)')
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches)

    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
    } else {
      mql.addListener(onChange)
    }

    const onResize = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)

    setMobile(mql.matches)

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', onChange)
      } else {
        mql.removeListener(onChange)
      }
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return mobile
}

const READER_CONTROLS_DESKTOP = (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
    {[
      { key: '← →', action: 'Previous / next page' },
      { key: 'Space', action: 'Next page' },
      { key: 'Ctrl + ←', action: 'Previous chapter' },
      { key: 'Ctrl + →', action: 'Next chapter' },
      { key: 'F', action: 'Fullscreen' },
      { key: 'Esc', action: 'Exit reader' },
    ].map(({ key, action }) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <kbd style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11, fontFamily: 'monospace', color: 'var(--fg)', whiteSpace: 'nowrap', flexShrink: 0 }}>{key}</kbd>
        <span style={{ fontSize: 11, color: 'var(--muted2)' }}>{action}</span>
      </div>
    ))}
  </div>
)

const READER_CONTROLS_MOBILE = (
  <div style={{ marginTop: 12, position: 'relative', height: 100, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
    {[
      { label: '← Prev', left: '8%', top: '50%', transform: 'translateY(-50%)' },
      { label: 'Toggle UI', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' },
      { label: 'Next →', right: '8%', top: '50%', transform: 'translateY(-50%)' },
    ].map(({ label, ...style }) => (
      <div key={label} style={{ position: 'absolute', fontSize: 11, color: 'var(--muted2)', fontWeight: 700, ...(style as React.CSSProperties) }}>
        {label}
      </div>
    ))}
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
      {['', '', ''].map((_, i) => (
        <div key={i} style={{ borderRight: i < 2 ? '1px dashed rgba(255,255,255,0.07)' : undefined }} />
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--muted3)', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Smartphone style={{ width: 10, height: 10 }} /> Tap zones
    </div>
  </div>
)

function getSteps(isMob: boolean): TourStep[] {
  return [
    {
      id: 'welcome',
      targetSelector: null,
      icon: null,
      title: "Here's a quick tour",
      body: "30 seconds. We'll show you where everything lives so you can start reading right away.",
      tooltipSide: 'center',
    },
    {
      id: 'sources',
      targetSelector: '[data-tour="sources"]',
      icon: Globe,
      title: 'Browse & install sources',
      body: 'Sources provide content for manga and light novels. Browse, enable, and install extensions here to discover titles across 30+ sources.',
      tooltipSide: 'above',
    },
    {
      id: 'search',
      targetSelector: '[data-tour="search"]',
      icon: Search,
      title: 'Search & discover',
      body: 'Search across all your active sources at once. The Popular Now and Latest Updates rows update automatically, no search needed.',
      tooltipSide: 'above',
    },
    {
      id: 'library',
      targetSelector: '[data-tour="library"]',
      icon: Library,
      title: 'Your library',
      body: "Tap 'Add to Library' on any title's detail page to save it. Your reading list syncs across devices when you're signed in.",
      tooltipSide: 'above',
    },
    {
      id: 'reader',
      targetSelector: null,
      icon: isMob ? Smartphone : Keyboard,
      title: 'Reader controls',
      body: isMob
        ? 'Tap the left or right third of the screen to turn pages. Tap the center to show or hide the UI. Swipe down from the top edge to search.'
        : 'Use arrow keys to turn pages. Hold Ctrl to jump between chapters.',
      tooltipSide: 'center',
      extra: isMob ? READER_CONTROLS_MOBILE : READER_CONTROLS_DESKTOP,
    },
    {
      id: 'downloads',
      targetSelector: '[data-tour="downloads"]',
      icon: Download,
      title: 'Download for offline',
      body: 'Download chapters from any title or chapter list. Read them offline anytime with no internet needed.',
      tooltipSide: 'above',
    },
    {
      id: 'trackers',
      targetSelector: null,
      icon: null,
      title: 'Sync with AniList & MAL',
      body: 'Connect AniList or MyAnimeList in Settings → Trackers. Your reading progress syncs automatically when you finish a chapter.',
      tooltipSide: 'center',
    },
    {
      id: 'done',
      targetSelector: null,
      icon: BookOpen,
      title: "You're all set.",
      body: "That's everything. You're ready to start reading. Find guides, controls, and shortcuts anytime in Help.",
      tooltipSide: 'center',
    },
  ]
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

function useSpotlight(selector: string | null): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null)

  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }

    const measure = () => {
      // Find all matching elements (both desktop sidebar and mobile bottom nav may have data-tour)
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))
      if (elements.length === 0) {
        setRect(null)
        return
      }

      // Filter for elements that are actually visible on screen
      let visibleEl: HTMLElement | null = null
      let visibleRect: DOMRect | null = null

      for (const el of elements) {
        // Elements in display:none containers have 0 client rects
        if (el.getClientRects().length === 0) continue

        const r = el.getBoundingClientRect()
        // Must have non-zero dimensions
        if (r.width <= 0 || r.height <= 0) continue

        // Check computed visibility
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          continue
        }

        visibleEl = el
        visibleRect = r
        break
      }

      if (!visibleEl || !visibleRect) {
        setRect(null)
        return
      }

      setRect({
        top: visibleRect.top,
        left: visibleRect.left,
        width: visibleRect.width,
        height: visibleRect.height,
      })
    }

    measure()
    const rafId = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [selector])

  return rect
}

interface Props {
  onDone: () => void
}

export default function AppTour({ onDone }: Props) {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const steps = getSteps(mobile)
  const [stepIdx, setStepIdx] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = steps[stepIdx] || steps[0]
  const rect = useSpotlight(step.targetSelector)
  const isFirst = stepIdx === 0
  const isLast = stepIdx === steps.length - 1
  const PAD = 4

  const dismiss = useCallback(() => {
    localStorage.removeItem('first_launch_tour')
    localStorage.setItem('tour_seen', '1')
    onDone()
  }, [onDone])

  // Auto-dismiss after 10s of inactivity on first step
  useEffect(() => {
    if (stepIdx !== 0) return
    const t = setTimeout(dismiss, 10000)
    return () => clearTimeout(t)
  }, [stepIdx, dismiss])

  const next = useCallback(() => {
    if (isLast) {
      dismiss()
      navigate('/search', { replace: true })
    } else {
      setStepIdx(i => i + 1)
    }
  }, [isLast, dismiss, navigate])

  const prev = useCallback(() => {
    if (!isFirst) setStepIdx(i => i - 1)
  }, [isFirst])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, dismiss])

  // Compute tooltip card position
  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
    maxWidth: mobile ? '100%' : 380,
    width: mobile ? '100%' : 'calc(100vw - 32px)',
    maxHeight: 'calc(100dvh - 80px)',
    overflowY: 'auto',
  }

  const hasValidSpotlight = rect && rect.width > 0 && rect.height > 0

  if (!hasValidSpotlight || step.tooltipSide === 'center') {
    if (mobile) {
      // Bottom sheet on mobile — safe area aware
      cardStyle.bottom = 0
      cardStyle.left = 0
      cardStyle.right = 0
      cardStyle.borderRadius = '20px 20px 0 0'
      cardStyle.paddingBottom = 'max(22px, env(safe-area-inset-bottom))'
    } else {
      cardStyle.top = '50%'
      cardStyle.left = '50%'
      cardStyle.transform = 'translate(-50%, -50%)'
      cardStyle.borderRadius = 18
    }
  } else if (step.tooltipSide === 'above') {
    if (mobile) {
      // On mobile: if target is in bottom half of screen (e.g. bottom nav),
      // position card safely above it.
      if (rect.top > 160) {
        const fromBottom = window.innerHeight - rect.top + PAD + 14
        const maxFromBottom = window.innerHeight - 200
        cardStyle.bottom = Math.max(16, Math.min(fromBottom, maxFromBottom))
      } else {
        // If target is in top half, position below it
        cardStyle.top = Math.max(16, rect.top + rect.height + PAD + 14)
      }
      cardStyle.left = 16
      cardStyle.right = 16
      cardStyle.width = 'auto'
      cardStyle.maxWidth = 'calc(100vw - 32px)'
    } else {
      // Desktop: sidebar item — position card to the right of the sidebar
      cardStyle.top = Math.max(16, Math.min(rect.top - 20, window.innerHeight - 280))
      const targetLeft = rect.left + rect.width + 16
      if (targetLeft + 380 > window.innerWidth) {
        cardStyle.left = Math.max(16, window.innerWidth - 400)
      } else {
        cardStyle.left = targetLeft
      }
      cardStyle.maxWidth = 380
    }
    cardStyle.borderRadius = 18
  } else {
    // Below the target
    cardStyle.top = rect.top + rect.height + PAD + 16
    cardStyle.left = '50%'
    cardStyle.transform = 'translateX(-50%)'
    cardStyle.borderRadius = 18
  }

  const Icon = step.icon

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
      {/* Scrim with spotlight cutout */}
      {hasValidSpotlight ? (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx={12}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.78)" mask="url(#tour-mask)" />
          {/* Pulsing spotlight ring */}
          <rect
            x={rect.left - PAD}
            y={rect.top - PAD}
            width={rect.width + PAD * 2}
            height={rect.height + PAD * 2}
            rx={12}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            opacity={0.8}
          >
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </rect>
        </svg>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', pointerEvents: 'none' }} />
      )}

      {/* Click backdrop to skip */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={dismiss} aria-hidden="true" />

      {/* Tour card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={cardRef}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          onClick={e => e.stopPropagation()}
          style={{
            ...cardStyle,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: cardStyle.borderRadius ?? 18,
            padding: '22px 22px 18px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {Icon && (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 18, height: 18, color: 'var(--accent)' }} />
                </div>
              )}
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)', lineHeight: 1.2, margin: 0 }}>{step.title}</h2>
            </div>
            <button
              onClick={dismiss}
              aria-label="Skip tour"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted3)', padding: 4, borderRadius: 8, display: 'flex', flexShrink: 0, marginLeft: 8 }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.65, margin: 0 }}>{step.body}</p>

          {step.extra}

          {/* Footer: progress + nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            {/* Dot progress */}
            <div style={{ display: 'flex', gap: 5 }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === stepIdx ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === stepIdx ? 'var(--accent)' : 'var(--surface-hover)',
                    transition: 'all 0.25s ease',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isFirst ? (
                <button
                  onClick={dismiss}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Skip
                </button>
              ) : (
                <button
                  onClick={prev}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  <ChevronLeft style={{ width: 14, height: 14, flexShrink: 0 }} /> Back
                </button>
              )}
              <button
                onClick={next}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {isLast ? 'Start Reading' : 'Next'} <ChevronRight style={{ width: 14, height: 14, flexShrink: 0 }} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

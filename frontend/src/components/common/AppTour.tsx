import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Globe, Search, Library, Download, BookOpen, Keyboard, Smartphone } from 'lucide-react'

interface TourStep {
  id: string
  targetSelector: string | null  // null = full-screen modal (no spotlight)
  title: string
  body: string
  icon: typeof Globe | null
  extra?: React.ReactNode
  tooltipSide?: 'above' | 'below' | 'center'
}

const isMobile = () => window.innerWidth < 768

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
      <div key={label} style={{ position: 'absolute', fontSize: 11, color: 'var(--muted2)', fontWeight: 700, ...style as React.CSSProperties }}>
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

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: null,
    icon: null,
    title: "Here's a quick tour",
    body: "30 seconds. We'll show you where everything is so you can start reading right away.",
    tooltipSide: 'center',
  },
  {
    id: 'sources',
    targetSelector: '[data-tour="sources"]',
    icon: Globe,
    title: 'Set up your sources',
    body: 'Sources power your search. Head here first to enter your API key — without it, search returns nothing.',
    tooltipSide: 'above',
  },
  {
    id: 'search',
    targetSelector: '[data-tour="search"]',
    icon: Search,
    title: 'Search for anything',
    body: 'Search across all your active sources at once. Type a title, tap a result to open it.',
    tooltipSide: 'above',
  },
  {
    id: 'library',
    targetSelector: '[data-tour="library"]',
    icon: Library,
    title: 'Your library',
    body: "Bookmark any manga with the + button on its detail page. It syncs across all your devices when you're signed in.",
    tooltipSide: 'above',
  },
  {
    id: 'reader',
    targetSelector: null,
    icon: isMobile() ? Smartphone : Keyboard,
    title: 'Reader controls',
    body: isMobile()
      ? 'Tap the left or right third of the screen to turn pages. Tap the center to show or hide the UI.'
      : 'Use arrow keys to turn pages. Hold Ctrl to jump between chapters.',
    tooltipSide: 'center',
    extra: isMobile() ? READER_CONTROLS_MOBILE : READER_CONTROLS_DESKTOP,
  },
  {
    id: 'downloads',
    targetSelector: '[data-tour="downloads"]',
    icon: Download,
    title: 'Download for offline',
    body: 'Download chapters from any manga detail page. Read them here with no internet needed.',
    tooltipSide: 'above',
  },
  {
    id: 'done',
    targetSelector: null,
    icon: BookOpen,
    title: "You're ready.",
    body: "That's everything. Find this tour again in Settings → Help whenever you need a refresher.",
    tooltipSide: 'center',
  },
]

interface SpotlightRect { top: number; left: number; width: number; height: number }

function useSpotlight(selector: string | null): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null)

  useEffect(() => {
    if (!selector) { setRect(null); return }
    const measure = () => {
      const el = document.querySelector(selector)
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [selector])

  return rect
}

interface Props {
  onDone: () => void
}

export default function AppTour({ onDone }: Props) {
  const navigate = useNavigate()
  const [stepIdx, setStepIdx] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = STEPS[stepIdx]
  const rect = useSpotlight(step.targetSelector)
  const isFirst = stepIdx === 0
  const isLast = stepIdx === STEPS.length - 1
  const PAD = 10

  const dismiss = useCallback(() => {
    localStorage.removeItem('first_launch_tour')
    localStorage.setItem('tour_seen', '1')
    onDone()
  }, [onDone])

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
  const cardStyle: React.CSSProperties = { position: 'fixed', zIndex: 10001, maxWidth: 340, width: 'calc(100vw - 32px)' }

  if (!rect || step.tooltipSide === 'center') {
    // Center modal
    cardStyle.top = '50%'
    cardStyle.left = '50%'
    cardStyle.transform = 'translate(-50%, -50%)'
  } else if (step.tooltipSide === 'above') {
    // Above the target (bottom-nav items)
    cardStyle.bottom = window.innerHeight - rect.top + PAD + 16
    cardStyle.left = '50%'
    cardStyle.transform = 'translateX(-50%)'
  } else {
    // Below the target
    cardStyle.top = rect.top + rect.height + PAD + 16
    cardStyle.left = '50%'
    cardStyle.transform = 'translateX(-50%)'
  }

  const Icon = step.icon

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
      {/* Scrim with spotlight cutout */}
      {rect ? (
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
            borderRadius: 18,
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
              {STEPS.map((_, i) => (
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

            <div style={{ display: 'flex', gap: 8 }}>
              {!isFirst && (
                <button
                  onClick={prev}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Back
                </button>
              )}
              <button
                onClick={next}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
              >
                {isLast ? 'Start Reading' : 'Next'} <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

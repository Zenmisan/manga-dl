import { BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../lib/store'
import { cn } from '../../lib/utils'

const SECTION: React.CSSProperties = { padding: '22px 20px', marginBottom: 14 }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--border)', minHeight: 52 }

function CardLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 14, height: 14, color: 'var(--accent)' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted2)' }}>{title}</span>
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      style={{ width: 48, height: 28, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--surface-hover)', border: 'none', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
    >
      <span style={{ position: 'absolute', top: 4, width: 20, height: 20, borderRadius: 999, background: '#fff', left: on ? 24 : 4, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
    </button>
  )
}

const ease = [0.16, 1, 0.3, 1] as const

export default function ReaderSettings() {
  const { tapZoneLayout, setTapZoneLayout, cropBorders, setCropBorders, dualPageSpread, setDualPageSpread, webtoonSidePadding, setWebtoonSidePadding, cropBordersWebtoon, setCropBordersWebtoon } = useAppStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="hidden md:block" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--fg)', marginBottom: 4 }}>Reader</h2>
        <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Customize how manga is displayed and navigated.</p>
      </div>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.4, ease }}
      >
        <CardLabel icon={BookOpen} title="Reader Appearance" />

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>Tap Zones</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([['default', 'Default'], ['l-nav', 'L-Nav'], ['edge', 'Edge'], ['disabled', 'Disabled']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setTapZoneLayout(v)} className={cn('filter-pill', tapZoneLayout === v && 'active')}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 8 }}>
            {tapZoneLayout === 'default' && 'Left 1/3 = prev, right 1/3 = next, center = toggle UI'}
            {tapZoneLayout === 'l-nav' && 'Left half = prev, right half = next'}
            {tapZoneLayout === 'edge' && '15% edges only for navigation'}
            {tapZoneLayout === 'disabled' && 'Taps only toggle UI — no navigation'}
          </div>
        </div>

        <div style={ROW}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Crop Borders</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Remove whitespace margins from page images</div>
          </div>
          <Toggle on={cropBorders} onToggle={() => setCropBorders(!cropBorders)} />
        </div>

        <div style={{ ...ROW, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>Dual-Page Spread</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['auto', 'Auto'], ['on', 'Always On'], ['off', 'Off']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setDualPageSpread(v)} className={cn('filter-pill', dualPageSpread === v && 'active')}>{label}</button>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, duration: 0.4, ease }}
      >
        <CardLabel icon={BookOpen} title="Webtoon Mode" />

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>
            Side Padding — {webtoonSidePadding}px
          </div>
          <input type="range" min={0} max={80} step={4} value={webtoonSidePadding}
            onChange={e => setWebtoonSidePadding(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted3)', marginTop: 4 }}>
            <span>0px</span><span>80px</span>
          </div>
        </div>

        <div style={ROW}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Crop Borders (Webtoon)</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Crop horizontal whitespace in webtoon strips</div>
          </div>
          <Toggle on={cropBordersWebtoon} onToggle={() => setCropBordersWebtoon(!cropBordersWebtoon)} />
        </div>
      </motion.section>
    </div>
  )
}

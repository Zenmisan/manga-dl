import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { User, SlidersHorizontal, BookOpen, LayoutGrid, Share2, Database } from 'lucide-react'

const TABS = [
  { id: 'profile',  label: 'Account & Profile', icon: User,              path: '/settings/profile' },
  { id: 'general',  label: 'General',           icon: SlidersHorizontal, path: '/settings/general' },
  { id: 'reader',   label: 'Reader',            icon: BookOpen,          path: '/settings/reader' },
  { id: 'library',  label: 'Library',           icon: LayoutGrid,        path: '/settings/library' },
  { id: 'trackers', label: 'Trackers',          icon: Share2,            path: '/settings/trackers' },
  { id: 'system',   label: 'System',            icon: Database,          path: '/settings/system' },
]

export default function SettingsLayout() {
  const location = useLocation()
  const isActive = (id: string, path: string) =>
    location.pathname === path || (location.pathname === '/settings' && id === 'profile')

  return (
    <div className="min-h-full flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Mobile ── */}
      <div className="md:hidden">
        <div style={{ padding: '28px 20px 0' }}>
          <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(2.5rem,10vw,3.5rem)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--fg)', lineHeight: 1, marginBottom: 20 }}>
            Settings
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 14px', borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <NavLink
              key={t.id} to={t.path}
              className={isActive(t.id, t.path) ? 'filter-pill active' : 'filter-pill'}
              style={{ textDecoration: 'none', flexShrink: 0 }}
            >
              {t.label}
            </NavLink>
          ))}
        </div>
        <main style={{ padding: '20px 16px 80px' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Desktop: 2-col ── */}
      <div className="hidden md:flex flex-1" style={{ minHeight: '100vh' }}>
        <nav style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '32px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 20px 28px', fontFamily: "'Anton', sans-serif", fontSize: 24, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg)' }}>
            Settings
          </div>
          {TABS.map(t => {
            const active = isActive(t.id, t.path)
            return (
              <NavLink
                key={t.id} to={t.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
                  textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--accent)' : 'var(--muted2)',
                  borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  transition: 'color 0.15s, border-color 0.15s', background: active ? 'rgba(220,38,38,0.06)' : 'transparent',
                }}
              >
                <t.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                {t.label}
              </NavLink>
            )
          })}
        </nav>

        <main style={{ flex: 1, padding: '32px 28px 80px', maxWidth: 700, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Settings, BookOpen, LayoutGrid, Share2, Database } from 'lucide-react'

export default function SettingsLayout() {
  const location = useLocation()

  const tabs = [
    { id: 'general', label: 'General', icon: Settings, path: '/settings/general' },
    { id: 'reader', label: 'Reader', icon: BookOpen, path: '/settings/reader' },
    { id: 'library', label: 'Library', icon: LayoutGrid, path: '/settings/library' },
    { id: 'trackers', label: 'Trackers', icon: Share2, path: '/settings/trackers' },
    { id: 'system', label: 'System', icon: Database, path: '/settings/system' },
  ]

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
        <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)' }}>Settings</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', flex: 1 }} className="md:grid-cols-[200px_1fr] grid-cols-1">
        {/* Left tab nav — vertical on desktop, horizontal scroll on mobile */}
        <nav
          style={{ borderRight: '1px solid var(--border)', padding: '16px 0' }}
          className="hidden md:flex flex-col gap-1"
        >
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (location.pathname === '/settings' && tab.id === 'general')
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                style={isActive
                  ? { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', margin: '0 8px', borderRadius: 10, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }
                  : { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', margin: '0 8px', borderRadius: 10, color: 'var(--muted2)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }
                }
              >
                <tab.icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                {tab.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Mobile: horizontal tab pills */}
        <div className="md:hidden" style={{ gridColumn: '1/-1', display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (location.pathname === '/settings' && tab.id === 'general')
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={isActive ? 'filter-pill active' : 'filter-pill'}
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                {tab.label}
              </NavLink>
            )
          })}
        </div>

        {/* Content */}
        <main style={{ padding: '20px 24px', maxWidth: 640, overflowY: 'auto' }} className="md:col-start-2">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

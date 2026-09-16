import { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { User, SlidersHorizontal, BookOpen, LayoutGrid, Share2, Database, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
  { id: 'profile',  label: 'Account & Profile', icon: User,              path: '/settings/profile' },
  { id: 'general',  label: 'General',           icon: SlidersHorizontal, path: '/settings/general' },
  { id: 'reader',   label: 'Reader',            icon: BookOpen,          path: '/settings/reader' },
  { id: 'library',  label: 'Library',           icon: LayoutGrid,        path: '/settings/library' },
  { id: 'trackers', label: 'Trackers',          icon: Share2,            path: '/settings/trackers' },
  { id: 'system',   label: 'System',            icon: Database,          path: '/settings/system' },
]

// Flat index of all settings items
const SETTINGS_INDEX = [
  // General
  { label: 'Theme',            keywords: 'appearance dark light amoled mode color',        path: '/settings/general',  section: 'General' },
  { label: 'Accent Color',     keywords: 'accent color red blue green purple tint',        path: '/settings/general',  section: 'General' },
  { label: 'Backend URL',      keywords: 'server url connection backend custom host',      path: '/settings/general',  section: 'General' },
  { label: 'API Key',          keywords: 'api key auth token authentication backend',      path: '/settings/general',  section: 'General' },
  { label: 'Notifications',    keywords: 'push notifications alerts enable disable',       path: '/settings/general',  section: 'General' },
  { label: 'Auto-Download',    keywords: 'auto download wifi new chapters automatic',      path: '/settings/general',  section: 'General' },
  { label: 'Language',         keywords: 'language locale region',                        path: '/settings/general',  section: 'General' },

  // Reader
  { label: 'Tap Zone Layout',  keywords: 'tap zone layout touch area navigation l-nav edge disabled', path: '/settings/reader', section: 'Reader' },
  { label: 'Dual-Page Spread', keywords: 'dual page spread double page landscape auto',   path: '/settings/reader',  section: 'Reader' },
  { label: 'Webtoon Padding',  keywords: 'webtoon side padding margin scroll strip',       path: '/settings/reader',  section: 'Reader' },
  { label: 'Crop Borders',     keywords: 'crop borders webtoon strip edge padding',        path: '/settings/reader',  section: 'Reader' },
  { label: 'Reading Mode',     keywords: 'reading mode webtoon manga rtl ltr direction',  path: '/settings/reader',  section: 'Reader' },

  // Library
  { label: 'Categories',       keywords: 'categories tags group organize shelf',           path: '/settings/library',  section: 'Library' },
  { label: 'Library Density',  keywords: 'density compact large grid view library card size', path: '/settings/library', section: 'Library' },
  { label: 'Sort Order',       keywords: 'sort order title date last read unread',         path: '/settings/library',  section: 'Library' },

  // Trackers
  { label: 'AniList',          keywords: 'anilist tracker oauth login connect account sync progress', path: '/settings/trackers', section: 'Trackers' },
  { label: 'MyAnimeList',      keywords: 'mal myanimelist tracker oauth login sync chapters', path: '/settings/trackers', section: 'Trackers' },
  { label: 'Tracking',         keywords: 'tracking sync reading progress chapters tracker', path: '/settings/trackers', section: 'Trackers' },

  // Profile
  { label: 'Account',          keywords: 'account sign in login email password profile user', path: '/settings/profile', section: 'Account' },
  { label: 'Username',         keywords: 'username handle profile display name',           path: '/settings/profile',  section: 'Account' },
  { label: 'Sign Out',         keywords: 'sign out logout log out account session',        path: '/settings/profile',  section: 'Account' },
  { label: 'Google Sign-in',   keywords: 'google oauth sso social login account',          path: '/settings/profile',  section: 'Account' },

  // System
  { label: 'Backup & Export',  keywords: 'backup export import restore data json library', path: '/settings/system',   section: 'System' },
  { label: 'Storage / Prune',  keywords: 'storage prune cache clear data disk usage delete', path: '/settings/system',  section: 'System' },
  { label: 'Import Data',      keywords: 'import restore backup json data',                path: '/settings/system',   section: 'System' },
  { label: 'App Version',      keywords: 'version app info about update',                  path: '/settings/system',   section: 'System' },
]

function scoreMatch(item: typeof SETTINGS_INDEX[0], q: string): number {
  const needle = q.toLowerCase()
  const haystack = (item.label + ' ' + item.keywords + ' ' + item.section).toLowerCase()
  if (item.label.toLowerCase().startsWith(needle)) return 3
  if (item.label.toLowerCase().includes(needle)) return 2
  if (haystack.includes(needle)) return 1
  return 0
}

function SettingsSearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = query.trim().length >= 2
    ? SETTINGS_INDEX
        .map(item => ({ item, score: scoreMatch(item, query.trim()) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(r => r.item)
    : []

  const open = focused && results.length > 0

  const go = useCallback((path: string) => {
    setQuery('')
    setFocused(false)
    navigate(path)
  }, [navigate])

  useEffect(() => { setSelected(0) }, [query])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') { go(results[selected]?.path ?? '') }
    if (e.key === 'Escape') { setQuery(''); setFocused(false) }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        transition: 'border-color 0.15s',
        ...(focused ? { borderColor: 'var(--accent)' } : {}),
      }}>
        <Search style={{ width: 14, height: 14, color: 'var(--muted3)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder="Search settings…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--fg)',
          }}
          aria-label="Search settings"
          autoComplete="off"
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted3)', display: 'flex' }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {results.map((item, i) => (
              <button
                key={item.label}
                onMouseDown={() => go(item.path)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: i === selected ? 'rgba(220,38,38,0.08)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 1 }}>{item.section}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SettingsLayout() {
  const location = useLocation()
  const isActive = (id: string, path: string) =>
    location.pathname === path || (location.pathname === '/settings' && id === 'profile')

  return (
    <div className="min-h-full flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Mobile ── */}
      <div className="md:hidden">
        <div style={{ padding: '28px 20px 0' }}>
          <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(2.5rem,10vw,3.5rem)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--fg)', lineHeight: 1, marginBottom: 16 }}>
            Settings
          </h1>
          <div style={{ paddingBottom: 12 }}>
            <SettingsSearchBar />
          </div>
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 14px', borderBottom: '1px solid var(--border)' }}>
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
          <div style={{ padding: '0 20px 16px', fontFamily: "'Anton', sans-serif", fontSize: 24, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg)' }}>
            Settings
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <SettingsSearchBar />
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

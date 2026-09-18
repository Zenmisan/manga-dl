import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Book, Sparkles, Upload, Search, X } from 'lucide-react'
import { useDashboardData } from '../hooks/useDashboardData'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardCategoryTabs } from '../components/dashboard/DashboardCategoryTabs'
import { DashboardSortFilterPanel } from '../components/dashboard/DashboardSortFilterPanel'
import { DashboardBulkActionBar } from '../components/dashboard/DashboardBulkActionBar'
import { DashboardMangaCard } from '../components/dashboard/DashboardMangaCard'
import { ThemedSkeletonGrid } from '../components/common/ThemedLoader'
import type { LibraryItem } from '../hooks/useDashboardData'
import { usePageTitle } from '../lib/usePageTitle'

export default function Dashboard() {
  usePageTitle('Library')
  const {
    navigate, loading, refreshing, refetchLibrary, view, setView,
    uploading, isDesktop, sort, setSort, filter, setFilter, selectMode, setSelectMode,
    selectedItems, setSelectedItems, showSortPanel, setShowSortPanel,
    activeCategory, setActiveCategory, categories, isAdmin, lastReadMap, handleUpload,
    handleScanFolder, handleDeleteItem, handleBulkDelete, togglePin, displayedItems,
    pinnedFiles,
  } = useDashboardData()

  const [density, setDensity] = useState<'large' | 'compact'>(() =>
    (localStorage.getItem('manga-dl-library-density') as 'large' | 'compact') ?? 'large'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768
  const [isSearchExpanded, setIsSearchExpanded] = useState(isMobileScreen)
  const [contentFilter, setContentFilter] = useState<'all' | 'manga' | 'novel'>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const isExpanded = isSearchExpanded || searchQuery.length > 0

  const handleOpenSearch = useCallback(() => {
    setIsSearchExpanded(true)
    setTimeout(() => searchInputRef.current?.focus(), 60)
  }, [])

  const handleClearOrCloseSearch = useCallback(() => {
    if (searchQuery) {
      setSearchQuery('')
      searchInputRef.current?.focus()
    } else if (!isMobileScreen) {
      setIsSearchExpanded(false)
      searchInputRef.current?.blur()
    }
  }, [searchQuery, isMobileScreen])

  const handleSearchBlur = useCallback((e: React.FocusEvent) => {
    if (searchContainerRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    if (!searchQuery.trim() && !isMobileScreen) {
      setIsSearchExpanded(false)
    }
  }, [searchQuery, isMobileScreen])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (searchQuery) {
        setSearchQuery('')
      } else {
        setIsSearchExpanded(false)
        searchInputRef.current?.blur()
      }
    }
  }, [searchQuery])

  const handleSetDensity = useCallback((d: 'large' | 'compact') => {
    localStorage.setItem('manga-dl-library-density', d)
    setDensity(d)
  }, [])

  const handleToggleSelect = (title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const filteredItems = displayedItems
    .filter(item => contentFilter === 'all' || (item.type ?? 'manga') === contentFilter)
    .filter(item => !searchQuery.trim() || item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))

  const gridStyle = view === 'grid' ? {
    display: 'grid' as const,
    gridTemplateColumns: `repeat(auto-fill, minmax(${density === 'large' ? 140 : 100}px, 1fr))`,
    gap: density === 'large' ? 18 : 10,
  } : undefined

  if (loading) {
    return (
      <div className="min-h-full flex flex-col">
        <div style={{ height: 62, background: 'var(--surface)', borderBottom: '1px solid var(--border)', marginBottom: 0 }} />
        <div className="px-4 md:px-6 pt-6">
          <ThemedSkeletonGrid count={12} columns="repeat(auto-fill, minmax(150px, 1fr))" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex flex-col relative">
      <DashboardHeader
        refreshing={refreshing}
        refetchLibrary={refetchLibrary}
        isAdmin={isAdmin}
        isDesktop={isDesktop}
        uploading={uploading}
        handleScanFolder={handleScanFolder}
        handleUpload={handleUpload}
        showSortPanel={showSortPanel}
        setShowSortPanel={setShowSortPanel}
        sort={sort}
        filter={filter}
        selectMode={selectMode}
        setSelectMode={setSelectMode}
        setSelectedItems={setSelectedItems}
        view={view}
        setView={setView}
        density={density}
        setDensity={handleSetDensity}
        totalCount={searchQuery ? filteredItems.length : displayedItems.length}
      />

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1">
        {/* Library search bar — animated expandable icon to full-width input */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <motion.div
            ref={searchContainerRef}
            initial={false}
            animate={{
              width: isExpanded ? '100%' : 36,
              borderColor: isExpanded ? 'var(--accent, #ef4444)' : 'var(--border)',
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            whileHover={!isExpanded ? { scale: 1.05 } : undefined}
            whileTap={!isExpanded ? { scale: 0.95 } : undefined}
            role={isExpanded ? 'search' : 'button'}
            tabIndex={isExpanded ? -1 : 0}
            aria-label={isExpanded ? 'Search library' : 'Filter library'}
            title={isExpanded ? undefined : 'Filter library by title'}
            onClick={() => {
              if (!isExpanded) {
                handleOpenSearch()
              }
            }}
            onKeyDown={e => {
              if (!isExpanded && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                handleOpenSearch()
              }
            }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderStyle: 'solid',
              background: 'var(--surface)',
              overflow: 'hidden',
              cursor: isExpanded ? 'default' : 'pointer',
              userSelect: isExpanded ? 'auto' : 'none',
            }}
          >
            {/* Search icon trigger / indicator */}
            <div
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: isExpanded ? 'var(--accent, #ef4444)' : 'var(--muted3)',
                transition: 'color 0.2s ease',
              }}
            >
              <Search style={{ width: 14, height: 14 }} />
            </div>

            {/* Expandable input field */}
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onBlur={handleSearchBlur}
              onKeyDown={handleSearchKeyDown}
              placeholder="Filter library…"
              aria-label="Filter library by title"
              tabIndex={isExpanded ? 0 : -1}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--fg)',
                opacity: isExpanded ? 1 : 0,
                pointerEvents: isExpanded ? 'auto' : 'none',
                transition: 'opacity 0.15s ease',
                padding: '0 4px',
              }}
            />

            {/* Clear query or collapse button */}
            {isExpanded && (
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={handleClearOrCloseSearch}
                aria-label={searchQuery ? 'Clear search' : 'Close search'}
                title={searchQuery ? 'Clear search' : 'Close search'}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted3)',
                  marginRight: 2,
                  borderRadius: 6,
                }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </motion.div>
        </div>

        <DashboardCategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />

        {/* Content type filter pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {(['all', 'manga', 'novel'] as const).map(t => (
            <button
              key={t}
              onClick={() => setContentFilter(t)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: '1px solid', cursor: 'pointer',
                background: contentFilter === t ? 'var(--accent, #ef4444)' : 'var(--surface)',
                borderColor: contentFilter === t ? 'var(--accent, #ef4444)' : 'var(--border)',
                color: contentFilter === t ? '#fff' : 'var(--muted2)',
              }}
            >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        <DashboardSortFilterPanel
          show={showSortPanel}
          sort={sort}
          setSort={setSort}
          filter={filter}
          setFilter={setFilter}
        />

        {filteredItems.length === 0 && searchQuery ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted2)', fontSize: 14 }}>
            No manga matching "{searchQuery}"
          </div>
        ) : filteredItems.length === 0 ? (
          /* Hallmark · genre: atmospheric · empty state redesign · R2 Dashboard */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-10"
            style={{ maxWidth: 680 }}
          >
            {/* Atmospheric bloom */}
            <div
              className="absolute pointer-events-none select-none"
              aria-hidden="true"
              style={{
                top: -80, left: -60, width: 380, height: 320,
                background: 'radial-gradient(ellipse at center, var(--accent-muted) 0%, transparent 70%)',
                opacity: 0.35,
              }}
            />

            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
              {/* Left: text + actions */}
              <div className="flex-1 min-w-0">
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Book style={{ width: 22, height: 22, color: 'var(--muted3)' }} />
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--fg)', margin: '0 0 10px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>
                  Nothing here yet.
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.7, margin: '0 0 26px', maxWidth: 320 }}>
                  Search 50+ manga sources or drop your local CBZ archives to build your library.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate('/search')}
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}
                  >
                    <Sparkles style={{ width: 14, height: 14 }} aria-hidden="true" />
                    Browse Sources
                  </button>
                  <label
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}
                  >
                    <input type="file" multiple className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} aria-label="Upload manga archives" />
                    <Upload style={{ width: 14, height: 14 }} aria-hidden="true" />
                    Upload Archives
                  </label>
                </div>
              </div>

              {/* Right: decorative placeholder covers (desktop only) */}
              <div className="hidden md:grid grid-cols-3 gap-2 shrink-0 pt-2" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 76,
                      height: 108,
                      borderRadius: 8,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      opacity: Math.max(0.08, 0.28 - i * 0.04),
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div style={gridStyle} className={view === 'list' ? 'flex flex-col gap-2' : 'lib-grid'}>
            {filteredItems.map((item: LibraryItem, idx: number) => {
              const lastRead = lastReadMap[item.title?.toLowerCase().trim() ?? '']
              const isSelected = selectedItems.has(item.title)
              const isPinned = pinnedFiles.includes(item.title)

              return (
                <DashboardMangaCard
                  key={item.title}
                  item={item}
                  idx={idx}
                  view={view}
                  density={density}
                  selectMode={selectMode}
                  isSelected={isSelected}
                  isPinned={isPinned}
                  lastRead={lastRead}
                  navigate={navigate}
                  onToggleSelect={handleToggleSelect}
                  onTogglePin={togglePin}
                  onDelete={handleDeleteItem}
                />
              )
            })}
          </div>
        )}
      </div>

      <DashboardBulkActionBar
        selectMode={selectMode}
        selectedItems={selectedItems}
        displayedItems={displayedItems}
        setSelectedItems={setSelectedItems}
        setSelectMode={setSelectMode}
        handleBulkDelete={handleBulkDelete}
      />
    </div>
  )
}

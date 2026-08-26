import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Book, Sparkles, Upload } from 'lucide-react'
import { useDashboardData } from '../hooks/useDashboardData'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardCategoryTabs } from '../components/dashboard/DashboardCategoryTabs'
import { DashboardSortFilterPanel } from '../components/dashboard/DashboardSortFilterPanel'
import { DashboardBulkActionBar } from '../components/dashboard/DashboardBulkActionBar'
import { DashboardMangaCard } from '../components/dashboard/DashboardMangaCard'
import { ThemedSkeletonGrid } from '../components/common/ThemedLoader'
import type { LibraryItem } from '../hooks/useDashboardData'

export default function Dashboard() {
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
        totalCount={displayedItems.length}
      />

      <div className="px-4 md:px-6 pt-4 pb-28 flex-1">
        <DashboardCategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />

        <DashboardSortFilterPanel
          show={showSortPanel}
          sort={sort}
          setSort={setSort}
          filter={filter}
          setFilter={setFilter}
        />

        {displayedItems.length === 0 ? (
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
            {displayedItems.map((item: LibraryItem, idx: number) => {
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

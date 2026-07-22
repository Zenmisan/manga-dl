import { useState } from 'react'
import { motion } from 'framer-motion'
import { Book, Sparkles, Upload } from 'lucide-react'
import { useDashboardData } from '../hooks/useDashboardData'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardCategoryTabs } from '../components/dashboard/DashboardCategoryTabs'
import { DashboardSortFilterPanel } from '../components/dashboard/DashboardSortFilterPanel'
import { DashboardBulkActionBar } from '../components/dashboard/DashboardBulkActionBar'
import { DashboardMangaCard } from '../components/dashboard/DashboardMangaCard'
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

  const [density, setDensity] = useState<'large' | 'compact'>('large')

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
        <div className="px-4 md:px-6 pt-4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 18 }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{ aspectRatio: '2/3', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }} className="animate-pulse" />
            ))}
          </div>
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
        setDensity={setDensity}
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', maxWidth: 360, margin: '48px auto 0' }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Book style={{ width: 28, height: 28, color: 'var(--muted3)' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)', margin: '0 0 8px' }}>No manga in this category</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted2)', lineHeight: 1.6, margin: '0 0 24px' }}>
              {isAdmin
                ? 'Search the catalog or upload local archives to get started.'
                : 'Browse the catalog to find something to read.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button onClick={() => navigate('/search')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12 }}>
                <Sparkles style={{ width: 14, height: 14 }} />
                Browse Catalog
              </button>
              {isAdmin && (
                <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                  <input type="file" className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} />
                  <Upload style={{ width: 14, height: 14 }} />
                  Upload File
                </label>
              )}
            </div>
          </motion.div>
        ) : (
          <div style={gridStyle} className={view === 'list' ? 'flex flex-col gap-2' : ''}>
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

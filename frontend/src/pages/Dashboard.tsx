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
    selectedItems, setSelectedItems, gridColumns, showSortPanel, setShowSortPanel,
    activeCategory, setActiveCategory, categories, isAdmin, lastReadMap, handleUpload,
    handleScanFolder, handleDeleteItem, handleBulkDelete, togglePin, displayedItems,
    pinnedFiles,
  } = useDashboardData()

  const handleToggleSelect = (title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto min-h-full">
        <div className="h-10 w-48 bg-white/5 animate-pulse rounded-2xl mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-white/5 animate-pulse rounded-2xl border border-white/5" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto min-h-full flex flex-col relative pb-32">
      {/* Dashboard Header */}
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
      />

      {/* Category Pills */}
      <DashboardCategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* Sort & Filter Drawer */}
      <DashboardSortFilterPanel
        show={showSortPanel}
        sort={sort}
        setSort={setSort}
        filter={filter}
        setFilter={setFilter}
      />

      {/* Content View */}
      {displayedItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 glass-panel text-center max-w-md mx-auto my-12"
        >
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
            <Book className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-xl font-bold mb-2">No manga found</h2>
          <p className="text-white/40 mb-8 text-xs leading-relaxed">
            {isAdmin
              ? "Search for something new or upload your local archives."
              : "Search for something new to read online."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button onClick={() => navigate('/search')} className="btn-primary flex items-center justify-center gap-2 text-xs py-3 w-full">
              <Sparkles className="w-4 h-4" />
              Browse Catalog
            </button>
            {isAdmin && (
              <label className="btn-secondary flex items-center justify-center gap-2 cursor-pointer text-xs py-3 w-full">
                <input type="file" className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} />
                <Upload className="w-4 h-4" />
                Upload File
              </label>
            )}
          </div>
        </motion.div>
      ) : (
        <div
          className={view === 'grid' ? "grid gap-3 sm:gap-4 md:gap-8" : "space-y-4"}
          style={view === 'grid' ? { gridTemplateColumns: `repeat(var(--mobile-cols, ${gridColumns}), minmax(0, 1fr))` } : undefined}
        >
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

      {/* Floating Multi-Selection Action Bar */}
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

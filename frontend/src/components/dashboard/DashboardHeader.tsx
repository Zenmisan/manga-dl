import type React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, HardDrive, Upload, SlidersHorizontal, CheckSquare,
  Square, LayoutGrid, Grid3X3, List, Search,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  refreshing: boolean;
  refetchLibrary: () => void;
  isAdmin: boolean;
  isDesktop: boolean;
  uploading: boolean;
  handleScanFolder: () => void;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSortPanel: boolean;
  setShowSortPanel: React.Dispatch<React.SetStateAction<boolean>>;
  sort: string;
  filter: string;
  selectMode: boolean;
  setSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  view: 'grid' | 'list';
  setView: (v: 'grid' | 'list') => void;
  density: 'large' | 'compact';
  setDensity: (d: 'large' | 'compact') => void;
  totalCount: number;
}

export function DashboardHeader({
  refreshing, refetchLibrary, isAdmin, isDesktop, uploading, handleScanFolder,
  handleUpload, showSortPanel, setShowSortPanel, sort, filter, selectMode,
  setSelectMode, setSelectedItems, view, setView, density, setDensity, totalCount,
}: Props) {
  const navigate = useNavigate()
  const hasActiveFilters = sort !== 'default' || filter !== 'all'

  return (
    <header
      className="sticky-header border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Mobile header — title + search + filter only */}
      <div className="flex sm:hidden items-center justify-between px-4 h-[60px]">
        <h1 className="page-title" style={{ fontSize: 24, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Library</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/search')}
            className="icon-btn"
            aria-label="Search"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="icon-btn"
            aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {view === 'grid' ? <List className="w-[18px] h-[18px]" /> : <LayoutGrid className="w-[18px] h-[18px]" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSortPanel(p => !p)}
              className="icon-btn"
              style={showSortPanel || hasActiveFilters ? { background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
              aria-label="Filter and sort"
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" />
            </button>
            {hasActiveFilters && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pointer-events-none"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Desktop header — all controls */}
      <div className="hidden sm:flex items-center justify-between px-4 md:px-6 py-3 gap-3">
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Library</h1>
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>
            {totalCount} {totalCount === 1 ? 'title' : 'titles'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refetchLibrary()}
            disabled={refreshing}
            className="icon-btn"
            aria-label="Refresh library"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>

          {isAdmin && isDesktop && (
            <button
              onClick={handleScanFolder}
              disabled={uploading}
              className={cn('icon-btn', uploading && 'opacity-50 pointer-events-none')}
              style={{ color: 'rgb(52 211 153)' }}
              aria-label="Scan local manga directory"
            >
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
            </button>
          )}

          <label
            className={cn('icon-btn cursor-pointer', uploading && 'opacity-50 pointer-events-none')}
            aria-label="Upload manga archives"
          >
            <input type="file" multiple className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} />
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} /> : <Upload className="w-4 h-4" />}
          </label>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

          <div className="relative">
            <button
              onClick={() => setShowSortPanel(p => !p)}
              className="icon-btn"
              style={showSortPanel || hasActiveFilters ? { background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
              aria-label="Sort and filter"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {hasActiveFilters && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pointer-events-none"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </div>

          <button
            onClick={() => { setSelectMode(p => !p); setSelectedItems(new Set()) }}
            className="icon-btn"
            style={selectMode ? { background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
            aria-label={selectMode ? 'Exit select mode' : 'Enter select mode'}
          >
            {selectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

          {view === 'grid' && (
            <button
              onClick={() => setDensity(density === 'large' ? 'compact' : 'large')}
              className="icon-btn"
              aria-label={density === 'large' ? 'Switch to compact grid' : 'Switch to large grid'}
            >
              {density === 'large' ? <Grid3X3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="icon-btn"
            aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {view === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}

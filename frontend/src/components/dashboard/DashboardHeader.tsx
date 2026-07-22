import type React from 'react'
import {
  RefreshCw, HardDrive, Upload, SlidersHorizontal, CheckSquare,
  Square, LayoutGrid, Grid3X3, List,
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
  const hasActiveFilters = sort !== 'default' || filter !== 'all'

  return (
    <header
      className="sticky-header border-b px-4 md:px-6 py-3 flex items-center justify-between gap-3"
      style={{ borderColor: 'var(--border)' }}
    >
      <div>
        <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Library</h1>
        <p style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600, marginTop: 1 }}>
          {totalCount} {totalCount === 1 ? 'series' : 'series'}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => refetchLibrary()}
          disabled={refreshing}
          className="icon-btn"
          title="Refresh library"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>

        {isAdmin && isDesktop && (
          <button
            onClick={handleScanFolder}
            disabled={uploading}
            className={cn('icon-btn', uploading && 'opacity-50 pointer-events-none')}
            style={{ color: 'rgb(52 211 153)' }}
            title="Scan local manga directory"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
          </button>
        )}

        {isAdmin && (
          <label
            className={cn('icon-btn cursor-pointer', uploading && 'opacity-50 pointer-events-none')}
            title="Upload manga file"
          >
            <input type="file" className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} />
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} /> : <Upload className="w-4 h-4" />}
          </label>
        )}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

        <button
          onClick={() => setShowSortPanel(p => !p)}
          className="icon-btn"
          style={showSortPanel || hasActiveFilters ? { background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
          title="Sort & Filter"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          onClick={() => { setSelectMode(p => !p); setSelectedItems(new Set()) }}
          className="icon-btn"
          style={selectMode ? { background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
          title="Select mode"
        >
          {selectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

        {view === 'grid' && (
          <button
            onClick={() => setDensity(density === 'large' ? 'compact' : 'large')}
            className="icon-btn"
            title={density === 'large' ? 'Switch to compact' : 'Switch to large'}
          >
            {density === 'large' ? <Grid3X3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        )}

        <button
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          className="icon-btn"
          title={view === 'grid' ? 'List view' : 'Grid view'}
        >
          {view === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}

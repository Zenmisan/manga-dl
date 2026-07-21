import type React from 'react'
import {
  RefreshCw, HardDrive, Upload, SlidersHorizontal, CheckSquare,
  Square, LayoutGrid, List,
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
}

export function DashboardHeader({
  refreshing, refetchLibrary, isAdmin, isDesktop, uploading, handleScanFolder,
  handleUpload, showSortPanel, setShowSortPanel, sort, filter, selectMode,
  setSelectMode, setSelectedItems, view, setView,
}: Props) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-12">
      <div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent uppercase">
          Library
        </h1>
        <p className="text-white/40 font-medium text-sm md:text-lg">Your personal cloud collection</p>
      </div>

      <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1.5 backdrop-blur-sm max-w-full overflow-x-auto no-scrollbar">
        <button
          onClick={() => refetchLibrary()}
          disabled={refreshing}
          className="p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 px-4 hover:bg-white/5 text-white/40 hover:text-white"
          title="Refresh library"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Refresh</span>
        </button>
        {isAdmin && isDesktop && (
          <button
            onClick={handleScanFolder}
            disabled={uploading}
            className={cn(
              "p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 px-4",
              uploading ? "opacity-50 pointer-events-none" : "hover:bg-white/5 text-emerald-400 hover:text-emerald-300"
            )}
            title="Scan Local Manga Directory"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" /> : <HardDrive className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Scan Folder</span>
          </button>
        )}
        {isAdmin && (
          <label className={cn(
            "p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 px-4",
            uploading ? "opacity-50 pointer-events-none" : "hover:bg-white/5 text-white/40 hover:text-white"
          )}>
            <input type="file" className="hidden" accept=".zip,.cbz,.epub" onChange={handleUpload} />
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-red-500" /> : <Upload className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Upload</span>
          </label>
        )}
        <div className="w-px h-4 bg-white/10 my-auto mx-1" />
        <button
          onClick={() => setShowSortPanel(p => !p)}
          className={cn("p-2.5 rounded-xl transition-all flex items-center gap-2", showSortPanel || sort !== 'default' || filter !== 'all' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}
          title="Sort & Filter"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
        <div className="w-px h-4 bg-white/10 my-auto mx-1" />
        <button
          onClick={() => { setSelectMode(p => !p); setSelectedItems(new Set()) }}
          className={cn("p-2.5 rounded-xl transition-all flex items-center gap-2", selectMode ? "bg-red-500/20 text-red-400" : "text-white/40 hover:text-white/60")}
          title="Select Mode"
        >
          {selectMode ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>
        <div className="w-px h-4 bg-white/10 my-auto mx-1" />
        <button
          onClick={() => setView('grid')}
          className={cn("p-2.5 rounded-xl transition-all", view === 'grid' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}
          title="Grid view"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
        <button
          onClick={() => setView('list')}
          className={cn("p-2.5 rounded-xl transition-all", view === 'list' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}
          title="List view"
        >
          <List className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

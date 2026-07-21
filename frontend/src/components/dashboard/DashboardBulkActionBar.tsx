import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Trash2, X } from 'lucide-react'
import type { LibraryItem } from '../../hooks/useDashboardData'

interface Props {
  selectMode: boolean;
  selectedItems: Set<string>;
  displayedItems: LibraryItem[];
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleBulkDelete: () => void;
}

export function DashboardBulkActionBar({
  selectMode, selectedItems, displayedItems, setSelectedItems, setSelectMode, handleBulkDelete,
}: Props) {
  return (
    <AnimatePresence>
      {selectMode && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 glass-panel px-6 py-4 shadow-2xl flex items-center gap-6 border-white/10"
        >
          <span className="text-xs font-bold text-white/80">{selectedItems.size} Selected</span>
          <button
            onClick={() => {
              if (selectedItems.size === displayedItems.length) setSelectedItems(new Set())
              else setSelectedItems(new Set(displayedItems.map(i => i.title)))
            }}
            className="text-xs font-bold text-white/40 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            {selectedItems.size === displayedItems.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedItems.size === 0}
            className="text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button
            onClick={() => { setSelectMode(false); setSelectedItems(new Set()) }}
            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

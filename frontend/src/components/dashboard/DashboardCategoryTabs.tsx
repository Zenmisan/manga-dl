import { cn } from '../../lib/utils'

interface Props {
  categories: string[];
  activeCategory: string | null;
  setActiveCategory: (cat: string | null) => void;
}

export function DashboardCategoryTabs({ categories, activeCategory, setActiveCategory }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
      <button
        onClick={() => setActiveCategory(null)}
        className={cn(
          "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all shrink-0 cursor-pointer",
          !activeCategory ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/30 hover:border-white/10"
        )}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
          className={cn(
            "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all shrink-0 cursor-pointer",
            activeCategory === cat ? "bg-red-500/20 border-red-500/30 text-red-400" : "border-white/5 text-white/30 hover:border-white/10"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

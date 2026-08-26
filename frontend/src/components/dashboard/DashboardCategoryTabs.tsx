import { cn } from '../../lib/utils'

interface Props {
  categories: string[];
  activeCategory: string | null;
  setActiveCategory: (cat: string | null) => void;
}

export function DashboardCategoryTabs({ categories, activeCategory, setActiveCategory }: Props) {
  return (
    <div role="tablist" aria-label="Library categories" className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
      <button
        role="tab"
        aria-selected={!activeCategory}
        onClick={() => setActiveCategory(null)}
        className={cn('filter-pill', !activeCategory && 'active')}
        style={!activeCategory ? { boxShadow: '0 0 15px rgba(220,38,38,0.3)' } : undefined}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          role="tab"
          aria-selected={activeCategory === cat}
          onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
          className={cn('filter-pill', activeCategory === cat && 'active')}
          style={activeCategory === cat ? { boxShadow: '0 0 15px rgba(220,38,38,0.3)' } : undefined}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

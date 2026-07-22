import { cn } from '../../lib/utils'

interface Props {
  categories: string[];
  activeCategory: string | null;
  setActiveCategory: (cat: string | null) => void;
}

export function DashboardCategoryTabs({ categories, activeCategory, setActiveCategory }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
      <button
        onClick={() => setActiveCategory(null)}
        className={cn('filter-pill', !activeCategory && 'active')}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
          className={cn('filter-pill', activeCategory === cat && 'active')}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

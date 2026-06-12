export const DEFAULT_CATEGORIES = ['Reading', 'Completed', 'On Hold', 'Plan to Read', 'Dropped']
const CAT_KEY = 'manga-dl-categories'
const ASSIGN_KEY = 'manga-dl-manga-categories'

export function getCategories(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(CAT_KEY) || '[]') as string[]
    const merged = [...DEFAULT_CATEGORIES]
    for (const c of stored) { if (!merged.includes(c)) merged.push(c) }
    return merged
  } catch { return DEFAULT_CATEGORIES }
}

export function addCategory(name: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(CAT_KEY) || '[]') as string[]
    if (!stored.includes(name)) { stored.push(name); localStorage.setItem(CAT_KEY, JSON.stringify(stored)) }
  } catch {}
}

export function removeCategory(name: string) {
  if (DEFAULT_CATEGORIES.includes(name)) return
  try {
    const stored = JSON.parse(localStorage.getItem(CAT_KEY) || '[]') as string[]
    localStorage.setItem(CAT_KEY, JSON.stringify(stored.filter(c => c !== name)))
    // Remove from all manga assignments
    const assigns = getMangaCategories()
    for (const key of Object.keys(assigns)) {
      assigns[key] = assigns[key].filter(c => c !== name)
    }
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(assigns))
  } catch {}
}

function getMangaCategories(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || '{}') } catch { return {} }
}

export function getMangaCategoryList(mangaTitle: string): string[] {
  return getMangaCategories()[mangaTitle.toLowerCase().trim()] || []
}

export function setMangaCategory(mangaTitle: string, category: string, assigned: boolean) {
  const all = getMangaCategories()
  const key = mangaTitle.toLowerCase().trim()
  const current = new Set(all[key] || [])
  if (assigned) current.add(category); else current.delete(category)
  all[key] = [...current]
  localStorage.setItem(ASSIGN_KEY, JSON.stringify(all))
}

export function getMangasByCategory(category: string): string[] {
  const all = getMangaCategories()
  return Object.entries(all)
    .filter(([, cats]) => cats.includes(category))
    .map(([title]) => title)
}

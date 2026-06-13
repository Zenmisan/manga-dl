const KEY = 'manga-dl-notes'

interface MangaNote {
  note: string
  rating: number // 0-5, 0 = unrated
  updatedAt: string
}

function getAll(): Record<string, MangaNote> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function saveAll(data: Record<string, MangaNote>) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

function makeKey(provider: string, mangaId: string): string {
  return `${provider}:${mangaId}`
}

export function getMangaNote(provider: string, mangaId: string): MangaNote {
  return getAll()[makeKey(provider, mangaId)] ?? { note: '', rating: 0, updatedAt: '' }
}

export function setMangaNote(provider: string, mangaId: string, note: string) {
  const all = getAll()
  const key = makeKey(provider, mangaId)
  all[key] = { ...( all[key] ?? { rating: 0 }), note, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function setMangaRating(provider: string, mangaId: string, rating: number) {
  const all = getAll()
  const key = makeKey(provider, mangaId)
  all[key] = { ...(all[key] ?? { note: '' }), rating, updatedAt: new Date().toISOString() }
  saveAll(all)
}

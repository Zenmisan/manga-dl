const KEY = 'manga-dl-read'

function getAll(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function saveAll(data: Record<string, string[]>) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function markRead(provider: string, mangaId: string, chapterId: string) {
  const all = getAll()
  const key = `${provider}:${mangaId}`
  const set = new Set(all[key] || [])
  set.add(chapterId)
  all[key] = [...set]
  saveAll(all)
}

export function markUnread(provider: string, mangaId: string, chapterId: string) {
  const all = getAll()
  const key = `${provider}:${mangaId}`
  all[key] = (all[key] || []).filter(id => id !== chapterId)
  saveAll(all)
}

export function markAllRead(provider: string, mangaId: string, chapterIds: string[]) {
  const all = getAll()
  const key = `${provider}:${mangaId}`
  all[key] = chapterIds
  saveAll(all)
}

export function getReadChapters(provider: string, mangaId: string): Set<string> {
  return new Set(getAll()[`${provider}:${mangaId}`] || [])
}

export function getReadCount(provider: string, mangaId: string): number {
  return (getAll()[`${provider}:${mangaId}`] || []).length
}

export function isRead(provider: string, mangaId: string, chapterId: string): boolean {
  return (getAll()[`${provider}:${mangaId}`] || []).includes(chapterId)
}

export interface HistoryItem {
  provider: string
  manga_id: string
  chapter_id: string
  manga_title: string
  chapter_title: string
  last_page: number
  updated_at: string
}

const KEY = 'manga-dl-local-history'

export function getLocalHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalHistoryEntry(entry: HistoryItem) {
  try {
    const list = getLocalHistory()
    const filtered = list.filter(
      item => !(item.provider === entry.provider && item.manga_id === entry.manga_id && item.chapter_id === entry.chapter_id)
    )
    filtered.unshift(entry)
    const trimmed = filtered.slice(0, 200)
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    /* silent */
  }
}

export function deleteLocalHistoryEntry(provider: string, mangaId: string) {
  try {
    const list = getLocalHistory()
    const filtered = list.filter(item => !(item.provider === provider && item.manga_id === mangaId))
    localStorage.setItem(KEY, JSON.stringify(filtered))
  } catch {
    /* silent */
  }
}

export function clearLocalHistory() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* silent */
  }
}

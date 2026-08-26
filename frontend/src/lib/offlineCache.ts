import api from './api'

const CACHED_KEY = 'manga-dl-offline-cached'

function getCachedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CACHED_KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}

function markCached(key: string) {
  const set = getCachedSet()
  set.add(key)
  localStorage.setItem(CACHED_KEY, JSON.stringify([...set]))
}

export function isChapterCached(mangaTitle: string, filename: string): boolean {
  return getCachedSet().has(`${mangaTitle}::${filename}`)
}

export async function preCacheChapter(mangaTitle: string, filename: string): Promise<void> {
  const key = `${mangaTitle}::${filename}`
  if (getCachedSet().has(key)) return

  try {
    const res = await api.get(`/library/read/${encodeURIComponent(mangaTitle)}/${encodeURIComponent(filename)}`)
    const pages: string[] = res.data?.pages ?? []
    if (!pages.length) return

    const base = `${api.defaults.baseURL ?? ''}/library/image/${encodeURIComponent(mangaTitle)}/${encodeURIComponent(filename)}`
    await Promise.allSettled(
      pages.map(p =>
        fetch(`${base}/${encodeURIComponent(p)}`).catch(() => {})
      )
    )
    markCached(key)
  } catch {
    // non-fatal — user can still read online
  }
}

export function outputPathToParts(outputPath: string): { mangaTitle: string; filename: string } | null {
  const parts = outputPath.replace(/\\/g, '/').split('/')
  if (parts.length < 2) return null
  const filename = parts[parts.length - 1]
  const mangaTitle = parts[parts.length - 2]
  return { mangaTitle, filename }
}

const META_OVERRIDES_KEY = 'manga-dl-meta-overrides'

export interface MangaOverride {
  title?: string
  cover_url?: string
  description?: string
}

export function getMangaOverride(provider: string, mangaId: string): MangaOverride {
  try {
    const all = JSON.parse(localStorage.getItem(META_OVERRIDES_KEY) || '{}')
    return all[`${provider}:${mangaId}`] || {}
  } catch {
    return {}
  }
}

export function setMangaOverride(provider: string, mangaId: string, override: MangaOverride) {
  try {
    const all = JSON.parse(localStorage.getItem(META_OVERRIDES_KEY) || '{}')
    all[`${provider}:${mangaId}`] = override
    localStorage.setItem(META_OVERRIDES_KEY, JSON.stringify(all))
  } catch (err) {
    console.error('Failed to save manga override:', err)
  }
}

export function syncMetaOverridesFromCloud() {
  // Overrides are now local-only
}

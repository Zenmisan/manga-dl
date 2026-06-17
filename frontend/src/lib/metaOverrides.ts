import api from './api'
import { supabase } from './supabase'

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

export async function setMangaOverride(provider: string, mangaId: string, override: MangaOverride) {
  try {
    // 1. Save locally
    const all = JSON.parse(localStorage.getItem(META_OVERRIDES_KEY) || '{}')
    all[`${provider}:${mangaId}`] = override
    localStorage.setItem(META_OVERRIDES_KEY, JSON.stringify(all))

    // 2. Sync to cloud if logged in
    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    if (!session) return

    api.put('/users/manga-overrides', {
      provider,
      manga_id: mangaId,
      title: override.title || null,
      cover_url: override.cover_url || null,
      description: override.description || null,
    }).catch(err => {
      console.warn('Failed to sync manga override to cloud:', err)
    })
  } catch (err) {
    console.error('Failed to save manga override:', err)
  }
}

export async function syncMetaOverridesFromCloud() {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  if (!session) return

  try {
    const res = await api.get('/users/manga-overrides')
    const all: Record<string, MangaOverride> = {}
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.data.forEach((r: any) => {
      all[`${r.provider}:${r.manga_id}`] = {
        title: r.title || undefined,
        cover_url: r.cover_url || undefined,
        description: r.description || undefined,
      }
    })

    localStorage.setItem(META_OVERRIDES_KEY, JSON.stringify(all))
    console.log(`Synced ${res.data.length} manga overrides from cloud`)
  } catch (err) {
    console.warn('Could not sync manga overrides from cloud:', err)
  }
}

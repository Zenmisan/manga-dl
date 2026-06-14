import { supabase } from './supabase'

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

async function pushToSupabase(provider: string, mangaId: string, entry: MangaNote) {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  if (!session) return
  try {
    await supabase.from('manga_notes').upsert({
      user_id: session.user.id,
      provider,
      manga_id: mangaId,
      note: entry.note,
      rating: entry.rating,
      updated_at: entry.updatedAt,
    }, { onConflict: 'user_id,provider,manga_id' })
  } catch { /* non-fatal */ }
}

export async function syncMangaNotesFromCloud() {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  if (!session) return
  const { data, error } = await supabase
    .from('manga_notes')
    .select('provider, manga_id, note, rating, updated_at')
    .eq('user_id', session.user.id)
  if (error || !data) return

  const all = getAll()
  for (const row of data) {
    const key = makeKey(row.provider, row.manga_id)
    const local = all[key]
    // Keep whichever is newer
    if (!local || new Date(row.updated_at) > new Date(local.updatedAt || 0)) {
      all[key] = { note: row.note || '', rating: row.rating || 0, updatedAt: row.updated_at }
    }
  }
  saveAll(all)
}

export function getMangaNote(provider: string, mangaId: string): MangaNote {
  return getAll()[makeKey(provider, mangaId)] ?? { note: '', rating: 0, updatedAt: '' }
}

export function setMangaNote(provider: string, mangaId: string, note: string) {
  const all = getAll()
  const key = makeKey(provider, mangaId)
  const entry: MangaNote = { ...(all[key] ?? { rating: 0 }), note, updatedAt: new Date().toISOString() }
  all[key] = entry
  saveAll(all)
  pushToSupabase(provider, mangaId, entry)
}

export function setMangaRating(provider: string, mangaId: string, rating: number) {
  const all = getAll()
  const key = makeKey(provider, mangaId)
  const entry: MangaNote = { ...(all[key] ?? { note: '' }), rating, updatedAt: new Date().toISOString() }
  all[key] = entry
  saveAll(all)
  pushToSupabase(provider, mangaId, entry)
}

import { supabase } from './supabase'

const KEY = 'manga-dl-read'

function getAll(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function saveAll(data: Record<string, string[]>) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

async function pushToSupabase(provider: string, mangaId: string, chapterIds: string[]) {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  if (!session) return
  try {
    await supabase.from('read_tracking').upsert({
      user_id: session.user.id,
      provider,
      manga_id: mangaId,
      chapter_ids: chapterIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider,manga_id' })
  } catch { /* non-fatal */ }
}

/** Pull read state from Supabase and merge into localStorage (call once on app start). */
export async function syncReadTrackingFromCloud() {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  if (!session) return
  const { data, error } = await supabase
    .from('read_tracking')
    .select('provider, manga_id, chapter_ids')
    .eq('user_id', session.user.id)
  if (error || !data) return

  const all = getAll()
  for (const row of data) {
    const key = `${row.provider}:${row.manga_id}`
    const local = new Set(all[key] || [])
    const remote: string[] = row.chapter_ids || []
    remote.forEach(id => local.add(id))
    all[key] = [...local]
  }
  saveAll(all)
}

export function markRead(provider: string, mangaId: string, chapterId: string) {
  const all = getAll()
  const key = `${provider}:${mangaId}`
  const set = new Set(all[key] || [])
  set.add(chapterId)
  all[key] = [...set]
  saveAll(all)
  pushToSupabase(provider, mangaId, all[key])
}

export function markUnread(provider: string, mangaId: string, chapterId: string) {
  const all = getAll()
  const key = `${provider}:${mangaId}`
  all[key] = (all[key] || []).filter(id => id !== chapterId)
  saveAll(all)
  pushToSupabase(provider, mangaId, all[key])
}

export function markAllRead(provider: string, mangaId: string, chapterIds: string[]) {
  const all = getAll()
  const key = `${provider}:${mangaId}`
  all[key] = chapterIds
  saveAll(all)
  pushToSupabase(provider, mangaId, chapterIds)
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

import { supabase } from './supabase'

export interface SupabaseSubscription {
  id: string          // "{provider}/{manga_id}"
  user_id: string
  provider: string
  manga_id: string
  title: string
  cover_url: string | null
  type: 'manga' | 'novel'
  added_at: string
}

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

export function getCachedSubscriptions(): SupabaseSubscription[] {
  try {
    const raw = localStorage.getItem('cache:supabase_subscriptions')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export async function getSubscriptions(): Promise<SupabaseSubscription[]> {
  // If device is offline, immediately return cached subscriptions without network stall
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return getCachedSubscriptions()
  }

  try {
    const userId = await getUserId()
    if (!userId) return getCachedSubscriptions()

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (error) throw error
    const subs: SupabaseSubscription[] = data ?? []

    try {
      localStorage.setItem('cache:supabase_subscriptions', JSON.stringify(subs))
    } catch {}
    return subs
  } catch (err) {
    const cached = getCachedSubscriptions()
    if (cached.length > 0) return cached
    throw err
  }
}

export async function addSubscription(params: {
  provider: string
  mangaId: string
  title: string
  coverUrl: string | null
  type?: 'manga' | 'novel'
}): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  const id = `${params.provider}/${params.mangaId}`

  // Optimistically update cached subscriptions
  try {
    const current = getCachedSubscriptions()
    const updated = [
      {
        id,
        user_id: userId,
        provider: params.provider,
        manga_id: params.mangaId,
        title: params.title,
        cover_url: params.coverUrl ?? null,
        type: params.type ?? 'manga',
        added_at: new Date().toISOString(),
      },
      ...current.filter(s => s.id !== id),
    ]
    localStorage.setItem('cache:supabase_subscriptions', JSON.stringify(updated))
  } catch {}

  const { error } = await supabase.from('subscriptions').upsert({
    id,
    user_id: userId,
    provider: params.provider,
    manga_id: params.mangaId,
    title: params.title,
    cover_url: params.coverUrl ?? null,
    type: params.type ?? 'manga',
  }, { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function removeSubscription(provider: string, mangaId: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  const id = `${provider}/${mangaId}`

  // Optimistically update cached subscriptions
  try {
    const current = getCachedSubscriptions()
    const updated = current.filter(s => s.id !== id && !(s.provider === provider && s.manga_id === mangaId))
    localStorage.setItem('cache:supabase_subscriptions', JSON.stringify(updated))
  } catch {}

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

export async function isSubscribed(provider: string, mangaId: string): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false
  const id = `${provider}/${mangaId}`
  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  return data !== null
}

/** Push a batch of subscriptions (used when migrating guest/anon data on sign-in). */
export async function batchAddSubscriptions(items: Array<{
  provider: string
  mangaId: string
  title: string
  coverUrl: string | null
  type?: 'manga' | 'novel'
}>): Promise<void> {
  const userId = await getUserId()
  if (!userId || items.length === 0) return
  const rows = items.map(p => ({
    id: `${p.provider}/${p.mangaId}`,
    user_id: userId,
    provider: p.provider,
    manga_id: p.mangaId,
    title: p.title,
    cover_url: p.coverUrl ?? null,
    type: p.type ?? 'manga',
  }))
  const { error } = await supabase
    .from('subscriptions')
    .upsert(rows, { onConflict: 'user_id,id' })
  if (error) throw error
}

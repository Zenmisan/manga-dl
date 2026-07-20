/**
 * Smart URL System for manga-dl
 * Generates clean, human-readable URLs for manga detail and reader views.
 * Format: /read/:slug-:extCode/:chapterSlug
 * Example: /read/solo-leveling-as/ch-179
 */

const PROVIDER_INITIALS_MAP: Record<string, string> = {
  // Built-in & Primary Extensions
  asurascans: 'as',
  asura: 'as',
  mangadex: 'md',
  omegascans: 'os',
  omega: 'os',
  mangakatana: 'mk',

  // Major Scanlation Groups & Extensions
  flamescans: 'fl',
  flamecomics: 'fl',
  reaperscans: 'rs',
  manganato: 'mn',
  mangakakalot: 'mk',
  batoto: 'bt',
  bato: 'bt',
  comick: 'ck',
  luminous: 'lm',
  kurokami: 'kk',
  zeroscans: 'zs',
  drakescans: 'ds',
  voidscans: 'vs',
  resetscans: 'rt',
  realmscans: 'rm',
  cosmicscans: 'cs',
  manhwaclan: 'mc',
  manhwatop: 'mt',
  mangatown: 'mw',
  mangafox: 'mf',
  fanfox: 'mf',
  mangapark: 'mp',
  mangahere: 'mh',
  mangasee: 'ms',
  manga4life: 'm4',
  readmanga: 'rm',
  webtoons: 'wt',
  webtoon: 'wt',
  tapas: 'tp',
  tappytoon: 'tt',
  toomics: 'tm',
  lezhin: 'lz',
  manhuaplus: 'mp',
  manhuagui: 'mg',
  nh: 'nh',
  nhentai: 'nh',

  // Self-Hosted Servers & Local Storage
  komga: 'kg',
  suwayomi: 'sy',
  kavita: 'kv',
  local: 'lc',
}

/**
 * Returns 2-letter initials for a provider ID (e.g. 'asurascans' -> 'as')
 */
export function getProviderInitials(providerId: string): string {
  if (!providerId) return 'om'
  const cleanProvider = providerId.toLowerCase().replace(/^.*?\./, '').replace(/[^a-z0-9]/g, '')

  for (const [key, code] of Object.entries(PROVIDER_INITIALS_MAP)) {
    if (cleanProvider.includes(key)) return code
  }

  // Fallback: take first 2 letters
  return cleanProvider.slice(0, 2) || 'om'
}

/**
 * Converts any string (e.g. Manga Title) to a clean, kebab-case URL slug
 */
export function toSlug(text: string): string {
  if (!text) return 'manga'
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except space & hyphen
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, '') || 'manga'
}

/**
 * Creates a smart slug combining manga title + extension 2-letter code
 * Example: "Solo Leveling", "asurascans" -> "solo-leveling-as"
 */
export function createSmartSlug(mangaTitle: string, providerId: string): string {
  const titleSlug = toSlug(mangaTitle)
  const extCode = getProviderInitials(providerId)
  return `${titleSlug}-${extCode}`
}

/**
 * Converts a chapter ID or title into a clean slug (e.g. "ch-179" or "179")
 */
export function toChapterSlug(chapterId: string, chapterTitle?: string): string {
  if (chapterTitle && /^ch(apter)?\s*\d+/i.test(chapterTitle)) {
    return toSlug(chapterTitle)
  }
  const cleanId = chapterId.replace(/^.*[/:=]/, '')
  if (/^\d+(\.\d+)?$/.test(cleanId)) return `ch-${cleanId}`
  return toSlug(cleanId) || 'ch-1'
}

/**
 * Encodes reading context into legacy base64 format for payload compatibility
 */
export function encodeOnlineParam(
  provider: string,
  mangaId: string,
  chapterId: string,
  mangaTitle: string,
  chapterTitle?: string
): string {
  const payload = `${provider}:${mangaId}:${chapterId}:${mangaTitle}:${chapterTitle ?? ''}`
  return btoa(unescape(encodeURIComponent(payload)))
}

/**
 * Generates a clean Smart Read URL for any online chapter.
 * Example output: /read/solo-leveling-as/ch-179?ctx=c29sby...
 */
export function buildSmartReadUrl(
  provider: string = 'manga',
  mangaId: string = '',
  chapterId: string = '',
  mangaTitle: string = 'manga',
  chapterTitle?: string
): string {
  const smartSlug = createSmartSlug(mangaTitle, provider)
  const chSlug = toChapterSlug(chapterId, chapterTitle)
  const legacyParam = encodeOnlineParam(provider, mangaId, chapterId, mangaTitle, chapterTitle)

  // Cache in localStorage for direct URL visits without query parameters
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`smart-ctx:${smartSlug}:${chSlug}`, legacyParam)
      localStorage.setItem(`smart-ctx:${smartSlug}:latest`, legacyParam)
    } catch { /* non-fatal */ }
  }

  return `/read/${smartSlug}/${chSlug}?ctx=${encodeURIComponent(legacyParam)}`
}

/**
 * Resolves legacy base64 string from smart URL parameters
 */
export function resolveSmartContext(smartSlug: string, chapterSlug: string, ctxQuery?: string | null): string | null {
  if (ctxQuery) return ctxQuery

  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(`smart-ctx:${smartSlug}:${chapterSlug}`) ||
                   localStorage.getItem(`smart-ctx:${smartSlug}:latest`)
    if (cached) return cached
  }

  return null
}

export type SourceHealthStatus = 'operational' | 'cloudflare' | 'offline' | 'degraded'

export interface SourceHealthInfo {
  status: SourceHealthStatus
  badge: string
  reason: string
}

export const KNOWN_SOURCE_HEALTH: Record<string, SourceHealthInfo> = {
  mangakakalot: {
    status: 'cloudflare',
    badge: 'Cloudflare',
    reason: 'Cloudflare Turnstile challenge barrier',
  },
  scribblehub: {
    status: 'cloudflare',
    badge: 'Cloudflare',
    reason: 'Cloudflare bot challenge protection',
  },
  ranobes: {
    status: 'cloudflare',
    badge: 'Cloudflare',
    reason: 'Cloudflare bot challenge protection',
  },
  manganato: {
    status: 'offline',
    badge: 'Domain Offline',
    reason: 'Domain parked or moved to third-party host',
  },
  novelarrow: {
    status: 'offline',
    badge: 'Dead DNS',
    reason: 'Host DNS resolution failure',
  },
  lightnovelworld: {
    status: 'offline',
    badge: 'Merged',
    reason: 'Source merged into Chikari',
  },
}

export function getSourceHealth(sourceId: string): SourceHealthInfo | null {
  return KNOWN_SOURCE_HEALTH[sourceId] || null
}

const STORAGE_KEY = 'manga-dl-enabled-sources'
const DEFAULT_SOURCES = ['mangakatana', 'mangadex', 'asurascans', 'omegascans']

export function getEnabledSources(allAvailableSourceIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const defaults = DEFAULT_SOURCES.filter(id => allAvailableSourceIds.includes(id))
      return defaults.length > 0 ? defaults : allAvailableSourceIds
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Filter against valid available sources
      const valid = parsed.filter((id: string) => allAvailableSourceIds.includes(id))
      return valid.length > 0 ? valid : allAvailableSourceIds
    }
  } catch {
    /* fallback to all */
  }
  return allAvailableSourceIds
}

/**
 * Toggles a source on or off.
 * Enforces the rule: At least one source must remain enabled!
 */
export function toggleSource(
  sourceId: string,
  allAvailableSourceIds: string[]
): { success: boolean; enabled: string[]; message?: string } {
  const current = getEnabledSources(allAvailableSourceIds)
  const isCurrentlyEnabled = current.includes(sourceId)

  if (isCurrentlyEnabled) {
    // Attempting to disable
    if (current.length <= 1) {
      return {
        success: false,
        enabled: current,
        message: 'At least one source must remain enabled for search to work.',
      }
    }
    const updated = current.filter(id => id !== sourceId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return { success: true, enabled: updated }
  } else {
    // Enabling
    const updated = [...current, sourceId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return { success: true, enabled: updated }
  }
}

/**
 * Enables all available sources.
 */
export function enableAllSources(allAvailableSourceIds: string[]): string[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allAvailableSourceIds))
  return allAvailableSourceIds
}

/**
 * Checks if a specific source is enabled.
 */
export function isSourceEnabled(sourceId: string, allAvailableSourceIds: string[]): boolean {
  const enabled = getEnabledSources(allAvailableSourceIds)
  return enabled.includes(sourceId)
}

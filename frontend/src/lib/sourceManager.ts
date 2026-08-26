const STORAGE_KEY = 'manga-dl-enabled-sources'

/**
 * Retrieves the list of currently enabled source IDs.
 * If none are saved, all available sources default to enabled.
 */
export function getEnabledSources(allAvailableSourceIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return allAvailableSourceIds
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

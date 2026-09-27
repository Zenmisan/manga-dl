import { getAllLocalManga, type LocalMangaEntry } from './localLibrary'
import { parseArchiveFilename } from './archiveInspector'

export interface SiblingBatchMatch {
  nextEntry?: LocalMangaEntry
  nextTauriPath?: string
}

function isSameSeries(entryTitle: string, seriesTitle: string, entry: LocalMangaEntry): boolean {
  const clean = seriesTitle.toLowerCase().trim()
  const et = entryTitle.toLowerCase().trim()
  return (
    et.includes(clean) ||
    clean.includes(et) ||
    !!(entry.seriesTitle && entry.seriesTitle.toLowerCase().includes(clean))
  )
}

/**
 * Searches stored local manga in IndexedDB for the next batch of a series after currentRangeEnd.
 * Tolerates gaps — finds the closest batch whose chapters start after currentRangeEnd.
 */
export async function findNextBatchInIndexedDB(
  seriesTitle: string,
  currentRangeEnd: number
): Promise<LocalMangaEntry | null> {
  const all = await getAllLocalManga()
  const cleanTitle = seriesTitle.toLowerCase().trim()

  let best: LocalMangaEntry | null = null
  let bestStart = Infinity

  for (const entry of all) {
    const meta = parseArchiveFilename(entry.filename || entry.title)
    const entryTitle = (entry.title || meta.seriesTitle).toLowerCase().trim()
    if (!isSameSeries(entryTitle, cleanTitle, entry)) continue

    if (meta.rangeStart !== undefined && meta.rangeEnd !== undefined) {
      if (meta.rangeStart > currentRangeEnd && meta.rangeStart < bestStart) {
        best = entry
        bestStart = meta.rangeStart
      }
    } else if (entry.chaptersSummary) {
      const nextNum = entry.chaptersSummary
        .map(c => c.number)
        .filter(n => n > currentRangeEnd)
        .sort((a, b) => a - b)[0]
      if (nextNum !== undefined && nextNum < bestStart) {
        best = entry
        bestStart = nextNum
      }
    }
  }

  return best
}

/**
 * Searches stored local manga in IndexedDB for the previous batch of a series before currentRangeStart.
 * Tolerates gaps — finds the closest batch whose chapters end before currentRangeStart.
 */
export async function findPrevBatchInIndexedDB(
  seriesTitle: string,
  currentRangeStart: number
): Promise<LocalMangaEntry | null> {
  const all = await getAllLocalManga()
  const cleanTitle = seriesTitle.toLowerCase().trim()

  let best: LocalMangaEntry | null = null
  let bestEnd = -Infinity

  for (const entry of all) {
    const meta = parseArchiveFilename(entry.filename || entry.title)
    const entryTitle = (entry.title || meta.seriesTitle).toLowerCase().trim()
    if (!isSameSeries(entryTitle, cleanTitle, entry)) continue

    if (meta.rangeStart !== undefined && meta.rangeEnd !== undefined) {
      if (meta.rangeEnd < currentRangeStart && meta.rangeEnd > bestEnd) {
        best = entry
        bestEnd = meta.rangeEnd
      }
    } else if (entry.chaptersSummary) {
      const prevNum = entry.chaptersSummary
        .map(c => c.number)
        .filter(n => n < currentRangeStart)
        .sort((a, b) => b - a)[0]
      if (prevNum !== undefined && prevNum > bestEnd) {
        best = entry
        bestEnd = prevNum
      }
    }
  }

  return best
}

/**
 * For Tauri Desktop: scans parent directory of the current file to find the next sequential archive.
 */
export async function findSiblingArchiveInTauri(
  currentFilePath: string,
  currentRangeEnd: number
): Promise<string | null> {
  if (!('__TAURI_INTERNALS__' in window)) return null

  try {
    const { readDir } = await import('@tauri-apps/plugin-fs')
    const lastSlash = Math.max(currentFilePath.lastIndexOf('/'), currentFilePath.lastIndexOf('\\'))
    if (lastSlash === -1) return null

    const parentDir = currentFilePath.substring(0, lastSlash)
    const currentFileName = currentFilePath.substring(lastSlash + 1)
    const currentMeta = parseArchiveFilename(currentFileName)

    const entries = await readDir(parentDir)
    const validArchives = entries.filter(
      e => e.isFile && (e.name.endsWith('.cbz') || e.name.endsWith('.zip') || e.name.endsWith('.epub'))
    )

    let bestPath: string | null = null
    let bestStart = Infinity
    for (const entry of validArchives) {
      if (entry.name === currentFileName) continue
      const meta = parseArchiveFilename(entry.name)
      const cleanEntryTitle = meta.seriesTitle.toLowerCase().trim()
      const cleanCurrentTitle = currentMeta.seriesTitle.toLowerCase().trim()

      if (
        cleanEntryTitle.includes(cleanCurrentTitle) ||
        cleanCurrentTitle.includes(cleanEntryTitle)
      ) {
        if (
          meta.rangeStart !== undefined &&
          meta.rangeStart > currentRangeEnd &&
          meta.rangeStart < bestStart
        ) {
          bestPath = `${parentDir}/${entry.name}`
          bestStart = meta.rangeStart
        }
      }
    }
    if (bestPath) return bestPath
  } catch (err) {
    console.warn('[batchDetector] Failed to scan Tauri parent directory:', err)
  }

  return null
}

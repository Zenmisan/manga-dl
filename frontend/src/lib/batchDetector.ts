import { getAllLocalManga, type LocalMangaEntry } from './localLibrary'
import { parseArchiveFilename } from './archiveInspector'

export interface SiblingBatchMatch {
  nextEntry?: LocalMangaEntry
  nextTauriPath?: string
  expectedNextChapter: number
}

/**
 * Predicts the next expected chapter number given the current chapter / range end
 */
export function getNextExpectedChapter(currentRangeEnd: number): number {
  return currentRangeEnd + 1
}

/**
 * Searches stored local manga in IndexedDB for the next sequential batch of a series.
 * e.g. If current was chapters 1-10 of "Solo Leveling", finds the entry covering chapter 11.
 */
export async function findNextBatchInIndexedDB(
  seriesTitle: string,
  currentRangeEnd: number
): Promise<LocalMangaEntry | null> {
  const all = await getAllLocalManga()
  const cleanTitle = seriesTitle.toLowerCase().trim()
  const expectedNext = getNextExpectedChapter(currentRangeEnd)

  for (const entry of all) {
    const meta = parseArchiveFilename(entry.filename || entry.title)
    const entryTitle = (entry.title || meta.seriesTitle).toLowerCase().trim()

    // Check if it belongs to same series and contains the next chapter
    if (
      entryTitle.includes(cleanTitle) ||
      cleanTitle.includes(entryTitle) ||
      (entry.seriesTitle && entry.seriesTitle.toLowerCase().includes(cleanTitle))
    ) {
      if (meta.rangeStart !== undefined && meta.rangeEnd !== undefined) {
        if (expectedNext >= meta.rangeStart && expectedNext <= meta.rangeEnd) {
          return entry
        }
      } else if (entry.chaptersSummary && entry.chaptersSummary.some(c => c.number === expectedNext)) {
        return entry
      }
    }
  }

  return null
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
    const expectedNext = getNextExpectedChapter(currentRangeEnd)

    const entries = await readDir(parentDir)
    const validArchives = entries.filter(
      e => e.isFile && (e.name.endsWith('.cbz') || e.name.endsWith('.zip') || e.name.endsWith('.epub'))
    )

    for (const entry of validArchives) {
      if (entry.name === currentFileName) continue
      const meta = parseArchiveFilename(entry.name)
      const cleanEntryTitle = meta.seriesTitle.toLowerCase().trim()
      const cleanCurrentTitle = currentMeta.seriesTitle.toLowerCase().trim()

      if (
        cleanEntryTitle.includes(cleanCurrentTitle) ||
        cleanCurrentTitle.includes(cleanEntryTitle)
      ) {
        if (meta.rangeStart !== undefined && meta.rangeEnd !== undefined) {
          if (expectedNext >= meta.rangeStart && expectedNext <= meta.rangeEnd) {
            return `${parentDir}/${entry.name}`
          }
        }
      }
    }
  } catch (err) {
    console.warn('[batchDetector] Failed to scan Tauri parent directory:', err)
  }

  return null
}

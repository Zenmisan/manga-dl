import JSZip from 'jszip'

export interface ParsedLocalChapter {
  id: string
  chapterNumber: number
  title: string
  imageFileNames: string[]
}

export interface ParsedArchive {
  seriesTitle: string
  isMultiChapter: boolean
  rangeStart?: number
  rangeEnd?: number
  chapters: ParsedLocalChapter[]
  coverBlob?: Blob
}

const VALID_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']

/**
 * Natural sort comparator for alphanumeric strings (e.g. 'Chapter 2' before 'Chapter 10')
 */
export function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Extract series title, chapter number, and range from archive name
 * e.g. "Solo_Leveling_01-10.zip" -> { seriesTitle: "Solo Leveling", rangeStart: 1, rangeEnd: 10 }
 * e.g. "One_Piece_Chapter_1080.cbz" -> { seriesTitle: "One Piece", rangeStart: 1080, rangeEnd: 1080 }
 */
export function parseArchiveFilename(filename: string) {
  const clean = filename.replace(/\.(cbz|zip|epub|cbr)$/i, '')

  // Range detection: e.g. "01-10", "11-20", "ch01-ch10", "c1-c10"
  const rangeMatch = clean.match(/(?:ch(?:apter)?\.?\s*|c)?(\d+)\s*[-–_to]+\s*(?:ch(?:apter)?\.?\s*|c)?(\d+)/i)
  let rangeStart: number | undefined
  let rangeEnd: number | undefined

  if (rangeMatch) {
    rangeStart = parseInt(rangeMatch[1], 10)
    rangeEnd = parseInt(rangeMatch[2], 10)
    if (rangeStart > rangeEnd) {
      const temp = rangeStart
      rangeStart = rangeEnd
      rangeEnd = temp
    }
  }

  // Single chapter detection: e.g. "Chapter 105", "Ch.105", "c105", "v01_ch05"
  const singleChMatch = clean.match(/(?:ch(?:apter)?\.?\s*|c)(\d+(?:\.\d+)?)/i) ||
                        clean.match(/(?:^|[^\d])(\d+(?:\.\d+)?)(?:$|[^\d])/i)

  const singleCh = singleChMatch ? parseFloat(singleChMatch[1]) : undefined

  // Series title extraction
  let seriesTitle = clean
  if (rangeMatch && rangeMatch.index !== undefined && rangeMatch.index > 0) {
    seriesTitle = clean.substring(0, rangeMatch.index)
  } else if (singleChMatch && singleChMatch.index !== undefined && singleChMatch.index > 0) {
    seriesTitle = clean.substring(0, singleChMatch.index)
  }

  seriesTitle = seriesTitle
    .replace(/[\[\(][^\]\)]*[\]\)]/g, ' ') // Strip [Group] or (v01) tags
    .replace(/[-_.]+/g, ' ')
    .trim()

  return {
    seriesTitle: seriesTitle || clean,
    rangeStart: rangeStart ?? singleCh,
    rangeEnd: rangeEnd ?? singleCh,
    isRange: !!rangeMatch
  }
}

/**
 * Parses chapter number from folder or file name
 * e.g. "Chapter 1", "Ch. 02", "10", "c05.5" -> 1, 2, 10, 5.5
 */
export function extractChapterNumber(name: string, fallbackIndex = 1): number {
  const match = name.match(/(?:ch(?:apter)?\.?\s*|c)?(\d+(?:\.\d+)?)/i)
  if (match) {
    const parsed = parseFloat(match[1])
    if (!isNaN(parsed)) return parsed
  }
  return fallbackIndex
}

/**
 * Inspect an archive (.zip/.cbz) and group its contents into discrete chapters.
 * Supports:
 * - MangaKatana 10-chapter subfolder format (Chapter 1/, Chapter 2/, ...)
 * - Flat single-chapter archives (01.jpg, 02.jpg, ...)
 * - Nested folder hierarchy
 */
export async function inspectArchive(fileOrBlob: Blob, originalFilename = 'manga.cbz'): Promise<ParsedArchive> {
  const zip = await JSZip.loadAsync(fileOrBlob)
  const meta = parseArchiveFilename(originalFilename)

  const allFilePaths = Object.keys(zip.files).filter(path => {
    const entry = zip.files[path]
    return !entry.dir && VALID_IMAGE_EXTS.some(ext => path.toLowerCase().endsWith(ext))
  })

  if (allFilePaths.length === 0) {
    throw new Error('No valid image files (.png, .jpg, .webp) found inside the archive.')
  }

  // Detect directory structures (e.g. "Chapter 1/01.jpg", "Solo_Leveling_01/01.jpg")
  const directoryMap = new Map<string, string[]>()
  const rootFiles: string[] = []

  for (const path of allFilePaths) {
    const parts = path.split('/').filter(p => p.trim().length > 0)
    if (parts.length > 1) {
      // Subdirectory exists - use first directory level as chapter container
      const dirName = parts[0]
      if (!directoryMap.has(dirName)) {
        directoryMap.set(dirName, [])
      }
      directoryMap.get(dirName)!.push(path)
    } else {
      rootFiles.push(path)
    }
  }

  const chapters: ParsedLocalChapter[] = []

  if (directoryMap.size > 1) {
    // Pattern A: Multi-chapter archive with subfolders (MangaKatana 10-chapter format)
    const sortedDirNames = Array.from(directoryMap.keys()).sort(naturalSort)

    let idx = 1
    for (const dirName of sortedDirNames) {
      const imgPaths = directoryMap.get(dirName)!
      imgPaths.sort(naturalSort)

      const chNum = extractChapterNumber(dirName, meta.rangeStart ? meta.rangeStart + (idx - 1) : idx)
      chapters.push({
        id: `ch-${chNum}`,
        chapterNumber: chNum,
        title: dirName.replace(/[-_]+/g, ' ').trim() || `Chapter ${chNum}`,
        imageFileNames: imgPaths
      })
      idx++
    }
  } else if (directoryMap.size === 1 && rootFiles.length === 0) {
    // Single subfolder containing all images
    const singleDir = Array.from(directoryMap.keys())[0]
    const imgPaths = directoryMap.get(singleDir)!
    imgPaths.sort(naturalSort)

    const chNum = extractChapterNumber(singleDir, meta.rangeStart || 1)
    chapters.push({
      id: `ch-${chNum}`,
      chapterNumber: chNum,
      title: singleDir.replace(/[-_]+/g, ' ').trim() || `Chapter ${chNum}`,
      imageFileNames: imgPaths
    })
  } else {
    // Pattern B: Flat archive (Standard single chapter)
    const allImages = [...rootFiles, ...Array.from(directoryMap.values()).flat()]
    allImages.sort(naturalSort)

    const chNum = meta.rangeStart || 1
    chapters.push({
      id: `ch-${chNum}`,
      chapterNumber: chNum,
      title: meta.isRange ? `${meta.seriesTitle} (${meta.rangeStart}-${meta.rangeEnd})` : `Chapter ${chNum}`,
      imageFileNames: allImages
    })
  }

  // Sort chapters numerically
  chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)

  return {
    seriesTitle: meta.seriesTitle,
    isMultiChapter: chapters.length > 1,
    rangeStart: chapters[0]?.chapterNumber,
    rangeEnd: chapters[chapters.length - 1]?.chapterNumber,
    chapters
  }
}

/**
 * Extracts image Blob URLs for a specific chapter from a loaded JSZip instance
 */
export async function extractChapterPages(zip: JSZip, imagePaths: string[]): Promise<string[]> {
  const urls: string[] = []
  for (const path of imagePaths) {
    const zipEntry = zip.files[path]
    if (zipEntry) {
      const blob = await zipEntry.async('blob')
      urls.push(URL.createObjectURL(blob))
    }
  }
  return urls
}

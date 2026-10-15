import JSZip from 'jszip'
import { inspectArchive, extractChapterPages, normalizeZipPath, extractChapterNumber, type ParsedLocalChapter } from './archiveInspector'

const DB_NAME = 'manga-dl-local'
const DB_VERSION = 1
const STORE = 'local-manga'

export interface LocalChapterMeta {
  id: string
  number: number
  title: string
  filePath?: string
}

export interface LocalMangaEntry {
  id: string
  title: string
  seriesTitle?: string
  filename: string
  fileSize: number
  addedAt: number
  file: Blob
  filePath?: string
  chaptersCount?: number
  rangeStart?: number
  rangeEnd?: number
  chaptersSummary?: LocalChapterMeta[]
  type?: 'manga' | 'novel'
}

/**
 * Normalizes a title by stripping extensions, bracketed tags, volume/chapter indicators,
 * and punctuation to group sibling archives belonging to the same series.
 */
export function normalizeTitleForGrouping(title: string): string {
  if (!title) return ''
  return title
    .toLowerCase()
    .replace(/\.(cbz|zip|epub|cbr)$/i, '')
    .replace(/[\[\(][^\]\)]*[\]\)]/g, ' ')
    .replace(/(?:ch(?:apter)?\.?\s*|c)?\d+\s*[-–_to]+\s*(?:ch(?:apter)?\.?\s*|c)?\d+/gi, '')
    .replace(/(?:ch(?:apter)?\.?\s*|c)\d+(?:\.\d+)?/gi, '')
    .replace(/(?:vol(?:ume)?\.?\s*|v)\d+/gi, '')
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Finds all archives in local library that belong to the same series as the given entry.
 */
export function getRelatedLocalArchives(entry: LocalMangaEntry, allEntries: LocalMangaEntry[]): LocalMangaEntry[] {
  const targetSeries = (entry.seriesTitle || '').toLowerCase().trim()
  const targetNorm = normalizeTitleForGrouping(entry.seriesTitle || entry.title)

  return allEntries
    .filter(x => {
      if (x.id === entry.id) return true
      const xSeries = (x.seriesTitle || '').toLowerCase().trim()
      if (targetSeries && xSeries && targetSeries === xSeries) return true
      const xNorm = normalizeTitleForGrouping(x.seriesTitle || x.title)
      if (targetNorm && xNorm && targetNorm === xNorm) return true
      if (targetSeries && xNorm && (xNorm.includes(targetSeries) || targetSeries.includes(xNorm))) return true
      if (xSeries && targetNorm && (targetNorm.includes(xSeries) || xSeries.includes(targetNorm))) return true
      return false
    })
    .sort((a, b) => a.addedAt - b.addedAt)
}

export interface LocalMangaSession {
  title: string
  chapterTitle: string
  currentChapterId: string
  currentChapterNumber: number
  chapters: LocalChapterMeta[]
  pages: string[]
  rawFile?: Blob
  localId?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveLocalManga(entry: LocalMangaEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllLocalManga(): Promise<LocalMangaEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getLocalManga(id: string): Promise<LocalMangaEntry | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(tx.error)
  })
}

export async function findLocalMangaByTitleOrFilename(identifier: string): Promise<LocalMangaEntry | undefined> {
  const all = await getAllLocalManga()
  const clean = decodeURIComponent(identifier).toLowerCase().trim()
  return all.find(
    entry =>
      entry.id === identifier ||
      entry.title.toLowerCase().trim() === clean ||
      entry.filename.toLowerCase().trim() === clean ||
      (entry.seriesTitle && entry.seriesTitle.toLowerCase().trim() === clean)
  )
}

export async function deleteLocalManga(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// In-memory cache of parsed zip instances to avoid re-parsing on chapter transitions
const zipCache = new Map<string, { zip: JSZip; chapters: ParsedLocalChapter[] }>()

/**
 * Loads a local manga archive into memory and extracts the target chapter.
 * Handles:
 * - MangaKatana 10-chapter batch files (extracts only the selected chapter)
 * - Automatic discovery of next chapters in the same archive
 * - Seamless stitching of next batch archives from IndexedDB
 */
export async function loadLocalMangaIntoSession(
  idOrTitle: string,
  targetChapterIdOrNum?: string | number
): Promise<boolean> {
  let entry = await getLocalManga(idOrTitle)
  if (!entry) {
    entry = await findLocalMangaByTitleOrFilename(idOrTitle)
  }
  if (!entry) return false

  let cached = zipCache.get(entry.id)
  let zip: JSZip
  let parsedChapters: ParsedLocalChapter[]

  if (cached) {
    zip = cached.zip
    parsedChapters = cached.chapters
  } else {
    zip = await JSZip.loadAsync(entry.file)
    const inspection = await inspectArchive(entry.file, entry.filename)
    parsedChapters = inspection.chapters
    zipCache.set(entry.id, { zip, chapters: parsedChapters })
  }

  if (parsedChapters.length === 0) return false

  // Determine active chapter
  let activeChapter: ParsedLocalChapter | undefined

  if (targetChapterIdOrNum !== undefined && targetChapterIdOrNum !== null && targetChapterIdOrNum !== '') {
    const rawTarget = String(targetChapterIdOrNum)
    const cleanTarget = rawTarget.includes(':') ? rawTarget.split(':')[1] : rawTarget
    const num = typeof targetChapterIdOrNum === 'number' ? targetChapterIdOrNum : parseFloat(cleanTarget.replace(/[^0-9.]/g, ''))
    activeChapter = parsedChapters.find(
      c => c.id === cleanTarget ||
           c.id === rawTarget ||
           c.filePath === cleanTarget ||
           (!isNaN(num) && c.chapterNumber === num)
    )
  }

  if (!activeChapter) {
    activeChapter = parsedChapters[0]
  }

  // Extract page Blobs for the active chapter
  const blobs = await extractChapterPages(zip, activeChapter.imageFileNames)

  // Build full list of chapters across all uploaded archives sharing this series title
  const allEntries = await getAllLocalManga()
  const related = getRelatedLocalArchives(entry, allEntries)

  const fullChapterList: LocalChapterMeta[] = []

  if (related.length > 0) {
    for (const rel of related) {
      if (rel.id === entry.id) {
        // For currently loaded archive, use its inspected parsedChapters
        for (const ch of parsedChapters) {
          if (!fullChapterList.some(existing => existing.number === ch.chapterNumber && existing.id === ch.id)) {
            fullChapterList.push({
              id: ch.id,
              number: ch.chapterNumber,
              title: ch.title,
              filePath: ch.filePath,
            })
          }
        }
      } else if (rel.chaptersSummary && rel.chaptersSummary.length > 0) {
        // For sibling archives with chaptersSummary, use compound ID
        for (const ch of rel.chaptersSummary) {
          if (!fullChapterList.some(existing => existing.number === ch.number)) {
            fullChapterList.push({
              id: `${rel.id}:${ch.id}`,
              number: ch.number,
              title: ch.title,
              filePath: ch.filePath,
            })
          }
        }
      } else {
        // Fallback for sibling archive without chaptersSummary
        const chStart = rel.rangeStart ?? extractChapterNumber(rel.filename || rel.title, 1)
        const chEnd = rel.rangeEnd && rel.rangeEnd >= chStart ? rel.rangeEnd : chStart
        for (let n = chStart; n <= chEnd; n++) {
          if (!fullChapterList.some(existing => existing.number === n)) {
            fullChapterList.push({
              id: `${rel.id}:ch-${n}`,
              number: n,
              title: chStart === chEnd ? (rel.title || `Chapter ${n}`) : `Chapter ${n}`,
            })
          }
        }
      }
    }
  } else {
    for (const ch of parsedChapters) {
      fullChapterList.push({
        id: ch.id,
        number: ch.chapterNumber,
        title: ch.title,
        filePath: ch.filePath,
      })
    }
  }

  fullChapterList.sort((a, b) => a.number - b.number)

  const sessionObj: LocalMangaSession = {
    title: entry.title,
    chapterTitle: activeChapter.title,
    currentChapterId: activeChapter.id,
    currentChapterNumber: activeChapter.chapterNumber,
    chapters: fullChapterList,
    pages: blobs,
    rawFile: entry.file,
    localId: entry.id
  }

  ;(window as unknown as Record<string, unknown>).__LOCAL_MANGA_SESSION__ = sessionObj

  return true
}

export interface LocalNovelChapterResult {
  content: string
  title: string
  chapterTitle: string
  chapters: LocalChapterMeta[]
}

/**
 * Loads a specific chapter from a local novel EPUB archive, resolves inline images,
 * and returns readable HTML for the NovelViewport.
 */
export async function loadLocalNovelChapter(
  idOrTitle: string,
  targetChapterIdOrNum?: string | number
): Promise<LocalNovelChapterResult> {
  let entry = await getLocalManga(idOrTitle)
  if (!entry) {
    entry = await findLocalMangaByTitleOrFilename(idOrTitle)
  }
  if (!entry) {
    throw new Error(`Local entry "${idOrTitle}" not found.`)
  }

  const zip = await JSZip.loadAsync(entry.file)
  const inspection = await inspectArchive(entry.file, entry.filename)

  if (inspection.chapters.length === 0) {
    throw new Error('No chapters found in local novel archive.')
  }

  let activeChapter: ParsedLocalChapter | undefined
  if (targetChapterIdOrNum !== undefined && targetChapterIdOrNum !== null && targetChapterIdOrNum !== '') {
    const rawTarget = decodeURIComponent(String(targetChapterIdOrNum))
    const num = typeof targetChapterIdOrNum === 'number'
      ? targetChapterIdOrNum
      : parseFloat(rawTarget.replace(/[^0-9.]/g, ''))
    activeChapter = inspection.chapters.find(
      c => c.id === rawTarget ||
           c.filePath === rawTarget ||
           c.id.endsWith(rawTarget) ||
           (!isNaN(num) && c.chapterNumber === num)
    )
  }

  if (!activeChapter) {
    activeChapter = inspection.chapters[0]
  }

  const targetPath = activeChapter.filePath || activeChapter.id
  let chapterFile = zip.files[targetPath]
  if (!chapterFile) {
    const matchedKey = Object.keys(zip.files).find(
      k => k.toLowerCase() === targetPath.toLowerCase() || k.toLowerCase().endsWith(targetPath.toLowerCase())
    )
    if (matchedKey) chapterFile = zip.files[matchedKey]
  }

  if (!chapterFile) {
    throw new Error(`Chapter file "${targetPath}" not found in archive.`)
  }

  const rawHtml = await chapterFile.async('text')
  const parser = new DOMParser()
  const doc = parser.parseFromString(rawHtml, 'text/html')
  const chapterDir = targetPath.includes('/') ? targetPath.substring(0, targetPath.lastIndexOf('/') + 1) : ''

  // Resolve embedded images into blob URLs
  const imgElements = Array.from(doc.querySelectorAll('img, image'))
  for (const img of imgElements) {
    const rawSrc = img.getAttribute('src') || img.getAttribute('href') || img.getAttribute('xlink:href')
    if (rawSrc && !rawSrc.startsWith('http') && !rawSrc.startsWith('data:') && !rawSrc.startsWith('blob:')) {
      const cleanSrc = rawSrc.split('#')[0].split('?')[0]
      const resolved = normalizeZipPath(chapterDir + cleanSrc)
      const imgKey = Object.keys(zip.files).find(
        k => k.toLowerCase() === resolved.toLowerCase() || k.toLowerCase().endsWith(cleanSrc.toLowerCase())
      )
      if (imgKey && zip.files[imgKey]) {
        try {
          const blob = await zip.files[imgKey].async('blob')
          const blobUrl = URL.createObjectURL(blob)
          if (img.tagName.toLowerCase() === 'image') {
            img.setAttribute('href', blobUrl)
          } else {
            img.setAttribute('src', blobUrl)
          }
        } catch { /* skip */ }
      }
    }
  }

  const allEntries = await getAllLocalManga()
  const related = getRelatedLocalArchives(entry, allEntries)

  const chaptersMeta: LocalChapterMeta[] = []
  if (related.length > 0) {
    for (const rel of related) {
      if (rel.id === entry.id) {
        for (const c of inspection.chapters) {
          if (!chaptersMeta.some(existing => existing.id === c.id || existing.number === c.chapterNumber)) {
            chaptersMeta.push({
              id: c.id,
              number: c.chapterNumber,
              title: c.title,
              filePath: c.filePath,
            })
          }
        }
      } else if (rel.chaptersSummary && rel.chaptersSummary.length > 0) {
        for (const ch of rel.chaptersSummary) {
          if (!chaptersMeta.some(existing => existing.number === ch.number)) {
            chaptersMeta.push({
              id: `${rel.id}:${ch.id}`,
              number: ch.number,
              title: ch.title,
              filePath: ch.filePath,
            })
          }
        }
      } else {
        const chStart = rel.rangeStart ?? extractChapterNumber(rel.filename || rel.title, 1)
        const chEnd = rel.rangeEnd && rel.rangeEnd >= chStart ? rel.rangeEnd : chStart
        for (let n = chStart; n <= chEnd; n++) {
          if (!chaptersMeta.some(existing => existing.number === n)) {
            chaptersMeta.push({
              id: `${rel.id}:ch-${n}`,
              number: n,
              title: chStart === chEnd ? (rel.title || `Chapter ${n}`) : `Chapter ${n}`,
            })
          }
        }
      }
    }
  } else {
    for (const c of inspection.chapters) {
      chaptersMeta.push({
        id: c.id,
        number: c.chapterNumber,
        title: c.title,
        filePath: c.filePath,
      })
    }
  }
  chaptersMeta.sort((a, b) => a.number - b.number)

  try {
    localStorage.setItem(`manga-dl-last-chapter:local:${entry.id}`, activeChapter.id)
  } catch { /* quota */ }

  return {
    content: doc.body.innerHTML || rawHtml,
    title: entry.seriesTitle || entry.title,
    chapterTitle: activeChapter.title,
    chapters: chaptersMeta,
  }
}


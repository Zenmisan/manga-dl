import JSZip from 'jszip'
import { inspectArchive, extractChapterPages, type ParsedLocalChapter } from './archiveInspector'
import { findNextBatchInIndexedDB } from './batchDetector'

const DB_NAME = 'manga-dl-local'
const DB_VERSION = 1
const STORE = 'local-manga'

export interface LocalChapterMeta {
  id: string
  number: number
  title: string
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

  if (targetChapterIdOrNum !== undefined && targetChapterIdOrNum !== null) {
    const num = typeof targetChapterIdOrNum === 'number' ? targetChapterIdOrNum : parseFloat(String(targetChapterIdOrNum).replace(/[^0-9.]/g, ''))
    activeChapter = parsedChapters.find(c => c.id === String(targetChapterIdOrNum) || c.chapterNumber === num)
  }

  if (!activeChapter) {
    activeChapter = parsedChapters[0]
  }

  // Extract page Blobs for the active chapter
  const blobs = await extractChapterPages(zip, activeChapter.imageFileNames)

  // Build full list of chapters (including sibling batches if available)
  const fullChapterList: LocalChapterMeta[] = parsedChapters.map(c => ({
    id: c.id,
    number: c.chapterNumber,
    title: c.title
  }))

  // Sibling pre-discovery: check if next batch is in IndexedDB
  const lastCh = parsedChapters[parsedChapters.length - 1]
  if (lastCh) {
    try {
      const nextBatch = await findNextBatchInIndexedDB(entry.seriesTitle || entry.title, lastCh.chapterNumber)
      if (nextBatch && nextBatch.chaptersSummary) {
        for (const ch of nextBatch.chaptersSummary) {
          if (!fullChapterList.some(existing => existing.number === ch.number)) {
            fullChapterList.push({
              id: `${nextBatch.id}:${ch.id}`,
              number: ch.number,
              title: ch.title
            })
          }
        }
      }
    } catch {
      /* non-fatal */
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

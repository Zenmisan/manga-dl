import JSZip from 'jszip'

const DB_NAME = 'manga-dl-local'
const DB_VERSION = 1
const STORE = 'local-manga'

export interface LocalMangaEntry {
  id: string
  title: string
  filename: string
  fileSize: number
  addedAt: number
  file: Blob
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
    req.onerror = () => reject(req.error)
  })
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

export async function loadLocalMangaIntoSession(id: string): Promise<boolean> {
  const entry = await getLocalManga(id)
  if (!entry) return false

  const zip = await JSZip.loadAsync(entry.file)

  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
  const imageFiles: string[] = []

  for (const [path, zipFile] of Object.entries(zip.files)) {
    if (!zipFile.dir && validExtensions.some(ext => path.toLowerCase().endsWith(ext))) {
      imageFiles.push(path)
    }
  }

  imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

  const blobs: string[] = []
  for (const name of imageFiles) {
    const blob = await zip.files[name].async('blob')
    blobs.push(URL.createObjectURL(blob))
  }

  ;(window as any).__LOCAL_MANGA_SESSION__ = {
    title: entry.title,
    pages: blobs,
    rawFile: entry.file,
    localId: id,
  }

  return true
}

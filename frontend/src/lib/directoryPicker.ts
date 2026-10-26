/**
 * File System Access API integration for direct local export/downloading.
 * Allows Chromium browsers (Chrome, Edge, Brave, Opera) to stream .cbz/.epub
 * files directly into a designated local manga folder without browser prompts.
 */

const DB_NAME = 'manga-dl-fs-db'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'manga_root_dir'

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'))
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null
  try {
    const db = await openHandleDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(HANDLE_KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(handle, HANDLE_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function clearSavedDirectoryHandle(): Promise<void> {
  try {
    const db = await openHandleDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(HANDLE_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Ignore cleanup errors
  }
}

export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  readWrite: boolean = true
): Promise<boolean> {
  try {
    const opts: any = { mode: readWrite ? 'readwrite' : 'read' }
    if ((await (handle as any).queryPermission(opts)) === 'granted') {
      return true
    }
    if ((await (handle as any).requestPermission(opts)) === 'granted') {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function sanitizeDirectoryName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'Manga'
}

export async function saveBlobToDirectory(
  rootHandle: FileSystemDirectoryHandle,
  mangaTitle: string,
  fileName: string,
  blob: Blob
): Promise<boolean> {
  try {
    const subfolderName = sanitizeDirectoryName(mangaTitle)
    const folderHandle = await rootHandle.getDirectoryHandle(subfolderName, { create: true })
    const sanitizedFile = sanitizeDirectoryName(fileName)
    const fileHandle = await folderHandle.getFileHandle(sanitizedFile, { create: true })
    const writable = await (fileHandle as any).createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (err) {
    console.warn('[directoryPicker] Failed direct directory write:', err)
    return false
  }
}

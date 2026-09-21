import JSZip from 'jszip'
import { ExtensionManager } from './extensions'
import api from './api'
import { Capacitor } from '@capacitor/core'
import { saveToDeviceStorage } from './nativeDownload'
import { useState, useEffect } from 'react'

export type DownloadStatus =
  | 'queued'
  | 'fetching-pages'
  | 'downloading'
  | 'packaging'
  | 'done'
  | 'failed'
  | 'paused'

export interface ClientDownloadTask {
  id: string // `${provider}:${mangaId}:${chapterId}`
  provider: string
  mangaId: string
  chapterId: string
  mangaTitle: string
  chapterTitle: string
  chapterNumber: number
  status: DownloadStatus
  progress: number // 0-100
  downloadedPages: number
  totalPages: number
  error?: string
  fileName?: string
  fileSizeBytes?: number
  createdAt: number
  completedAt?: number
}

const STORAGE_KEY = 'manga-dl-client-downloads'
const MAX_CONCURRENT_PAGES = 2
const MAX_IN_MEMORY_BLOBS = 3

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim()
}

class ClientDownloader {
  private tasks: ClientDownloadTask[] = []
  private activeTaskId: string | null = null
  private abortController: AbortController | null = null
  private isPaused = false
  private listeners = new Set<() => void>()
  private blobCache = new Map<string, Blob>()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: ClientDownloadTask[] = JSON.parse(raw)
        // Reset any uncompleted tasks from prior session to queued
        this.tasks = parsed.map((t) => {
          if (t.status === 'downloading' || t.status === 'packaging' || t.status === 'fetching-pages') {
            return { ...t, status: 'queued', progress: 0, downloadedPages: 0 }
          }
          return t
        })
      }
    } catch {
      this.tasks = []
    }
  }

  private saveToStorage() {
    try {
      // Persist metadata (exclude blobs)
      const dataToSave = this.tasks.map((t) => ({
        id: t.id,
        provider: t.provider,
        mangaId: t.mangaId,
        chapterId: t.chapterId,
        mangaTitle: t.mangaTitle,
        chapterTitle: t.chapterTitle,
        chapterNumber: t.chapterNumber,
        status: t.status,
        progress: t.progress,
        downloadedPages: t.downloadedPages,
        totalPages: t.totalPages,
        error: t.error,
        fileName: t.fileName,
        fileSizeBytes: t.fileSizeBytes,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave.slice(0, 150)))
    } catch {
      // quota exceeded or private browsing
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.saveToStorage()
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch {
        // ignore subscriber errors
      }
    })
  }

  public getTasks(): ClientDownloadTask[] {
    return [...this.tasks]
  }

  public getPaused(): boolean {
    return this.isPaused
  }

  public isChapterActiveOrQueued(chapterId: string): boolean {
    return this.tasks.some(
      (t) =>
        t.chapterId === chapterId &&
        (t.status === 'queued' ||
          t.status === 'fetching-pages' ||
          t.status === 'downloading' ||
          t.status === 'packaging')
    )
  }

  public getActiveOrQueuedChapterIds(): string[] {
    return this.tasks
      .filter(
        (t) =>
          t.status === 'queued' ||
          t.status === 'fetching-pages' ||
          t.status === 'downloading' ||
          t.status === 'packaging'
      )
      .map((t) => t.chapterId)
  }

  public enqueue(item: {
    provider: string
    mangaId: string
    chapterId: string
    mangaTitle: string
    chapterTitle: string
    chapterNumber: number
  }): string {
    const id = `${item.provider}:${item.mangaId}:${item.chapterId}`
    const existing = this.tasks.find((t) => t.id === id)

    if (existing) {
      if (existing.status === 'done') {
        return id
      }
      if (existing.status === 'failed') {
        existing.status = 'queued'
        existing.progress = 0
        existing.downloadedPages = 0
        existing.error = undefined
        this.notify()
        this.processNext()
        return id
      }
      return id
    }

    const task: ClientDownloadTask = {
      id,
      provider: item.provider,
      mangaId: item.mangaId,
      chapterId: item.chapterId,
      mangaTitle: item.mangaTitle,
      chapterTitle: item.chapterTitle,
      chapterNumber: item.chapterNumber,
      status: 'queued',
      progress: 0,
      downloadedPages: 0,
      totalPages: 0,
      createdAt: Date.now(),
    }

    this.tasks.push(task)
    this.notify()
    this.processNext()
    return id
  }

  public enqueueBulk(
    items: {
      provider: string
      mangaId: string
      chapterId: string
      mangaTitle: string
      chapterTitle: string
      chapterNumber: number
    }[]
  ) {
    items.forEach((item) => {
      const id = `${item.provider}:${item.mangaId}:${item.chapterId}`
      const existing = this.tasks.find((t) => t.id === id)
      if (!existing) {
        this.tasks.push({
          id,
          provider: item.provider,
          mangaId: item.mangaId,
          chapterId: item.chapterId,
          mangaTitle: item.mangaTitle,
          chapterTitle: item.chapterTitle,
          chapterNumber: item.chapterNumber,
          status: 'queued',
          progress: 0,
          downloadedPages: 0,
          totalPages: 0,
          createdAt: Date.now(),
        })
      } else if (existing.status === 'failed') {
        existing.status = 'queued'
        existing.progress = 0
        existing.downloadedPages = 0
        existing.error = undefined
      }
    })
    this.notify()
    this.processNext()
  }

  public cancel(id: string) {
    const task = this.tasks.find((t) => t.id === id)
    if (!task) return

    if (this.activeTaskId === id) {
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
      this.activeTaskId = null
    }

    this.tasks = this.tasks.filter((t) => t.id !== id)
    this.blobCache.delete(id)
    this.notify()
    this.processNext()
  }

  public retry(id: string) {
    const task = this.tasks.find((t) => t.id === id)
    if (!task) return
    task.status = 'queued'
    task.progress = 0
    task.downloadedPages = 0
    task.error = undefined
    this.notify()
    this.processNext()
  }

  public pause() {
    this.isPaused = true
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.activeTaskId) {
      const current = this.tasks.find((t) => t.id === this.activeTaskId)
      if (current && current.status !== 'done') {
        current.status = 'queued'
      }
      this.activeTaskId = null
    }
    this.notify()
  }

  public resume() {
    this.isPaused = false
    this.notify()
    this.processNext()
  }

  public clearCompleted() {
    this.tasks = this.tasks.filter((t) => t.status !== 'done')
    this.notify()
  }

  public clearAll() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.activeTaskId = null
    this.tasks = []
    this.blobCache.clear()
    this.notify()
  }

  public getCachedBlob(id: string): Blob | undefined {
    return this.blobCache.get(id)
  }

  public async saveOrExportFile(task: ClientDownloadTask) {
    const blob = this.blobCache.get(task.id)
    if (!blob) {
      throw new Error('Archive file is no longer in temporary memory. Please retry download.')
    }
    const fileName = task.fileName || `${sanitizeFilename(task.mangaTitle)} - ${sanitizeFilename(task.chapterTitle)}.cbz`
    await this.saveBlob(blob, task.mangaTitle, fileName)
  }

  private async saveBlob(blob: Blob, mangaTitle: string, fileName: string) {
    if (Capacitor.isNativePlatform()) {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string
          resolve(res.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      await saveToDeviceStorage(mangaTitle, fileName, base64)
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 5000)
    }
  }

  private async processNext() {
    if (this.isPaused || this.activeTaskId !== null) return

    const nextTask = this.tasks.find((t) => t.status === 'queued')
    if (!nextTask) return

    this.activeTaskId = nextTask.id
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    try {
      await this.runTask(nextTask, signal)
    } catch (err: unknown) {
      if (signal.aborted) {
        // cancelled or paused
        return
      }
      nextTask.status = 'failed'
      nextTask.error = (err as Error)?.message || 'Download failed'
      this.notify()
    } finally {
      this.activeTaskId = null
      this.abortController = null
      // Schedule next task on next tick
      setTimeout(() => this.processNext(), 100)
    }
  }

  private async runTask(task: ClientDownloadTask, signal: AbortSignal) {
    task.status = 'fetching-pages'
    task.progress = 5
    this.notify()

    // 1. Fetch chapter page URLs
    let rawPages: string[] = []
    const mgr = ExtensionManager.getInstance()
    const ext = await mgr.getExtension(task.provider)
    if (ext) {
      try {
        rawPages = (await ext.getPages(task.chapterId)) as string[]
      } catch (e) {
        console.warn('Extension getPages failed:', e)
      }
    }

    if (!rawPages.length && task.provider === 'mangadex') {
      try {
        const atHomeRes = await api.get('/manga/proxy/json', {
          params: { url: `https://api.mangadex.org/at-home/server/${task.chapterId}` },
        })
        const d = atHomeRes.data
        if (d?.baseUrl && d?.chapter?.data?.length) {
          rawPages = d.chapter.data.map((f: string) => `${d.baseUrl}/data/${d.chapter.hash}/${f}`)
        }
      } catch (e) {
        console.warn('MangaDex fallback failed:', e)
      }
    }

    if (signal.aborted) return

    if (!rawPages || rawPages.length === 0) {
      throw new Error('No chapter pages found or chapter is unavailable.')
    }

    task.totalPages = rawPages.length
    task.downloadedPages = 0
    task.status = 'downloading'
    task.progress = 10
    this.notify()

    // 2. Prepare proxied or descrambled URLs
    const base = api.defaults.baseURL || ''
    const apiKey = localStorage.getItem('manga-api-key') || ''
    const skipProxy = (ext as unknown as { skipProxy?: boolean })?.skipProxy ?? false

    const pageUrls: string[] = skipProxy
      ? rawPages
      : rawPages.map((url: string) => {
          if (url.startsWith('comixto://img?')) {
            const params = url.slice('comixto://img?'.length)
            return `${base}/manga/descramble-proxy?${params}&api_key=${apiKey}`
          }
          return `${base}/manga/image-proxy?url=${encodeURIComponent(url)}&api_key=${apiKey}`
        })

    // 3. Download pages with concurrency limit (2 concurrent) to avoid memory spikes and CDN 429
    const downloadedBuffers: { index: number; buffer: ArrayBuffer; ext: string }[] = []

    for (let i = 0; i < pageUrls.length; i += MAX_CONCURRENT_PAGES) {
      if (signal.aborted) return

      const chunk = pageUrls.slice(i, i + MAX_CONCURRENT_PAGES)
      const results = await Promise.allSettled(
        chunk.map((url, offset) => this.fetchSingleImage(url, signal, i + offset))
      )

      for (const res of results) {
        if (res.status === 'fulfilled') {
          downloadedBuffers.push(res.value)
          task.downloadedPages = downloadedBuffers.length
          // Progress scales from 10% to 85% during image fetching
          task.progress = Math.min(85, 10 + Math.round((downloadedBuffers.length / task.totalPages) * 75))
          this.notify()
        } else {
          console.warn('Page fetch warning:', res.reason)
        }
      }

      // Small delay to yield main thread and allow garbage collection
      await new Promise((resolve) => setTimeout(resolve, 80))
    }

    if (signal.aborted) return

    if (downloadedBuffers.length === 0) {
      throw new Error('Failed to download any pages for this chapter.')
    }

    // Sort in natural order
    downloadedBuffers.sort((a, b) => a.index - b.index)

    // 4. Packaging into .cbz archive with JSZip
    task.status = 'packaging'
    task.progress = 90
    this.notify()

    const zip = new JSZip()

    // Add images
    for (const item of downloadedBuffers) {
      const paddedIndex = String(item.index + 1).padStart(3, '0')
      const fileName = `${paddedIndex}.${item.ext}`
      zip.file(fileName, item.buffer)
    }

    // Add ComicInfo.xml metadata
    const comicInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Series>${escapeXml(task.mangaTitle)}</Series>
  <Title>${escapeXml(task.chapterTitle)}</Title>
  <Number>${task.chapterNumber}</Number>
  <PageCount>${downloadedBuffers.length}</PageCount>
</ComicInfo>`
    zip.file('ComicInfo.xml', comicInfoXml)

    // Generate CBZ blob using STORE compression (fast, 0 CPU overhead since images are already compressed)
    task.progress = 95
    this.notify()

    const cbzBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'STORE',
    })

    if (signal.aborted) return

    const safeManga = sanitizeFilename(task.mangaTitle)
    const safeChapter = sanitizeFilename(task.chapterTitle || `Chapter ${task.chapterNumber}`)
    const fileName = `${safeManga} - ${safeChapter}.cbz`

    // Cache blob in memory for re-download
    this.blobCache.set(task.id, cbzBlob)
    if (this.blobCache.size > MAX_IN_MEMORY_BLOBS) {
      const firstKey = this.blobCache.keys().next().value
      if (firstKey) this.blobCache.delete(firstKey)
    }

    // Automatically trigger save/export to device
    try {
      await this.saveBlob(cbzBlob, task.mangaTitle, fileName)
    } catch (saveErr) {
      console.warn('Auto-save error:', saveErr)
    }

    task.status = 'done'
    task.progress = 100
    task.fileName = fileName
    task.fileSizeBytes = cbzBlob.size
    task.completedAt = Date.now()
    this.notify()

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Download Complete', {
          body: `${task.mangaTitle} — ${task.chapterTitle} saved as CBZ`,
          icon: '/icon.png',
        })
      } catch {
        // non-fatal
      }
    }
  }

  private async fetchSingleImage(
    url: string,
    signal: AbortSignal,
    index: number,
    retries = 2
  ): Promise<{ index: number; buffer: ArrayBuffer; ext: string }> {
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (signal.aborted) throw new Error('Aborted')
      try {
        const res = await fetch(url, { signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const contentType = res.headers.get('content-type') || ''
        let ext = 'jpg'
        if (contentType.includes('png')) ext = 'png'
        else if (contentType.includes('webp')) ext = 'webp'
        else if (contentType.includes('gif')) ext = 'gif'

        const buffer = await res.arrayBuffer()
        return { index, buffer, ext }
      } catch (err) {
        lastError = err
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
    }
    throw lastError
  }
}

export const clientDownloader = new ClientDownloader()

export function useClientDownloader() {
  const [tasks, setTasks] = useState<ClientDownloadTask[]>(() => clientDownloader.getTasks())
  const [paused, setPaused] = useState<boolean>(() => clientDownloader.getPaused())

  useEffect(() => {
    return clientDownloader.subscribe(() => {
      setTasks(clientDownloader.getTasks())
      setPaused(clientDownloader.getPaused())
    })
  }, [])

  const active = tasks.filter(
    (t) =>
      t.status === 'downloading' ||
      t.status === 'packaging' ||
      t.status === 'fetching-pages' ||
      t.status === 'queued'
  )
  const completed = tasks.filter((t) => t.status === 'done')
  const failed = tasks.filter((t) => t.status === 'failed')

  return {
    tasks,
    active,
    completed,
    failed,
    isPaused: paused,
    enqueue: clientDownloader.enqueue.bind(clientDownloader),
    enqueueBulk: clientDownloader.enqueueBulk.bind(clientDownloader),
    cancel: clientDownloader.cancel.bind(clientDownloader),
    retry: clientDownloader.retry.bind(clientDownloader),
    pause: clientDownloader.pause.bind(clientDownloader),
    resume: clientDownloader.resume.bind(clientDownloader),
    clearCompleted: clientDownloader.clearCompleted.bind(clientDownloader),
    clearAll: clientDownloader.clearAll.bind(clientDownloader),
    saveOrExportFile: clientDownloader.saveOrExportFile.bind(clientDownloader),
    isChapterActiveOrQueued: clientDownloader.isChapterActiveOrQueued.bind(clientDownloader),
    getActiveOrQueuedChapterIds: clientDownloader.getActiveOrQueuedChapterIds.bind(clientDownloader),
  }
}

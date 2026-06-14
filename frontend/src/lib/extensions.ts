import api from './api'
import { supabase } from './supabase'

export interface MangaExtension {
  id: string
  name: string
  version: string
  lang: string

  search: (query: string, page: number) => Promise<unknown[]>
  getMangaDetail: (mangaId: string) => Promise<unknown>
  getPages: (chapterId: string) => Promise<string[]>
}

interface WorkerRequest {
  id: string
  method: 'search' | 'getMangaDetail' | 'getPages'
  args: unknown[]
}

interface WorkerResponse {
  id: string
  result?: unknown
  error?: string
}

function createExtensionWorker(jsCode: string, apiBaseURL: string, apiKey: string): Worker {
  const workerSrc = `
    const API_BASE = ${JSON.stringify(apiBaseURL)};
    const API_KEY = ${JSON.stringify(apiKey)};

    const apiFetch = async (path, opts = {}) => {
      const url = API_BASE + path + (path.includes('?') ? '&' : '?') + 'api_key=' + API_KEY;
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error('API error: ' + res.status);
      return res.json();
    };

    let ext = null;
    try {
      ${jsCode}
      if (typeof extension !== 'undefined') ext = extension;
    } catch (e) {
      console.error('Extension load error:', e);
    }

    self.onmessage = async (event) => {
      const { id, method, args } = event.data;
      try {
        if (!ext || typeof ext[method] !== 'function') {
          throw new Error('Method not found: ' + method);
        }
        const result = await ext[method](...args);
        self.postMessage({ id, result });
      } catch (err) {
        self.postMessage({ id, error: err.message || String(err) });
      }
    };
  `
  const blob = new Blob([workerSrc], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob))
}

function workerCall(worker: Worker, method: WorkerRequest['method'], args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2)
    const handler = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return
      worker.removeEventListener('message', handler)
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data.result)
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ id, method, args } satisfies WorkerRequest)
  })
}

export class ExtensionManager {
  private static instance: ExtensionManager
  public extensions: Map<string, MangaExtension> = new Map()
  private workers: Map<string, Worker> = new Map()
  private userId = 'guest'

  private constructor() {}

  static getInstance() {
    if (!this.instance) this.instance = new ExtensionManager()
    return this.instance
  }

  private get storageKey() {
    return `extensions-${this.userId}`
  }

  async init() {
    const { data } = await supabase.auth.getSession()
    this.userId = data.session?.user.id ?? 'guest'
    await this.loadInstalled()
  }

  setUser(userId: string | null) {
    const newId = userId ?? 'guest'
    if (newId === this.userId) return
    // Terminate all workers for previous user
    for (const w of this.workers.values()) w.terminate()
    this.workers.clear()
    this.extensions.clear()
    this.userId = newId
    this.loadInstalled()
  }

  async install(pkgId: string, name: string, lang: string, version: string): Promise<boolean> {
    try {
      const res = await api.get(`/sources/code/${pkgId}`)
      const jsCode: string = res.data.code
      const apiBaseURL: string = api.defaults.baseURL || ''
      const apiKey: string = localStorage.getItem('manga-api-key') || ''

      const oldWorker = this.workers.get(pkgId)
      if (oldWorker) oldWorker.terminate()

      const worker = createExtensionWorker(jsCode, apiBaseURL, apiKey)
      this.workers.set(pkgId, worker)

      const extension: MangaExtension = {
        id: pkgId,
        name,
        lang,
        version,
        search: (query, page) => workerCall(worker, 'search', [query, page]) as Promise<unknown[]>,
        getMangaDetail: (id) => workerCall(worker, 'getMangaDetail', [id]),
        getPages: (id) => workerCall(worker, 'getPages', [id]) as Promise<string[]>,
      }

      this.extensions.set(pkgId, extension)

      const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
      if (!installed.find((e: { id: string }) => e.id === pkgId)) {
        installed.push({ id: pkgId, name, lang, version })
        localStorage.setItem(this.storageKey, JSON.stringify(installed))
      }

      return true
    } catch (err) {
      console.error('Failed to install extension:', err)
      return false
    }
  }

  uninstall(pkgId: string) {
    this.workers.get(pkgId)?.terminate()
    this.workers.delete(pkgId)
    this.extensions.delete(pkgId)
    const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
    localStorage.setItem('installed-extensions', JSON.stringify(installed.filter((e: { id: string }) => e.id !== pkgId)))
  }

  async loadInstalled() {
    const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
    for (const ext of installed) {
      await this.install(ext.id, ext.name, ext.lang, ext.version)
    }
  }
}

import api from './api'
import { supabase } from './supabase'

export interface MangaExtension {
  id: string
  name: string
  version: string
  lang: string
  builtin: boolean
  skipProxy: boolean

  search: (query: string, page: number) => Promise<unknown[]>
  getMangaDetail: (mangaId: string) => Promise<unknown>
  getPages: (chapterId: string) => Promise<string[]>
  getPopular?: (page: number) => Promise<unknown[]>
  getLatest?: (page: number) => Promise<unknown[]>
}

// Providers whose image CDN is CORS-enabled — no backend proxy needed for images
export const SKIP_PROXY_PROVIDERS = new Set(['mangadex'])

interface WorkerRequest {
  id: string
  method: 'search' | 'getMangaDetail' | 'getPages' | 'getPopular' | 'getLatest'
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
      console.error('[Extension] Load error:', e);
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
  private builtinIds = new Set<string>()

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
    // Auto-install built-ins that aren't already loaded
    await this.loadBuiltins()
  }

  setUser(userId: string | null) {
    const newId = userId ?? 'guest'
    if (newId === this.userId) return
    for (const w of this.workers.values()) w.terminate()
    this.workers.clear()
    this.extensions.clear()
    this.userId = newId
    this.loadInstalled().then(() => this.loadBuiltins())
  }

  /** Fetch built-in extension list from backend and install any not already active */
  async loadBuiltins() {
    try {
      const res = await api.get('/sources/builtins')
      const builtins: Array<{ id: string; name: string; lang: string; version: string; skip_proxy: boolean }> = res.data
      const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]') as Array<{ id: string }>
      const installedIds = new Set(installed.map(e => e.id))

      for (const b of builtins) {
        this.builtinIds.add(b.id)
        if (!this.extensions.has(b.id)) {
          // Not yet active — install silently
          await this.install(b.id, b.name, b.lang, b.version, true)
        }
        // Update skipProxy in case backend changed it
        const ext = this.extensions.get(b.id)
        if (ext) {
          ;(ext as MangaExtension).skipProxy = b.skip_proxy ?? SKIP_PROXY_PROVIDERS.has(b.id)
        }
        // Save to localStorage if missing (so Sources page shows it as installed)
        if (!installedIds.has(b.id)) {
          const list = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
          list.push({ id: b.id, name: b.name, lang: b.lang, version: b.version })
          localStorage.setItem(this.storageKey, JSON.stringify(list))
          installedIds.add(b.id)
        }
      }
    } catch (err) {
      console.warn('[Extensions] Built-in load failed:', err)
    }
  }

  isBuiltin(pkgId: string): boolean {
    return this.builtinIds.has(pkgId)
  }

  async install(pkgId: string, name: string, lang: string, version: string, silent = false): Promise<boolean> {
    try {
      const res = await api.get(`/sources/code/${pkgId}`)
      const jsCode: string = res.data.code
      const skipProxy: boolean = res.data.skip_proxy ?? SKIP_PROXY_PROVIDERS.has(pkgId)
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
        builtin: this.builtinIds.has(pkgId),
        skipProxy,
        search: (query, page) => workerCall(worker, 'search', [query, page]) as Promise<unknown[]>,
        getMangaDetail: (id) => workerCall(worker, 'getMangaDetail', [id]),
        getPages: (id) => workerCall(worker, 'getPages', [id]) as Promise<string[]>,
        getPopular: (page) => workerCall(worker, 'getPopular', [page]) as Promise<unknown[]>,
        getLatest: (page) => workerCall(worker, 'getLatest', [page]) as Promise<unknown[]>,
      }

      this.extensions.set(pkgId, extension)

      if (!silent) {
        const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
        if (!installed.find((e: { id: string }) => e.id === pkgId)) {
          installed.push({ id: pkgId, name, lang, version })
          localStorage.setItem(this.storageKey, JSON.stringify(installed))
        }
      }

      return true
    } catch (err) {
      console.error(`[Extensions] Failed to install ${pkgId}:`, err)
      return false
    }
  }

  uninstall(pkgId: string) {
    // Don't allow uninstalling built-ins
    if (this.builtinIds.has(pkgId)) return
    this.workers.get(pkgId)?.terminate()
    this.workers.delete(pkgId)
    this.extensions.delete(pkgId)
    const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
    localStorage.setItem(this.storageKey, JSON.stringify(
      installed.filter((e: { id: string }) => e.id !== pkgId)
    ))
  }

  async loadInstalled() {
    const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
    for (const ext of installed) {
      if (!this.extensions.has(ext.id)) {
        await this.install(ext.id, ext.name, ext.lang, ext.version, true)
      }
    }
  }
}

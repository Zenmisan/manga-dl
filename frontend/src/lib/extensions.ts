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

export class ExtensionManager {
  private static instance: ExtensionManager
  public extensions: Map<string, MangaExtension> = new Map()
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
    
    console.log('[Extensions] Initializing manager for user:', this.userId)

    // Retry loop to handle backend startup race condition (especially in dev)
    let retries = 5
    while (retries > 0) {
      try {
        // Ping the extensions endpoint to ensure backend is up
        await api.get('/sources/builtins')
        await this.loadInstalled()
        await this.loadBuiltins()
        console.log('[Extensions] Ready. Loaded:', this.extensions.size, 'sources')
        break // Success
      } catch (err) {
        retries--
        if (retries === 0) {
          console.error('[Extensions] Backend unreachable after multiple attempts', err)
          break
        }
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  reinit() {
    console.log('[Extensions] Re-initializing manager...')
    this.builtinIds.clear()
    this.extensions.clear()
    return this.init()
  }

  setUser(userId: string | null) {
    const newId = userId ?? 'guest'
    if (newId === this.userId) return
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
      
      let apiBaseURL: string = api.defaults.baseURL || ''
      if (apiBaseURL.startsWith('/')) {
        apiBaseURL = window.location.origin + apiBaseURL
      }
      
      const apiKey: string = localStorage.getItem('manga-api-key') || ''

      const apiFetch = async (path: string, opts = {}) => {
        const url = apiBaseURL + path + (path.includes('?') ? '&' : '?') + 'api_key=' + apiKey
        const res = await fetch(url, opts)
        if (!res.ok) throw new Error('API error: ' + res.status)
        return res.json()
      }

      // Evaluate extension code on the main thread so that it has full access to Web APIs like DOMParser
      const runner = new Function('apiFetch', `
        ${jsCode}
        if (typeof extension !== 'undefined') return extension;
        throw new Error('Extension object not found');
      `)
      const extInstance = runner(apiFetch)

      const extension: MangaExtension = {
        id: pkgId,
        name,
        lang,
        version,
        builtin: this.builtinIds.has(pkgId),
        skipProxy,
        search: (query, page) => extInstance.search(query, page),
        getMangaDetail: (id) => extInstance.getMangaDetail(id),
        getPages: (id) => extInstance.getPages(id),
        getPopular: extInstance.getPopular ? (page) => extInstance.getPopular(page) : undefined,
        getLatest: extInstance.getLatest ? (page) => extInstance.getLatest(page) : undefined,
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

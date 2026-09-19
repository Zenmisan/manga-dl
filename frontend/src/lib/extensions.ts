import api from './api'
import { supabase } from './supabase'

export interface NovelChapterContent {
  content: string
  format: 'html' | 'plain'
}

export interface MangaExtension {
  id: string
  name: string
  version: string
  lang: string
  builtin: boolean
  skipProxy: boolean
  type: 'manga' | 'novel'

  search: (query: string, page: number) => Promise<unknown[]>
  getMangaDetail: (mangaId: string) => Promise<unknown>
  getPages: (chapterId: string) => Promise<string[]>
  getChapterText?: (chapterId: string) => Promise<NovelChapterContent>
  getPopular?: (page: number) => Promise<unknown[]>
  getLatest?: (page: number) => Promise<unknown[]>
}

// Providers whose image CDN is CORS-enabled — no backend proxy needed for images
export const SKIP_PROXY_PROVIDERS = new Set(['mangadex'])

// Deprecated or defunct manga sources removed from backend
export const DEPRECATED_EXTENSIONS = new Set([
  'manhuaplus',
  'aquamanga',
  'coffeemanga',
  'manhuafast',
  'manhuaus',
  'manhwajoy',
  'sleepytranslations',
  'mangakiss',
  'epicmanga',
  'firescans',
  'kissmangain',
  'mangaread',
  'linkmanga',
  'manhuazonghe',
  'webtoonscan',
  'webtoonxyz',
  'whalemanga',
  'woopread',
  'wuxiaworldsite',
  'drakescans',
])

// Built-in web novel extension IDs — always enabled, isolated from toggleable manga sources
export const NOVEL_EXTENSION_IDS = new Set([
  'royalroad',
  'novelbin',
  'novelfull',
  'freewebnovel',
  'novelfire',
  'allnovel',
  'novelphoenix',
  'readnovelfull',
  'libread',
  'brightnovel',
  'chrysanthemumgarden',
  'comrademao',
  'lightnoveltranslations',
  'bestlightnovel',
  'asianovel',
  'novelbuddy',
  'readlightnovel',
  'scribblehub',
  'lightnovelworld',
  'wuxiaworld',
])

function getInitialUserId(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const item = localStorage.getItem(k)
        if (item) {
          const parsed = JSON.parse(item)
          if (parsed?.user?.id) return parsed.user.id
        }
      }
    }
  } catch {}
  return 'guest'
}

export class ExtensionManager {
  private static instance: ExtensionManager
  public extensions: Map<string, MangaExtension> = new Map()
  private userId = getInitialUserId()
  private builtinIds = new Set<string>()

  private constructor() {}

  static getInstance() {
    if (!this.instance) this.instance = new ExtensionManager()
    return this.instance
  }

  public get storageKey() {
    return `extensions-${this.userId}`
  }

  private initPromise: Promise<void> | null = null

  async init() {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._doInit()
    return this.initPromise
  }

  private async _doInit() {
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

  async getExtension(pkgId: string): Promise<MangaExtension | undefined> {
    if (this.extensions.has(pkgId)) return this.extensions.get(pkgId)
    await this.init()
    if (this.extensions.has(pkgId)) return this.extensions.get(pkgId)
    // On-demand load/install if not already cached
    try {
      const ok = await this.install(pkgId, pkgId, 'en', '1.0.0', true)
      if (ok) return this.extensions.get(pkgId)
    } catch {
      // non-fatal
    }
    return undefined
  }

  reinit() {
    console.log('[Extensions] Re-initializing manager...')
    this.initPromise = null
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
      // Purge any novel extensions previously saved into user's installed sources list
      const rawInstalled = localStorage.getItem(this.storageKey)
      if (rawInstalled) {
        try {
          const list = JSON.parse(rawInstalled)
          const filtered = list.filter((e: { id: string }) => !NOVEL_EXTENSION_IDS.has(e.id))
          if (filtered.length !== list.length) {
            localStorage.setItem(this.storageKey, JSON.stringify(filtered))
          }
        } catch {}
      }

      const res = await api.get('/sources/builtins')
      const builtins: Array<{ id: string; name: string; lang: string; version: string; skip_proxy: boolean; type?: 'manga' | 'novel' }> = res.data
      const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]') as Array<{ id: string; disabled?: boolean }>
      const installedIds = new Set(installed.map(e => e.id))

      builtins.forEach(b => this.builtinIds.add(b.id))

      await Promise.all(builtins.map(async b => {
        const isNovel = b.type === 'novel' || NOVEL_EXTENSION_IDS.has(b.id)
        // Novel extensions are internal built-ins that are always enabled and never user-disabled
        const isOptOut = !isNovel && installed.find(e => e.id === b.id)?.disabled
        if (isOptOut) {
          this.extensions.delete(b.id)
          return
        }

        if (!this.extensions.has(b.id)) {
          await this.install(b.id, b.name, b.lang, b.version, true)
        }
        const ext = this.extensions.get(b.id)
        if (ext) {
          ;(ext as MangaExtension).skipProxy = b.skip_proxy ?? SKIP_PROXY_PROVIDERS.has(b.id)
          if (isNovel) (ext as MangaExtension).type = 'novel'
        }
        // Only save manga extensions to the user's toggleable installed list
        if (!isNovel && !installedIds.has(b.id)) {
          const list = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
          list.push({ id: b.id, name: b.name, lang: b.lang, version: b.version })
          localStorage.setItem(this.storageKey, JSON.stringify(list))
          installedIds.add(b.id)
        }
      }))
    } catch (err) {
      console.warn('[Extensions] Built-in load failed:', err)
    }
  }

  isBuiltin(pkgId: string): boolean {
    return this.builtinIds.has(pkgId)
  }

  async install(pkgId: string, name: string, lang: string, version: string, silent = false): Promise<boolean> {
    if (!pkgId || pkgId === 'undefined') return false
    try {
      const res = await api.get(`/sources/code/${pkgId}`)
      const jsCode: string = res.data.code
      const skipProxy: boolean = res.data.skip_proxy ?? SKIP_PROXY_PROVIDERS.has(pkgId)
      
      let apiBaseURL: string = api.defaults.baseURL || ''
      if (apiBaseURL.startsWith('/')) {
        apiBaseURL = window.location.origin + apiBaseURL
      }
      
      const apiKey: string = localStorage.getItem('manga-api-key') || ''

      const apiFetch = async (path: string, opts: RequestInit = {}) => {
        const url = apiBaseURL + path + (path.includes('?') ? '&' : '?') + 'api_key=' + apiKey
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 20000)
        try {
          const res = await fetch(url, { ...opts, signal: opts.signal || controller.signal })
          if (!res.ok) throw new Error('API error: ' + res.status)
          return await res.json()
        } finally {
          clearTimeout(timer)
        }
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
        type: res.data.type ?? (NOVEL_EXTENSION_IDS.has(pkgId) ? 'novel' : 'manga'),
        search: (query, page) => extInstance.search(query, page),
        getMangaDetail: (id) => extInstance.getMangaDetail(id),
        getPages: (id) => (extInstance.getPages ? extInstance.getPages(id) : Promise.resolve([])),
        getChapterText: extInstance.getChapterText ? (id) => extInstance.getChapterText(id) : undefined,
        getPopular: extInstance.getPopular ? (page) => extInstance.getPopular(page) : undefined,
        getLatest: extInstance.getLatest ? (page) => extInstance.getLatest(page) : undefined,
      }

      this.extensions.set(pkgId, extension)

      if (!silent && !NOVEL_EXTENSION_IDS.has(pkgId)) {
        const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
        if (!installed.find((e: { id: string }) => e.id === pkgId)) {
          installed.push({ id: pkgId, name, lang, version })
          localStorage.setItem(this.storageKey, JSON.stringify(installed))
        }
      }

      return true
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404 || DEPRECATED_EXTENSIONS.has(pkgId)) {
        console.warn(`[Extensions] Source "${pkgId}" returned 404 or is deprecated. Auto-pruning from localStorage.`)
        this.pruneFromStorage(pkgId)
      } else {
        console.error(`[Extensions] Failed to install ${pkgId}:`, err)
      }
      return false
    }
  }

  async installFromUrl(codeUrl: string, pkgId: string, name: string, lang: string, version: string): Promise<boolean> {
    if (!pkgId || pkgId === 'undefined') return false
    try {
      const res = await fetch(codeUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const jsCode = await res.text()

      let apiBaseURL: string = api.defaults.baseURL || ''
      if (apiBaseURL.startsWith('/')) apiBaseURL = window.location.origin + apiBaseURL
      const apiKey: string = localStorage.getItem('manga-api-key') || ''

      const apiFetch = async (path: string, opts: RequestInit = {}) => {
        const url = apiBaseURL + path + (path.includes('?') ? '&' : '?') + 'api_key=' + apiKey
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 20000)
        try {
          const r = await fetch(url, { ...opts, signal: opts.signal || controller.signal })
          if (!r.ok) throw new Error('API error: ' + r.status)
          return await r.json()
        } finally {
          clearTimeout(timer)
        }
      }

      const runner = new Function('apiFetch', `${jsCode}\nif (typeof extension !== 'undefined') return extension;\nthrow new Error('Extension object not found');`)
      const extInstance = runner(apiFetch)

      const extension: MangaExtension = {
        id: pkgId, name, lang, version,
        builtin: false, skipProxy: false,
        type: 'manga',
        search: (query, page) => extInstance.search(query, page),
        getMangaDetail: (id) => extInstance.getMangaDetail(id),
        getPages: (id) => (extInstance.getPages ? extInstance.getPages(id) : Promise.resolve([])),
        getChapterText: extInstance.getChapterText ? (id) => extInstance.getChapterText(id) : undefined,
        getPopular: extInstance.getPopular ? (page) => extInstance.getPopular(page) : undefined,
        getLatest: extInstance.getLatest ? (page) => extInstance.getLatest(page) : undefined,
      }

      this.extensions.set(pkgId, extension)
      const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
      if (!installed.find((e: { id: string }) => e.id === pkgId)) {
        installed.push({ id: pkgId, name, lang, version })
        localStorage.setItem(this.storageKey, JSON.stringify(installed))
      }
      return true
    } catch (err) {
      console.error(`[Extensions] Failed to install from URL ${codeUrl}:`, err)
      return false
    }
  }

  uninstall(pkgId: string) {
    // Don't allow uninstalling built-ins
    if (this.builtinIds.has(pkgId)) return
    this.extensions.delete(pkgId)
    const installed = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
    localStorage.setItem(this.storageKey, JSON.stringify(
      installed.filter((e: { id: string }) => e && e.id && e.id !== pkgId && e.id !== 'undefined')
    ))
  }

  cleanupDeprecatedExtensions() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('extensions-')) {
          const raw = localStorage.getItem(key)
          if (!raw) continue
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(
              (e: { id?: string }) => e?.id && !DEPRECATED_EXTENSIONS.has(e.id) && e.id !== 'undefined'
            )
            if (filtered.length !== parsed.length) {
              console.log(`[Extensions] Pruned ${parsed.length - filtered.length} deprecated extensions from ${key}`)
              localStorage.setItem(key, JSON.stringify(filtered))
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Extensions] Error cleaning deprecated extensions:', e)
    }
  }

  private pruneFromStorage(pkgId: string) {
    try {
      this.extensions.delete(pkgId)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('extensions-')) {
          const raw = localStorage.getItem(key)
          if (!raw) continue
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((e: { id?: string }) => e && e.id !== pkgId)
            if (filtered.length !== parsed.length) {
              localStorage.setItem(key, JSON.stringify(filtered))
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  async loadInstalled() {
    this.cleanupDeprecatedExtensions()
    const rawInstalled = JSON.parse(localStorage.getItem(this.storageKey) || '[]') as Array<{ id: string; name: string; lang: string; version: string; disabled?: boolean }>
    const installed = rawInstalled.filter(e => e && e.id && e.id !== 'undefined' && !DEPRECATED_EXTENSIONS.has(e.id) && !NOVEL_EXTENSION_IDS.has(e.id))
    if (installed.length !== rawInstalled.length) {
      localStorage.setItem(this.storageKey, JSON.stringify(installed))
    }
    await Promise.all(installed.map(async ext => {
      if (ext.disabled) {
        this.extensions.delete(ext.id)
        return
      }
      if (!this.extensions.has(ext.id)) {
        await this.install(ext.id, ext.name, ext.lang, ext.version, true)
      }
    }))
  }
}

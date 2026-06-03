import api from './api'

export interface MangaExtension {
  id: string
  name: string
  version: string
  lang: string
  
  search: (query: string, page: number) => Promise<any[]>
  getMangaDetail: (mangaId: string) => Promise<any>
  getPages: (chapterId: string) => Promise<string[]>
}

export class ExtensionManager {
  private static instance: ExtensionManager
  public extensions: Map<string, MangaExtension> = new Map()

  private constructor() {}

  static getInstance() {
    if (!this.instance) this.instance = new ExtensionManager()
    return this.instance
  }

  async install(pkgId: string, name: string, lang: string, version: string) {
    try {
      const res = await api.get(`/sources/code/${pkgId}`)
      const jsCode = res.data.code
      
      // In a production environment, we'd use a Web Worker or a strict sandbox.
      // For this prototype, we'll use a dynamic Function constructor to isolate logic.
      
      const factory = new Function('api', 'domParser', `
        ${jsCode}
        return {
          search: async (query, page) => { 
            /* Scraper logic here */
            return [] 
          },
          getMangaDetail: async (id) => { return {} },
          getPages: async (id) => { return [] }
        }
      `)

      const extensionLogic = factory(api, new DOMParser())
      
      const extension: MangaExtension = {
        id: pkgId,
        name,
        lang,
        version,
        ...extensionLogic
      }

      this.extensions.set(pkgId, extension)
      
      // Persist to local storage so user doesn't have to re-install
      const installed = JSON.parse(localStorage.getItem('installed-extensions') || '[]')
      if (!installed.find((e: any) => e.id === pkgId)) {
        installed.push({ id: pkgId, name, lang, version })
        localStorage.setItem('installed-extensions', JSON.stringify(installed))
      }

      return true
    } catch (err) {
      console.error('Failed to install extension:', err)
      return false
    }
  }

  async loadInstalled() {
    const installed = JSON.parse(localStorage.getItem('installed-extensions') || '[]')
    for (const ext of installed) {
      await this.install(ext.id, ext.name, ext.lang, ext.version)
    }
  }
}

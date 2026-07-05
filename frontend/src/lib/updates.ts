import { Capacitor } from '@capacitor/core'

const GITHUB_REPO = 'zenmisan/manga-dl'
const CURRENT_VERSION = __APP_VERSION__

export interface ReleaseInfo {
  version: string
  notes: string
  apkUrl: string | null
  htmlUrl: string
  isNewer: boolean
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [la, lb, lc] = parse(latest)
  const [ca, cb, cc] = parse(current)
  if (la !== ca) return la > ca
  if (lb !== cb) return lb > cb
  return lc > cc
}

export async function checkForUpdate(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const version = (data.tag_name as string).replace(/^v/, '')
    const apkAsset = (data.assets as Array<{ name: string; browser_download_url: string }>)
      ?.find(a => a.name.endsWith('.apk'))
    return {
      version,
      notes: (data.body as string) || '',
      apkUrl: apkAsset?.browser_download_url ?? null,
      htmlUrl: data.html_url as string,
      isNewer: isNewer(version, CURRENT_VERSION),
    }
  } catch {
    return null
  }
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export function isTauri(): boolean {
  return !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
}

export function isWeb(): boolean {
  return !isAndroid() && !isTauri()
}

export async function openUpdateUrl(release: ReleaseInfo): Promise<void> {
  if (isTauri()) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const { relaunch } = await import('@tauri-apps/plugin-process')
      const update = await check()
      if (update?.available) {
        await update.downloadAndInstall()
        await relaunch()
      }
      return
    } catch {
      // fall through to browser open
    }
  }
  const url = isAndroid() && release.apkUrl ? release.apkUrl : release.htmlUrl
  window.open(url, '_blank', 'noopener')
}

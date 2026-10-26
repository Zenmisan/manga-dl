import { resolveBaseURL } from './api'

export interface LocalDownloadEnvInfo {
  isHostedLocally: boolean
  isServerPortLocal: boolean
  isEligibleForConcurrencyBoost: boolean
  clientHostname: string
  clientPort: string
  serverHostname: string
  serverPort: string
  effectiveConcurrency: number
  reason: string
}

const STORAGE_KEY_CONCURRENCY = 'manga-dl-local-concurrent-downloads'
const DEFAULT_LOCAL_CONCURRENCY = 3
const REMOTE_SERVER_CONCURRENCY = 1

const KNOWN_LOCAL_PORTS = new Set(['8000', '5000', '8080', '4567', '3000', '5173', '4173', '8081', '8082'])

export function isLoopbackOrLanHostname(hostname: string): boolean {
  if (!hostname) return false
  const clean = hostname.trim().toLowerCase()
  if (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === '[::1]' ||
    clean === '0.0.0.0' ||
    clean.endsWith('.local')
  ) {
    return true
  }

  // IPv4 Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean)) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(clean)) return true
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(clean)) return true

  return false
}

export function isRemoteCloudDomain(hostname: string): boolean {
  if (!hostname) return false
  const clean = hostname.trim().toLowerCase()
  const cloudSuffixes = [
    'onrender.com',
    'herokuapp.com',
    'railway.app',
    'web.app',
    'firebaseapp.com',
    'vercel.app',
    'netlify.app',
    'pages.dev',
    'fly.dev',
    'koyeb.app',
    'supabase.co',
  ]
  return cloudSuffixes.some((s) => clean === s || clean.endsWith(`.${s}`))
}

export function isLocalBackendPort(port: string): boolean {
  if (!port) return false
  return KNOWN_LOCAL_PORTS.has(port.trim())
}

/**
 * Detects whether manga-dl is currently running locally (or self-hosted)
 * and whether the backend server is also hosted locally on a local port.
 */
export function detectLocalDownloadEnvironment(overrideUrl?: string): LocalDownloadEnvInfo {
  let clientHostname = 'localhost'
  let clientPort = '5173'

  if (typeof window !== 'undefined' && window.location) {
    clientHostname = window.location.hostname || 'localhost'
    clientPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
  }

  const isHostedLocally = isLoopbackOrLanHostname(clientHostname)

  const activeBaseUrl = overrideUrl || (typeof resolveBaseURL === 'function' ? resolveBaseURL() : '')
  let serverHostname = clientHostname
  let serverPort = clientPort

  if (activeBaseUrl.startsWith('http://') || activeBaseUrl.startsWith('https://')) {
    try {
      const u = new URL(activeBaseUrl)
      serverHostname = u.hostname
      serverPort = u.port || (u.protocol === 'https:' ? '443' : '80')
    } catch {
      // fallback
    }
  } else if (activeBaseUrl.startsWith('/')) {
    // Relative API routes use the same host and port as window.location
    serverHostname = clientHostname
    serverPort = clientPort
  }

  const isServerLocalHost = isLoopbackOrLanHostname(serverHostname)
  const isServerCloud = isRemoteCloudDomain(serverHostname)
  const isServerPortMatchOrLocal = isLocalBackendPort(serverPort) || (isServerLocalHost && serverPort !== '443' && serverPort !== '80')

  const isServerPortLocal = isServerLocalHost && isServerPortMatchOrLocal && !isServerCloud

  const isEligibleForConcurrencyBoost = isHostedLocally && isServerPortLocal

  let reason = ''
  if (!isHostedLocally) {
    reason = `App is hosted on remote web domain (${clientHostname}). Cloud downloads are rate-limited to 1 concurrent chapter.`
  } else if (isServerCloud || !isServerLocalHost) {
    reason = `Backend server is remote cloud (${serverHostname}). Concurrency locked to 1 to protect server capacity.`
  } else if (!isServerPortMatchOrLocal) {
    reason = `Server port (${serverPort}) is standard remote port. Local high-speed mode requires local backend port (e.g. 8000, 5000, 4567).`
  } else {
    reason = `Local environment verified (${clientHostname}:${clientPort} -> ${serverHostname}:${serverPort}). High-speed concurrent downloads active.`
  }

  const configuredSetting = getLocalConcurrentDownloadsSetting()
  const effectiveConcurrency = isEligibleForConcurrencyBoost ? configuredSetting : REMOTE_SERVER_CONCURRENCY

  return {
    isHostedLocally,
    isServerPortLocal,
    isEligibleForConcurrencyBoost,
    clientHostname,
    clientPort,
    serverHostname,
    serverPort,
    effectiveConcurrency,
    reason,
  }
}

export function getLocalConcurrentDownloadsSetting(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCAL_CONCURRENCY
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONCURRENCY)
    if (raw) {
      const parsed = parseInt(raw, 10)
      if (parsed >= 1 && parsed <= 4) return parsed
    }
  } catch {
    // fallback
  }
  return DEFAULT_LOCAL_CONCURRENCY
}

export function setLocalConcurrentDownloadsSetting(concurrency: number): void {
  const clamped = Math.max(1, Math.min(4, Math.round(concurrency)))
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CONCURRENCY, String(clamped))
    } catch {
      // quota
    }
  }
}

export function getEffectiveDownloadConcurrency(): number {
  return detectLocalDownloadEnvironment().effectiveConcurrency
}

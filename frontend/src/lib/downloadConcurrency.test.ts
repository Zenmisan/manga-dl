import { describe, it, expect, beforeEach } from 'bun:test'
import {
  isLoopbackOrLanHostname,
  isRemoteCloudDomain,
  isLocalBackendPort,
  detectLocalDownloadEnvironment,
  getLocalConcurrentDownloadsSetting,
  setLocalConcurrentDownloadsSetting,
} from './downloadConcurrency'

const localStore = new Map<string, string>()
if (typeof (globalThis as any).localStorage === 'undefined') {
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => localStore.get(k) ?? null,
    setItem: (k: string, v: string) => localStore.set(k, String(v)),
    removeItem: (k: string) => localStore.delete(k),
    clear: () => localStore.clear(),
  }
}

describe('downloadConcurrency detection & policy', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('correctly identifies loopback and private LAN hostnames', () => {
    expect(isLoopbackOrLanHostname('localhost')).toBe(true)
    expect(isLoopbackOrLanHostname('127.0.0.1')).toBe(true)
    expect(isLoopbackOrLanHostname('::1')).toBe(true)
    expect(isLoopbackOrLanHostname('192.168.1.55')).toBe(true)
    expect(isLoopbackOrLanHostname('10.0.4.12')).toBe(true)
    expect(isLoopbackOrLanHostname('172.16.0.1')).toBe(true)
    expect(isLoopbackOrLanHostname('homelab.local')).toBe(true)

    expect(isLoopbackOrLanHostname('manga-dl.web.app')).toBe(false)
    expect(isLoopbackOrLanHostname('manga-dl.onrender.com')).toBe(false)
    expect(isLoopbackOrLanHostname('8.8.8.8')).toBe(false)
  })

  it('correctly identifies remote cloud domains', () => {
    expect(isRemoteCloudDomain('manga-dl.onrender.com')).toBe(true)
    expect(isRemoteCloudDomain('manga-dl.web.app')).toBe(true)
    expect(isRemoteCloudDomain('app.railway.app')).toBe(true)
    expect(isRemoteCloudDomain('manga-dl.herokuapp.com')).toBe(true)

    expect(isRemoteCloudDomain('localhost')).toBe(false)
    expect(isRemoteCloudDomain('127.0.0.1')).toBe(false)
    expect(isRemoteCloudDomain('192.168.1.10')).toBe(false)
  })

  it('identifies standard local backend ports', () => {
    expect(isLocalBackendPort('8000')).toBe(true)
    expect(isLocalBackendPort('5000')).toBe(true)
    expect(isLocalBackendPort('4567')).toBe(true)
    expect(isLocalBackendPort('8080')).toBe(true)

    expect(isLocalBackendPort('443')).toBe(false)
    expect(isLocalBackendPort('80')).toBe(false)
  })

  it('activates concurrency boost for local backend and restricts remote servers to 1', () => {
    // Local FastAPI server on port 8000
    const localResult = detectLocalDownloadEnvironment('http://127.0.0.1:8000/api')
    expect(localResult.isHostedLocally).toBe(true)
    expect(localResult.isServerPortLocal).toBe(true)
    expect(localResult.isEligibleForConcurrencyBoost).toBe(true)
    expect(localResult.effectiveConcurrency).toBeGreaterThanOrEqual(3)

    // Remote cloud server on Render
    const remoteResult = detectLocalDownloadEnvironment('https://manga-dl-vwyz.onrender.com/api')
    expect(remoteResult.isEligibleForConcurrencyBoost).toBe(false)
    expect(remoteResult.effectiveConcurrency).toBe(1)
  })

  it('persists and clamps user local concurrency settings between 1 and 4', () => {
    expect(getLocalConcurrentDownloadsSetting()).toBe(3)

    setLocalConcurrentDownloadsSetting(4)
    expect(getLocalConcurrentDownloadsSetting()).toBe(4)

    setLocalConcurrentDownloadsSetting(2)
    expect(getLocalConcurrentDownloadsSetting()).toBe(2)

    // Clamping limits
    setLocalConcurrentDownloadsSetting(10)
    expect(getLocalConcurrentDownloadsSetting()).toBe(4)

    setLocalConcurrentDownloadsSetting(0)
    expect(getLocalConcurrentDownloadsSetting()).toBe(1)
  })
})

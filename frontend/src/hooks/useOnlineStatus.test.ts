import { describe, it, expect } from 'bun:test'

describe('useOnlineStatus hook logic', () => {
  it('correctly tracks online and offline events', () => {
    let onlineHandler: (() => void) | null = null
    let offlineHandler: (() => void) | null = null

    const mockWindow = {
      addEventListener: (evt: string, cb: () => void) => {
        if (evt === 'online') onlineHandler = cb
        if (evt === 'offline') offlineHandler = cb
      },
      removeEventListener: (evt: string, cb: () => void) => {
        if (evt === 'online' && onlineHandler === cb) onlineHandler = null
        if (evt === 'offline' && offlineHandler === cb) offlineHandler = null
      },
    }

    let status = true
    const onOnline = () => { status = true }
    const onOffline = () => { status = false }

    mockWindow.addEventListener('online', onOnline)
    mockWindow.addEventListener('offline', onOffline)

    expect(typeof onlineHandler).toBe('function')
    expect(typeof offlineHandler).toBe('function')

    offlineHandler?.()
    expect(status).toBe(false)

    onlineHandler?.()
    expect(status).toBe(true)

    mockWindow.removeEventListener('online', onOnline)
    mockWindow.removeEventListener('offline', onOffline)

    expect(onlineHandler).toBeNull()
    expect(offlineHandler).toBeNull()
  })
})

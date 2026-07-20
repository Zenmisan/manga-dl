import { useEffect } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { KeepAwake } from '@capacitor-community/keep-awake'

function extractHex(rgba: string): string {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return '#0a0a0a'
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
}

export function useAndroidFeatures({ navigate, ambilightColor }: { navigate: NavigateFunction; ambilightColor: string }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    import('@capacitor/app').then(({ App }) => {
      const sub = App.addListener('backButton', () => navigate(-1))
      return () => { sub.then((h: { remove(): void }) => h.remove()) }
    }).catch(() => {})
  }, [navigate])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    KeepAwake.keepAwake().catch(() => {})
    return () => { KeepAwake.allowSleep().catch(() => {}) }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setBackgroundColor({ color: extractHex(ambilightColor) }).catch(() => {})
    return () => { StatusBar.setBackgroundColor({ color: '#0a0a0a' }).catch(() => {}) }
  }, [ambilightColor])
}

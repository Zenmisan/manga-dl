import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Shield, Bell, BellOff, Eye, EyeOff, BookOpen } from 'lucide-react'
import { useAppStore } from '../../lib/store'

export default function GeneralSettings() {
  const { 
    theme, setTheme, 
    amoledBlack, setAmoledBlack, 
    incognitoMode, setIncognitoMode,
    hapticFeedback, setHapticFeedback,
    appLockEnabled, setAppLockEnabled
  } = useAppStore()

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(localStorage.getItem('notifications-enabled') === 'true')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  // Desktop native (Tauri)
  const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  const [autoLaunch, setAutoLaunch] = useState(false)

  // Resolve notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifPermission(Notification.permission)
    }
  }, [])

  // Desktop: read auto-launch state
  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<boolean>('get_auto_launch').then(val => setAutoLaunch(val)).catch(() => {})
    }).catch(() => {})
  }, [isTauri])

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications not supported.')
      return
    }
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') {
      localStorage.setItem('notifications-enabled', 'true')
      setNotifEnabled(true)
    }
  }

  const handleDisableNotifications = () => {
    localStorage.setItem('notifications-enabled', 'false')
    setNotifEnabled(false)
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Appearance Section */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="font-bold text-lg">Appearance</h2>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-3">Theme</label>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map(t => (
                <button key={t}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                    theme === t ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'text-white/30 border-white/10 hover:border-white/20'
                  }`}
                >
                  {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '⚙️ System'}
                </button>
              ))}
            </div>
          </div>
          {/* AMOLED */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <h4 className="font-bold text-sm">AMOLED Black</h4>
              <p className="text-xs text-white/30 mt-0.5">Pure black backgrounds for OLED screens (dark mode only)</p>
            </div>
            <button
              onClick={() => setAmoledBlack(!amoledBlack)}
              disabled={theme === 'light'}
              className={`w-12 h-6 rounded-full relative transition-all border ${amoledBlack && theme !== 'light' ? 'bg-indigo-500/30 border-indigo-500/40' : 'bg-white/5 border-white/10'} disabled:opacity-30`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${amoledBlack && theme !== 'light' ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="font-bold text-lg">Notifications</h2>
        </div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="space-y-1">
              <h4 className="font-bold text-gray-100">Chapter Alerts</h4>
              <p className="text-sm text-white/30 font-medium">
                {notifPermission === 'denied'
                  ? 'Blocked by browser — enable in site settings'
                  : 'Show a notification when new chapters are queued'}
              </p>
            </div>
            {notifEnabled && notifPermission === 'granted' ? (
              <button
                onClick={handleDisableNotifications}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
              >
                <BellOff className="w-4 h-4" />
                Enabled
              </button>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={notifPermission === 'denied'}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-40"
              >
                <Bell className="w-4 h-4" />
                Enable
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <EyeOff className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="font-bold text-lg">Privacy</h2>
        </div>
        <div className="p-6 md:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="space-y-1">
              <h4 className="font-bold text-gray-100 flex items-center gap-2">
                {incognitoMode ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4 text-white/40" />}
                Incognito Mode
              </h4>
              <p className="text-sm text-white/30 font-medium">Reading progress will not be saved to history</p>
            </div>
            <button
              onClick={() => setIncognitoMode(!incognitoMode)}
              className={`relative w-12 h-6 rounded-full transition-all border ${
                incognitoMode
                  ? 'bg-purple-500/30 border-purple-500/40'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                incognitoMode ? 'left-6 bg-purple-400' : 'left-0.5 bg-white/30'
              }`} />
            </button>
          </div>
          {Capacitor.isNativePlatform() && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div>
                <p className="font-bold text-sm">Haptic Feedback</p>
                <p className="text-xs text-white/40 mt-0.5">Vibrate lightly on page turn</p>
              </div>
              <button
                role="switch"
                aria-checked={hapticFeedback}
                onClick={() => setHapticFeedback(!hapticFeedback)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  hapticFeedback ? 'bg-purple-500/40' : 'bg-white/10'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                  hapticFeedback ? 'left-6 bg-purple-400' : 'left-0.5 bg-white/30'
                }`} />
              </button>
            </div>
          )}
          {Capacitor.isNativePlatform() && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div>
                <p className="font-bold text-sm">Biometric App Lock</p>
                <p className="text-xs text-white/40 mt-0.5">Require fingerprint / face unlock when opening the app</p>
              </div>
              <button
                role="switch"
                aria-checked={appLockEnabled}
                onClick={async () => {
                  if (!appLockEnabled) {
                    try {
                      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
                      const { isAvailable } = await BiometricAuth.checkBiometry()
                      if (!isAvailable) { alert('No biometric authentication available on this device.'); return }
                      await BiometricAuth.authenticate({ reason: 'Enable biometric app lock', cancelTitle: 'Cancel' })
                      setAppLockEnabled(true)
                    } catch { /* cancelled */ }
                  } else {
                    setAppLockEnabled(false)
                  }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${appLockEnabled ? 'bg-purple-500/40' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${appLockEnabled ? 'left-6 bg-purple-400' : 'left-0.5 bg-white/30'}`} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Desktop Section (Tauri only) */}
      {isTauri && (
        <section className="glass-panel overflow-hidden border-white/5">
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 bg-sky-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <h2 className="font-bold text-lg">Desktop</h2>
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div>
                <p className="font-bold text-sm">Launch on Startup</p>
                <p className="text-xs text-white/40 mt-0.5">Start manga-dl automatically when you log in</p>
              </div>
              <button
                role="switch"
                aria-checked={autoLaunch}
                onClick={async () => {
                  const next = !autoLaunch
                  setAutoLaunch(next)
                  const { invoke } = await import('@tauri-apps/api/core')
                  invoke('set_auto_launch', { enabled: next }).catch(() => setAutoLaunch(!next))
                }}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${autoLaunch ? 'bg-sky-500/40' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${autoLaunch ? 'left-6 bg-sky-400' : 'left-0.5 bg-white/30'}`} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

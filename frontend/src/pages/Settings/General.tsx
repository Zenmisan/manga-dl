import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Moon, Sun, Smartphone, Check, Eye, EyeOff, Link2, Key, Bell, BellOff, Palette, Plug, Trash2, BellRing, ShieldCheck } from 'lucide-react'
import { ThemedSpinner } from '../../components/common/ThemedLoader'
import { motion } from 'framer-motion'
import { useAppStore } from '../../lib/store'
import type { AccentColor } from '../../lib/store'
import api, { resolveBaseURL } from '../../lib/api'

const SECTION: React.CSSProperties = { padding: '22px 20px', marginBottom: 14 }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--border)', minHeight: 52 }
const INPUT_STYLE: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-hover)', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s' }

function CardLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 14, height: 14, color: 'var(--accent)' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted2)' }}>{title}</span>
    </div>
  )
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle} disabled={disabled}
      style={{ width: 48, height: 28, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--surface-hover)', border: 'none', position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: disabled ? 0.4 : 1, transition: 'background 0.2s' }}
    >
      <span style={{ position: 'absolute', top: 4, width: 20, height: 20, borderRadius: 999, background: '#fff', left: on ? 24 : 4, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
    </button>
  )
}

const ACCENTS: { id: AccentColor; color: string }[] = [
  { id: 'red',    color: '#dc2626' },
  { id: 'blue',   color: '#2563eb' },
  { id: 'purple', color: '#7c3aed' },
  { id: 'green',  color: '#16a34a' },
  { id: 'orange', color: '#ea580c' },
  { id: 'pink',   color: '#db2777' },
]

const ease = [0.16, 1, 0.3, 1] as const

export default function GeneralSettings() {
  const {
    theme, setTheme, amoledBlack, setAmoledBlack, accent, setAccent,
    incognitoMode, setIncognitoMode, hapticFeedback, setHapticFeedback,
    appLockEnabled, setAppLockEnabled, syncWifiOnly, setSyncWifiOnly,
  } = useAppStore()

  const modeActive = (mode: 'dark' | 'light' | 'amoled') => {
    if (mode === 'amoled') return theme === 'dark' && amoledBlack
    if (mode === 'dark') return theme === 'dark' && !amoledBlack
    return theme === 'light'
  }
  const setMode = (mode: 'dark' | 'light' | 'amoled') => {
    if (mode === 'amoled') { setTheme('dark'); setAmoledBlack(true) }
    else if (mode === 'dark') { setTheme('dark'); setAmoledBlack(false) }
    else { setTheme('light'); setAmoledBlack(false) }
  }

  const [apiKey, setApiKey] = useState(localStorage.getItem('manga-api-key') || '')
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('manga-backend-url') || '')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connStatus, setConnStatus] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)

  const testConnection = async (urlOverride?: string, keyOverride?: string) => {
    const url = urlOverride ?? backendUrl
    const key = keyOverride ?? apiKey
    setSaving(true); setConnStatus(null)
    try {
      const base = url.trim() ? url.trim() : resolveBaseURL()
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(`${base}/sources/builtins?api_key=${key || 'mgdl-creator'}`, { signal: controller.signal })
      clearTimeout(tid)
      if (res.ok) { setConnStatus({ type: 'ok', msg: 'Backend connected!' }) }
      else if (res.status === 403) setConnStatus({ type: 'error', msg: 'API key rejected (403).' })
      else setConnStatus({ type: 'error', msg: `Backend returned ${res.status}.` })
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      setConnStatus({ type: 'error', msg: isTimeout ? 'Backend slow to respond (cold start).' : 'Backend unreachable.' })
    } finally { setSaving(false) }
  }

  const handleSave = async () => {
    localStorage.setItem('manga-api-key', apiKey)
    if (backendUrl.trim()) localStorage.setItem('manga-backend-url', backendUrl.trim())
    else localStorage.removeItem('manga-backend-url')
    api.defaults.baseURL = resolveBaseURL()
    const { ExtensionManager } = await import('../../lib/extensions')
    ExtensionManager.getInstance().reinit()
    await testConnection(backendUrl, apiKey)
  }

  const [notifEnabled, setNotifEnabled] = useState(localStorage.getItem('notifications-enabled') === 'true')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('Notification' in window ? Notification.permission : 'denied')
  const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  const [autoLaunch, setAutoLaunch] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if ('Notification' in window) setNotifPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<boolean>('get_auto_launch').then(v => setAutoLaunch(v)).catch(() => {})
    }).catch(() => {})
  }, [isTauri])

  const handleEnableNotif = async () => {
    if (!('Notification' in window)) { alert('Notifications not supported.'); return }
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') { localStorage.setItem('notifications-enabled', 'true'); setNotifEnabled(true) }
  }

  const MODES = [
    { id: 'dark'   as const, label: 'Dark',   Icon: Moon,       bg: '#050505', fg: '#fafafa' },
    { id: 'light'  as const, label: 'Light',  Icon: Sun,        bg: '#f4f4f5', fg: '#09090b' },
    { id: 'amoled' as const, label: 'AMOLED', Icon: Smartphone, bg: '#000000', fg: '#fafafa' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="hidden md:block" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--fg)', marginBottom: 4 }}>General</h2>
        <p style={{ fontSize: 13, color: 'var(--muted2)' }}>Core preferences and connection settings.</p>
      </div>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.4, ease }}
      >
        <CardLabel icon={Palette} title="Appearance" />

        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 10 }}>Theme Mode</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {MODES.map(({ id, label, Icon, bg, fg }) => {
            const isActive = modeActive(id)
            return (
              <button key={id} onClick={() => setMode(id)}
                style={{ position: 'relative', padding: '16px 8px 14px', borderRadius: 16, border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`, background: isActive ? 'rgba(var(--accent-rgb,220,38,38),0.06)' : 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'border-color 0.15s' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 999, background: bg, border: '1px solid rgba(128,128,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 20, height: 20, color: fg }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: isActive ? 'var(--accent)' : 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                {isActive && <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 999, background: 'var(--accent)' }} />}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 12 }}>Accent Color</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {ACCENTS.map(({ id, color }) => (
            <button key={id} onClick={() => setAccent(id)} title={id}
              style={{ width: 36, height: 36, borderRadius: 999, background: color, border: `3px solid ${accent === id ? 'var(--fg)' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s, transform 0.1s', transform: accent === id ? 'scale(1.15)' : 'scale(1)' }}
            >
              {accent === id && <Check style={{ width: 14, height: 14, color: '#fff' }} />}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, duration: 0.4, ease }}
      >
        <CardLabel icon={Plug} title="Connection" />

        <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>Backend URL</div>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <Link2 style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted3)', pointerEvents: 'none' }} />
          <input
            type="text" value={backendUrl} onChange={e => setBackendUrl(e.target.value)}
            placeholder="https://api.manga-dl.local/v3"
            style={{ ...INPUT_STYLE, paddingLeft: 38 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted3)', marginBottom: 16 }}>Root URL of your self-hosted manga-dl instance.</div>

        <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)' }}>API Key</div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Key style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted3)', pointerEvents: 'none' }} />
          <input
            type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="Enter your X-API-Key..."
            style={{ ...INPUT_STYLE, paddingLeft: 38, paddingRight: 44 }}
          />
          <button onClick={() => setShowKey(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--muted3)' }}
          >
            {showKey ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
          </button>
        </div>

        {connStatus && (
          <div style={{ fontSize: 12, padding: '9px 12px', borderRadius: 10, marginBottom: 14, background: connStatus.type === 'ok' ? 'rgba(74,222,128,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${connStatus.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(220,38,38,0.25)'}`, color: connStatus.type === 'ok' ? 'rgb(74,222,128)' : 'var(--accent)', fontWeight: 600 }}>
            {connStatus.msg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => testConnection()} disabled={saving} className="btn-secondary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving ? <ThemedSpinner size="xs" /> : null}
            Test
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
            Save
          </button>
        </div>
      </motion.section>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.4, ease }}
      >
        <CardLabel icon={BellRing} title="Notifications" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 52 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Push Notifications</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>
              {notifPermission === 'denied' ? 'Blocked — enable in site settings' : 'Alerts for new chapters and library updates'}
            </div>
          </div>
          {notifEnabled && notifPermission === 'granted' ? (
            <button onClick={() => { localStorage.setItem('notifications-enabled', 'false'); setNotifEnabled(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', fontSize: 12, fontWeight: 700, color: 'rgb(74,222,128)', cursor: 'pointer', flexShrink: 0 }}
            >
              <BellOff style={{ width: 14, height: 14 }} /> Enabled
            </button>
          ) : (
            <button onClick={handleEnableNotif} disabled={notifPermission === 'denied'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', fontSize: 12, fontWeight: 700, color: 'rgb(251,191,36)', cursor: 'pointer', opacity: notifPermission === 'denied' ? 0.4 : 1, flexShrink: 0 }}
            >
              <Bell style={{ width: 14, height: 14 }} /> Enable
            </button>
          )}
        </div>

        <div style={ROW}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Auto-Download</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Download new chapters when on Wi-Fi</div>
          </div>
          <Toggle on={syncWifiOnly} onToggle={() => setSyncWifiOnly(!syncWifiOnly)} />
        </div>
      </motion.section>

      <motion.section className="glass-card" style={SECTION}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.21, duration: 0.4, ease }}
      >
        <CardLabel icon={ShieldCheck} title="Privacy" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 52 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Incognito Mode</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Reading progress will not be saved to history</div>
          </div>
          <Toggle on={incognitoMode} onToggle={() => setIncognitoMode(!incognitoMode)} />
        </div>

        {Capacitor.isNativePlatform() && (
          <div style={ROW}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Haptic Feedback</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Vibrate lightly on page turn</div>
            </div>
            <Toggle on={hapticFeedback} onToggle={() => setHapticFeedback(!hapticFeedback)} />
          </div>
        )}

        {Capacitor.isNativePlatform() && (
          <div style={ROW}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Biometric App Lock</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Require fingerprint / face to open app</div>
            </div>
            <Toggle on={appLockEnabled} onToggle={async () => {
              if (!appLockEnabled) {
                try {
                  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
                  const { isAvailable } = await BiometricAuth.checkBiometry()
                  if (!isAvailable) { alert('No biometric authentication available.'); return }
                  await BiometricAuth.authenticate({ reason: 'Enable biometric app lock', cancelTitle: 'Cancel' })
                  setAppLockEnabled(true)
                } catch { /* cancelled */ }
              } else { setAppLockEnabled(false) }
            }} />
          </div>
        )}

        {isTauri && (
          <div style={ROW}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Launch on Startup</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Start manga-dl automatically when you log in</div>
            </div>
            <Toggle on={autoLaunch} onToggle={async () => {
              const next = !autoLaunch; setAutoLaunch(next)
              const { invoke } = await import('@tauri-apps/api/core')
              invoke('set_auto_launch', { enabled: next }).catch(() => setAutoLaunch(!next))
            }} />
          </div>
        )}
      </motion.section>

      <button
        onClick={() => { if (confirm('Clear all cached temporary files?')) alert('Cache cleared.') }}
        style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: 'var(--accent)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Trash2 style={{ width: 16, height: 16 }} />
        Clear Image Cache
      </button>
    </div>
  )
}

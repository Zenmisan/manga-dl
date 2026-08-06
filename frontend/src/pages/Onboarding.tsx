import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Book, Server, Key, ChevronRight, Check, Sparkles, Loader2, AtSign, AlertTriangle } from 'lucide-react'
import api, { resolveBaseURL } from '../lib/api'

const STEPS = ['welcome', 'backend', 'username', 'done'] as const
type Step = typeof STEPS[number]

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--bg)',
  fontSize: 14, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [apiKey, setApiKey] = useState(localStorage.getItem('manga-api-key') || 'mgdl-creator')
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('manga-backend-url') || '')
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const handleConnect = async () => {
    setTestingConnection(true)
    setConnectionError(null)
    localStorage.setItem('manga-api-key', apiKey || 'mgdl-creator')
    if (backendUrl.trim()) localStorage.setItem('manga-backend-url', backendUrl.trim())
    else localStorage.removeItem('manga-backend-url')
    api.defaults.baseURL = resolveBaseURL()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(`${resolveBaseURL()}/sources/builtins?api_key=${apiKey || 'mgdl-creator'}`, { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) setStep('username')
      else if (res.status === 403) setConnectionError('API key rejected (403). Check your key — settings saved.')
      else setConnectionError(`Backend returned ${res.status}. Check the URL — settings saved.`)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') setStep('username')
      else { setConnectionError('Backend unreachable. Settings saved — it may still be starting up.'); setStep('username') }
    } finally {
      setTestingConnection(false)
    }
  }

  const handleUsernameSubmit = async () => {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) { setStep('done'); return }
    if (!/^[a-z0-9_]{3,24}$/.test(trimmed)) {
      setUsernameError('3–24 chars, letters/numbers/underscores only.')
      return
    }
    setUsernameLoading(true)
    setUsernameError(null)
    try {
      await api.post('/users/profile/setup', { username: trimmed })
      localStorage.setItem('manga-username', trimmed)
      setStep('done')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to set username.'
      setUsernameError(msg)
    } finally {
      setUsernameLoading(false)
    }
  }

  const finish = () => {
    localStorage.setItem('onboarded', '1')
    const params = new URLSearchParams(window.location.search)
    const redirectTo = params.get('redirect')
    navigate(redirectTo || '/', { replace: true })
  }

  const stepIdx = STEPS.indexOf(step)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ height: 4, borderRadius: 2, background: i <= stepIdx ? '#dc2626' : 'var(--surface-hover)', width: i <= stepIdx ? 32 : 16, transition: 'all 0.3s' }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/Manga-dl1.png" alt="manga-dl" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(220,38,38,0.3))' }} />
            </div>
            <h1 className="page-title" style={{ fontSize: 30, marginBottom: 12 }}>Welcome to manga-dl</h1>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 32, lineHeight: 1.7, maxWidth: 320, margin: '0 auto 32px' }}>
              Your cloud-connected manga reader. Search, download, and read across 500+ sources — on web, desktop, and mobile.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 32 }}>
              {[
                { icon: Book, label: 'Library', desc: 'Cloud + local' },
                { icon: Sparkles, label: 'AI Upscale', desc: 'Sharper pages' },
                { icon: Server, label: 'Self-host', desc: 'Your server' },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px 10px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
                  <item.icon style={{ width: 20, height: 20, color: '#ef4444', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted3)', marginTop: 2 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep('backend')} className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', fontSize: 14, boxShadow: '0 4px 24px rgba(220,38,38,0.25)' }}>
              Get Started <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </motion.div>
        )}

        {step === 'backend' && (
          <motion.div key="backend" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Server style={{ width: 24, height: 24, color: 'rgb(56,189,248)' }} />
            </div>
            <h2 className="page-title" style={{ fontSize: 24, marginBottom: 8 }}>Connect to backend</h2>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 28, lineHeight: 1.6 }}>
              The app needs an API key to talk to the server. The default key works for the hosted version.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>
                  <Key style={{ width: 12, height: 12 }} /> API Key
                </label>
                <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="mgdl-creator" style={INPUT_STYLE} />
                <p style={{ marginTop: 6, fontSize: 11, color: 'var(--muted3)' }}>Default: <span style={{ fontFamily: 'monospace', color: 'var(--muted2)' }}>mgdl-creator</span></p>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>
                  <Server style={{ width: 12, height: 12 }} /> Custom Backend URL <span style={{ color: 'var(--muted3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </label>
                <input type="text" value={backendUrl} onChange={e => setBackendUrl(e.target.value)} placeholder="https://your-server.example.com" style={INPUT_STYLE} />
                <p style={{ marginTop: 6, fontSize: 11, color: 'var(--muted3)' }}>Leave empty to use the default cloud backend</p>
              </div>
            </div>

            {connectionError && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#f87171' }}>
                {connectionError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => setStep('welcome')} disabled={testingConnection} className="btn-secondary" style={{ flex: 1 }}>Back</button>
              <button onClick={handleConnect} disabled={testingConnection} className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {testingConnection ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Connecting…</> : <>Continue <ChevronRight style={{ width: 15, height: 15 }} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'username' && (
          <motion.div key="username" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <AtSign style={{ width: 24, height: 24, color: '#ef4444' }} />
            </div>
            <h2 className="page-title" style={{ fontSize: 24, marginBottom: 8 }}>Choose a username</h2>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 20, lineHeight: 1.6 }}>
              Your unique identifier on manga-dl. Keeps your library separate from every other user.
            </p>

            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', marginBottom: 20 }}>
              <AlertTriangle style={{ width: 16, height: 16, color: 'rgb(234,179,8)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'rgba(234,179,8,0.9)', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                This username <strong>cannot be changed</strong> after setting. Choose carefully.
              </p>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted3)', marginBottom: 8 }}>
                <AtSign style={{ width: 12, height: 12 }} /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError(null) }}
                placeholder="e.g. mangafan_23"
                maxLength={24}
                style={INPUT_STYLE}
              />
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--muted3)' }}>3–24 characters. Letters, numbers, underscores only.</p>
            </div>

            {usernameError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#f87171', marginBottom: 12 }}>
                {usernameError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep('backend')} disabled={usernameLoading} className="btn-secondary" style={{ flex: 1 }}>Back</button>
              <button
                onClick={handleUsernameSubmit}
                disabled={usernameLoading || username.trim().length < 3}
                className="btn-primary"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {usernameLoading ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Setting…</> : <>Set Username <ChevronRight style={{ width: 15, height: 15 }} /></>}
              </button>
            </div>
            <button
              onClick={() => setStep('done')}
              disabled={usernameLoading}
              style={{ marginTop: 14, width: '100%', fontSize: 12, color: 'var(--muted3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Skip for now
            </button>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
              <Check style={{ width: 36, height: 36, color: 'rgb(74,222,128)' }} />
            </div>
            <h2 className="page-title" style={{ fontSize: 28, marginBottom: 12 }}>You're all set!</h2>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 36, lineHeight: 1.6 }}>
              Search for manga, subscribe to series, download chapters and read anywhere.
            </p>
            <button onClick={finish} className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', fontSize: 14, boxShadow: '0 4px 24px rgba(220,38,38,0.25)' }}>
              Open Library <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

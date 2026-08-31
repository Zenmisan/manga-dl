/* Hallmark · genre: atmospheric · macrostructure: center-wizard · theme: app tokens · step: 4
 * pre-emit critique: P5 H5 E5 S4 R5 V4
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Book, Server, Key, ChevronRight, Check, Sparkles, Loader2, AtSign, AlertTriangle, Dices } from 'lucide-react'
import api, { resolveBaseURL } from '../lib/api'

const STEPS = ['welcome', 'backend', 'username', 'done'] as const
type Step = typeof STEPS[number]

const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--bg)',
  fontSize: 14, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
}

const BTN_BASE = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all'

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
  const [generatingUsername, setGeneratingUsername] = useState(false)

  const generateUsername = async () => {
    setGeneratingUsername(true)
    setUsernameError(null)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{
            role: 'user',
            content: 'Output ONLY a single manga/anime themed username. No explanation, no quotes, no punctuation. Use only lowercase letters, numbers, underscores. 5–20 characters. Examples: shadow_blade42, neon_samurai, void_reader99, ronin_scroll',
          }],
          max_tokens: 25,
          temperature: 1.0,
        }),
      })
      if (!res.ok) throw new Error(`Groq API error ${res.status}`)
      const data = await res.json()
      const raw = (data.choices?.[0]?.message?.content ?? '').trim()
      // Extract first valid username token — handles noisy model output
      const match = raw.match(/[a-z][a-z0-9_]{2,23}/i)
      const cleaned = match
        ? match[0].toLowerCase().slice(0, 24)
        : raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
      if (cleaned.length >= 3) {
        setUsername(cleaned)
      } else {
        setUsernameError('Could not generate a valid username. Try again.')
      }
    } catch {
      setUsernameError('Generation failed. Check your connection and try again.')
    } finally {
      setGeneratingUsername(false)
    }
  }

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
      {/* Ambient bloom */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Progress track */}
      <div role="progressbar" aria-valuenow={stepIdx + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label={`Step ${stepIdx + 1} of ${STEPS.length}`} style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ height: 4, borderRadius: 2, background: i <= stepIdx ? 'var(--accent)' : 'var(--surface-hover)', width: i <= stepIdx ? 32 : 16, transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)' }} />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Welcome ── */}
        {step === 'welcome' && (
          <motion.div key="welcome" {...FADE} style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/Manga-dl1.png" alt="manga-dl" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(220,38,38,0.3))' }} />
            </div>

            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Welcome</p>
            <h1 style={{ fontSize: 'clamp(24px,5vw,32px)', fontWeight: 800, color: 'var(--fg)', lineHeight: 1.15, marginBottom: 12, overflowWrap: 'anywhere', minWidth: 0 }}>Your manga, everywhere.</h1>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 32, lineHeight: 1.7, maxWidth: 300, margin: '0 auto 32px' }}>
              Search, download, and read across 50+ sources — on web, desktop, and Android.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 32 }}>
              {[
                { icon: Book, label: 'Library', desc: 'Cloud + local' },
                { icon: Sparkles, label: 'Enhance', desc: 'Sharper local scans' },
                { icon: Server, label: 'Self-host', desc: 'Your server' },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px 10px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
                  <item.icon style={{ width: 20, height: 20, color: 'var(--accent)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted3)', marginTop: 2 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('backend')}
              className={`btn-primary ${BTN_BASE}`}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', fontSize: 14, boxShadow: '0 4px 24px rgba(220,38,38,0.25)' }}
            >
              Get Started <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </motion.div>
        )}

        {/* ── Backend ── */}
        {step === 'backend' && (
          <motion.div key="backend" {...FADE} style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Server style={{ width: 24, height: 24, color: 'var(--accent)' }} />
            </div>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Step 2</p>
            <h2 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'var(--fg)', marginBottom: 8, overflowWrap: 'anywhere', minWidth: 0 }}>Connect to backend</h2>
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
              <div role="alert" style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#f87171' }}>
                {connectionError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => setStep('welcome')} disabled={testingConnection} className={`btn-secondary ${BTN_BASE}`} style={{ flex: 1 }}>Back</button>
              <button onClick={handleConnect} disabled={testingConnection} className={`btn-primary ${BTN_BASE}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {testingConnection ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Connecting…</> : <>Continue <ChevronRight style={{ width: 15, height: 15 }} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Username ── */}
        {step === 'username' && (
          <motion.div key="username" {...FADE} style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <AtSign style={{ width: 24, height: 24, color: 'var(--accent)' }} />
            </div>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Step 3</p>
            <h2 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'var(--fg)', marginBottom: 8, overflowWrap: 'anywhere', minWidth: 0 }}>Choose a username</h2>
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
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError(null) }}
                  placeholder="e.g. mangafan_23"
                  maxLength={24}
                  style={{ ...INPUT_STYLE, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={generateUsername}
                  disabled={generatingUsername || usernameLoading}
                  title="Generate a random username"
                  className={BTN_BASE}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted2)')}
                >
                  {generatingUsername
                    ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                    : <Dices style={{ width: 18, height: 18 }} />}
                </button>
              </div>
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--muted3)' }}>3–24 characters. Letters, numbers, underscores only. Hit 🎲 to generate one.</p>
            </div>

            {usernameError && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#f87171', marginBottom: 12 }}>
                {usernameError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep('backend')} disabled={usernameLoading} className={`btn-secondary ${BTN_BASE}`} style={{ flex: 1 }}>Back</button>
              <button
                onClick={handleUsernameSubmit}
                disabled={usernameLoading || generatingUsername || username.trim().length < 3}
                className={`btn-primary ${BTN_BASE}`}
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {usernameLoading ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Setting…</> : <>Set Username <ChevronRight style={{ width: 15, height: 15 }} /></>}
              </button>
            </div>

            <button
              onClick={() => setStep('done')}
              disabled={usernameLoading}
              aria-label="Skip username setup"
              className={`${BTN_BASE}`}
              style={{ marginTop: 14, width: '100%', fontSize: 12, color: 'var(--muted3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Skip for now
            </button>
          </motion.div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <motion.div key="done" {...FADE} style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
              <Check style={{ width: 36, height: 36, color: 'rgb(74,222,128)' }} />
            </div>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Ready</p>
            <h2 style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 800, color: 'var(--fg)', marginBottom: 12, overflowWrap: 'anywhere', minWidth: 0 }}>You're all set.</h2>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 36, lineHeight: 1.6 }}>
              Search for manga, subscribe to series, download chapters and read anywhere.
            </p>
            <button
              onClick={finish}
              className={`btn-primary ${BTN_BASE}`}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', fontSize: 14, boxShadow: '0 4px 24px rgba(220,38,38,0.25)' }}
            >
              Open Library <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

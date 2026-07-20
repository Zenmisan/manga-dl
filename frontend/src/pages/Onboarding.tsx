import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Book, Server, Key, ChevronRight, Check, Sparkles, Loader2 } from 'lucide-react'
import api, { resolveBaseURL } from '../lib/api'

const STEPS = ['welcome', 'backend', 'done'] as const
type Step = typeof STEPS[number]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [apiKey, setApiKey] = useState(localStorage.getItem('manga-api-key') || 'mgdl-creator')
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('manga-backend-url') || '')
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const handleConnect = async () => {
    setTestingConnection(true)
    setConnectionError(null)

    // Save immediately so a cold-start timeout doesn't block setup
    localStorage.setItem('manga-api-key', apiKey || 'mgdl-creator')
    if (backendUrl.trim()) {
      localStorage.setItem('manga-backend-url', backendUrl.trim())
    } else {
      localStorage.removeItem('manga-backend-url')
    }
    api.defaults.baseURL = resolveBaseURL()

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(`${resolveBaseURL()}/sources/builtins?api_key=${apiKey || 'mgdl-creator'}`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        setStep('done')
      } else if (res.status === 403) {
        setConnectionError('API key rejected (403). Check your key — settings saved.')
      } else {
        setConnectionError(`Backend returned ${res.status}. Check the URL — settings saved.`)
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      // Still advance — Render cold starts can take up to 60s
      if (isTimeout) {
        setStep('done')
      } else {
        setConnectionError('Backend unreachable. Settings saved — it may still be starting up.')
        setStep('done')
      }
    } finally {
      setTestingConnection(false)
    }
  }

  const finish = () => {
    localStorage.setItem('onboarded', '1')
    
    const params = new URLSearchParams(window.location.search)
    const redirectTo = params.get('redirect')
    if (redirectTo) {
      navigate(redirectTo, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
      {/* Progress dots */}
      <div className="flex gap-2 mb-12">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${i <= stepIdx ? 'w-8 bg-red-500' : 'w-4 bg-white/10'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-20 h-20 mx-auto mb-8 flex items-center justify-center">
              <img src="/Manga-dl1.png" alt="manga-dl logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">Welcome to manga-dl</h1>
            <p className="text-white/50 mb-10 leading-relaxed">
              Your cloud-connected manga reader. Search, download, and read across 500+ sources — on web, desktop, and mobile.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-10">
              {[
                { icon: Book, label: 'Library', desc: 'Cloud + local' },
                { icon: Sparkles, label: 'AI Upscale', desc: 'Sharper pages' },
                { icon: Server, label: 'Self-hostable', desc: 'Your server' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                  <item.icon className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white/80">{item.label}</p>
                  <p className="text-[10px] text-white/30">{item.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setStep('backend')}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base font-bold"
            >
              Get Started <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 'backend' && (
          <motion.div key="backend" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            className="max-w-md w-full"
          >
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
              <Server className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-2">Connect to backend</h2>
            <p className="text-white/40 mb-8 text-sm">The app needs an API key to talk to the server. The default key works for the hosted version.</p>

            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/30 mb-2">
                  <Key className="w-3.5 h-3.5" /> API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="mgdl-creator"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-white/20"
                />
                <p className="mt-1.5 text-[10px] text-white/20">Default: <span className="font-mono text-white/40">mgdl-creator</span></p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/30 mb-2">
                  <Server className="w-3.5 h-3.5" /> Custom Backend URL <span className="text-white/20 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={e => setBackendUrl(e.target.value)}
                  placeholder="https://your-server.example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-white/20"
                />
                <p className="mt-1.5 text-[10px] text-white/20">Leave empty to use the default cloud backend</p>
              </div>
            </div>

            {connectionError && (
              <p className="mt-4 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {connectionError}
              </p>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('welcome')}
                disabled={testingConnection}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm text-white/40 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleConnect}
                disabled={testingConnection}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mx-auto mb-8">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">You're all set!</h2>
            <p className="text-white/40 mb-10">Search for manga, subscribe to series, download chapters and read anywhere.</p>
            <button onClick={finish}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base font-bold"
            >
              Open Library <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

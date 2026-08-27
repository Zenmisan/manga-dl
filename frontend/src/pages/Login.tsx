/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V4 */
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, BookOpen, ArrowLeft, Key, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { ThemedSpinner } from '../components/common/ThemedLoader'
import { supabase } from '../lib/supabase'
import { firebaseAuth } from '../lib/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }
const BTN_BASE = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all'

const hasSupabase = !!import.meta.env.VITE_SUPABASE_ANON_KEY

function GoogleIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
      <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('manga-dl-remembered-email')
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(saved)
       
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSupabase) { navigate('/r'); return }
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      if (rememberMe) {
        localStorage.setItem('manga-dl-remembered-email', email)
      } else {
        localStorage.removeItem('manga-dl-remembered-email')
      }
      navigate('/r')
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(firebaseAuth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const idToken = credential?.idToken
      if (!idToken) throw new Error('No ID token returned from Google.')
      // Exchange Google ID token for a Supabase session — keeps all table data working
      const { error: sbError } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
      if (sbError) throw sbError
      navigate('/r')
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Google sign-in failed.'
      setError(msg)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6 text-white" style={{ background: 'var(--bg)' }}>
      {/* Radial red glow backdrop */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0%,rgba(5,5,5,0)_70%)]" />

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/r')}
        aria-label="Go back to app"
        className={`absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold backdrop-blur-md ${BTN_BASE}`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Container */}
      <motion.div
        {...FADE}
        className="w-full max-w-md z-10 flex flex-col items-center"
      >
        {/* Logo Header */}
        <div className="mb-6 text-center flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20">
            <BookOpen className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-red-500 tracking-wider uppercase font-mono">MANGA-DL</h1>
        </div>

        {/* Glass Card */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative space-y-6">
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Sign In</p>
            <h2 className="text-xl font-black text-white tracking-wide uppercase">Welcome Back</h2>
            <p className="text-xs text-zinc-400">Your library awaits.</p>
          </div>

          {!hasSupabase ? (
            /* API-key mode — no Supabase configured */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Key className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Running in local mode — authenticated via API key. No account needed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/r')}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_4px_24px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Continue to App
              </button>
            </div>
          ) : (
            <>
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <ThemedSpinner size="sm" />
                ) : (
                  <GoogleIcon style={{ width: 16, height: 16 }} />
                )}
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="enter your email"
                      className="w-full h-11 rounded-xl pl-10 pr-4 bg-white/5 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:shadow-[0_0_15px_2px_rgba(220,38,38,0.4)] transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Password</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-11 rounded-xl pl-10 pr-10 bg-white/5 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:shadow-[0_0_15px_2px_rgba(220,38,38,0.4)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded ${BTN_BASE}`}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none hover:text-zinc-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="accent-red-600 w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                {/* Error Banner */}
                {error && (
                  <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold leading-relaxed">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-11 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_4px_24px_var(--accent-glow)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <ThemedSpinner size="sm" /> : <LogIn className="w-4 h-4" />}
                  <span>Sign In</span>
                </button>
              </form>

              {/* Sign up prompt */}
              <div className="text-center pt-2">
                <p className="text-xs text-zinc-400">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-red-500 font-bold hover:text-red-400 transition-colors">
                    Sign up
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}


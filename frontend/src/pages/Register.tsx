import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, UserPlus, BookOpen, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service.')
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      setSuccess(true)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 max-w-md w-full text-center border-white/5"
        >
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black mb-3">Check your email</h2>
          <p className="text-white/40 text-sm mb-6">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it to activate your account.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full">
            Go to Login
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
            <BookOpen className="w-7 h-7 text-red-500" />
          </div>
          <span className="text-2xl font-black tracking-tight">manga-dl</span>
        </div>

        <div className="glass-panel p-8 border-white/5">
          <h1 className="text-2xl font-black tracking-tight mb-1">Create Account</h1>
          <p className="text-white/30 text-sm mb-8">
            Sync your library across up to 3 devices.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full glass-panel py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full glass-panel py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-2 block">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full glass-panel py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setAgreedToTerms(p => !p)}
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  agreedToTerms ? 'bg-red-600 border-red-600' : 'border-white/20 bg-white/5'
                }`}
              >
                {agreedToTerms && <span className="text-white text-xs font-black">✓</span>}
              </div>
              <span className="text-white/50 text-sm leading-relaxed">
                I have read and agree to the{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  className="text-red-400 hover:text-red-300 font-bold inline-flex items-center gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  Terms of Service
                  <ExternalLink className="w-3 h-3" />
                </Link>
                , including the{' '}
                <strong className="text-white">3-device limit policy</strong>.
              </span>
            </label>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Account
            </button>
          </form>

          <p className="mt-6 text-center text-white/30 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-red-400 hover:text-red-300 font-bold">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

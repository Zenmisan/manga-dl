import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, BookOpen, Send, CheckCircle } from 'lucide-react'
import { ThemedSpinner } from '../components/common/ThemedLoader'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../lib/usePageTitle'

const FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }
const BTN_BASE = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all'

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (authError) throw authError
      setSent(true)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6 text-white" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0%,rgba(5,5,5,0)_70%)]" />

      <button
        type="button"
        onClick={() => navigate('/login')}
        className={`absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold backdrop-blur-md ${BTN_BASE}`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <motion.div {...FADE} className="w-full max-w-md z-10 flex flex-col items-center">
        <div className="mb-6 text-center flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20">
            <BookOpen className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-red-500 tracking-wider uppercase font-mono">MANGA-DL</h1>
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-black text-white uppercase tracking-wide">Check your email</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We sent a password reset link to <span className="text-white font-bold">{email}</span>. Check your inbox and spam folder.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-11 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider transition-all"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Reset Password</p>
                <h2 className="text-xl font-black text-white tracking-wide uppercase">Forgot Password?</h2>
                <p className="text-xs text-zinc-400">Enter your email and we'll send a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="enter your email"
                      className="w-full h-11 rounded-xl pl-10 pr-4 bg-white/5 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:shadow-[0_0_15px_2px_rgba(220,38,38,0.4)] transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-11 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_4px_24px_var(--accent-glow)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${BTN_BASE}`}
                >
                  {loading ? <ThemedSpinner size="sm" /> : <Send className="w-4 h-4" />}
                  <span>Send Reset Link</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-xs text-zinc-400">
                  Remember your password?{' '}
                  <Link to="/login" className="text-red-500 font-bold hover:text-red-400 transition-colors">
                    Sign in
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

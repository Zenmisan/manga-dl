import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, LogIn, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-black tracking-tight mb-1">Sign In</h1>
          <p className="text-white/30 text-sm mb-8">Welcome back. Your library awaits.</p>

          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-white/30 text-sm">
              No account?{' '}
              <Link to="/register" className="text-red-400 hover:text-red-300 font-bold">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

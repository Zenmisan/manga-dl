/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V4 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, BookOpen, ExternalLink, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { ThemedSpinner } from '../components/common/ThemedLoader'
import { supabase } from '../lib/supabase'

const FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }
const BTN_BASE = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--bg)',
  fontSize: 14, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
  letterSpacing: '0.12em', color: 'var(--muted3)', display: 'block', marginBottom: 6,
}

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

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!agreedToTerms) { setError('You must agree to the Terms of Service.'); return }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://manga-dl.web.app/login' } })
      if (authError) throw authError
      setSuccess(true)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      const { firebaseAuth } = await import('../lib/firebase')
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(firebaseAuth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const idToken = credential?.idToken
      if (!idToken) throw new Error('No ID token returned from Google.')
      const { error: sbError } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
      if (sbError) throw sbError
      navigate('/r')
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Google sign-in failed.'
      setError(msg)
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div {...FADE}
          style={{ maxWidth: 400, width: '100%', padding: '36px 32px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <UserPlus style={{ width: 28, height: 28, color: 'var(--accent)' }} />
          </div>
          <h2 className="page-title" style={{ fontSize: 22, marginBottom: 10 }}>Check your email</h2>
          <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 24 }}>
            We sent a link to <strong style={{ color: 'var(--fg)' }}>{email}</strong>. Click it to activate your account.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary" style={{ width: '100%' }}>Go to Login</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/r')}
        aria-label="Go back to app"
        className={BTN_BASE}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--fg)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 20,
          backdropFilter: 'blur(16px)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back
      </button>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div {...FADE} style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ padding: 10, background: 'rgba(220,38,38,0.12)', borderRadius: 16, border: '1px solid rgba(220,38,38,0.2)' }}>
            <BookOpen style={{ width: 24, height: 24, color: '#ef4444' }} />
          </div>
          <span className="page-title" style={{ fontSize: 22 }}>manga-dl</span>
        </div>

        <div style={{ padding: '36px 32px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--surface)', backdropFilter: 'blur(24px)' }}>
          <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 6 }}>Get Started</p>
          <h1 className="page-title" style={{ fontSize: 26, marginBottom: 4 }}>Create Account</h1>
          <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 28 }}>Sync your library across up to 3 devices.</p>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-[var(--border)] bg-white/[.04] hover:bg-white/[.08] text-[var(--fg)] text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {googleLoading ? (
              <ThemedSpinner size="sm" />
            ) : (
              <GoogleIcon style={{ width: 18, height: 18 }} />
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="reg-email" style={LABEL_STYLE}>Email</label>
              <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={INPUT_STYLE} placeholder="you@example.com" className="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1" />
            </div>
            <div>
              <label htmlFor="reg-password" style={LABEL_STYLE}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ ...INPUT_STYLE, paddingRight: 42 }}
                  placeholder="Min. 8 characters"
                  className="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-confirm" style={LABEL_STYLE}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={{ ...INPUT_STYLE, paddingRight: 42 }}
                  placeholder="••••••••"
                  className="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4,
                  }}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="accent-red-600 cursor-pointer flex-shrink-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                style={{ width: 18, height: 18, marginTop: 2 }}
              />
              <span style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.6 }}>
                I agree to the{' '}
                <Link to="/terms" target="_blank" style={{ color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={e => e.stopPropagation()}>
                  Terms of Service <ExternalLink style={{ width: 11, height: 11 }} />
                </Link>
                , including the <strong style={{ color: 'var(--fg)' }}>3-device limit</strong>.
              </span>
            </label>

            {error && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || googleLoading || !agreedToTerms} className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', fontSize: 14, boxShadow: '0 4px 24px var(--accent-glow)' }}>
              {loading ? <ThemedSpinner size="sm" /> : <UserPlus style={{ width: 16, height: 16 }} />}
              Create Account
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted2)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#ef4444', fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

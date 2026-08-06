import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, UserPlus, BookOpen, ExternalLink, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

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
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/r`,
        },
      })
      if (authError) throw authError
    } catch (err: unknown) {
      const msg = (err as { message?: string; msg?: string }).message || (err as { msg?: string }).msg || ''
      if (msg.includes('provider is not enabled') || msg.includes('validation_failed')) {
        setError('Google Sign-In is not enabled yet in your Supabase project. Enable Google in Supabase Dashboard -> Authentication -> Providers.')
      } else {
        setError(msg || 'Google sign-in failed.')
      }
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ maxWidth: 400, width: '100%', padding: '36px 32px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <UserPlus style={{ width: 28, height: 28, color: 'rgb(74,222,128)' }} />
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
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back
      </button>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ padding: 10, background: 'rgba(220,38,38,0.12)', borderRadius: 16, border: '1px solid rgba(220,38,38,0.2)' }}>
            <BookOpen style={{ width: 24, height: 24, color: '#ef4444' }} />
          </div>
          <span className="page-title" style={{ fontSize: 22 }}>manga-dl</span>
        </div>

        <div style={{ padding: '36px 32px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--surface)', backdropFilter: 'blur(24px)' }}>
          <h1 className="page-title" style={{ fontSize: 26, marginBottom: 4 }}>Create Account</h1>
          <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 28 }}>Sync your library across up to 3 devices.</p>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 0',
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--fg)',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              if (!loading && !googleLoading) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            }}
            onMouseLeave={e => {
              if (!loading && !googleLoading) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
            }}
          >
            {googleLoading ? (
              <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
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
              <label style={LABEL_STYLE}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={INPUT_STYLE} placeholder="you@example.com" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={INPUT_STYLE} placeholder="Min. 8 characters" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={INPUT_STYLE} placeholder="••••••••" />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setAgreedToTerms(p => !p)}
                style={{ width: 18, height: 18, borderRadius: 6, border: `1px solid ${agreedToTerms ? '#dc2626' : 'var(--border)'}`, background: agreedToTerms ? '#dc2626' : 'var(--surface-hover)', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {agreedToTerms && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.6 }}>
                I agree to the{' '}
                <Link to="/terms" target="_blank" style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={e => e.stopPropagation()}>
                  Terms of Service <ExternalLink style={{ width: 11, height: 11 }} />
                </Link>
                , including the <strong style={{ color: 'var(--fg)' }}>3-device limit</strong>.
              </span>
            </label>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || googleLoading || !agreedToTerms} className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', fontSize: 14, boxShadow: '0 4px 24px rgba(220,38,38,0.25)' }}>
              {loading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <UserPlus style={{ width: 16, height: 16 }} />}
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

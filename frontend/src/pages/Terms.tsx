import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollText, ArrowLeft } from 'lucide-react'

const SECTIONS = [
  { title: '1. Acceptance', body: 'By creating an account on manga-dl, you agree to these terms. If you do not agree, do not create an account. You may still use the app without an account with limited features.' },
  { title: '2. Device Limits', body: null, list: [
    'Each account may be active on a maximum of 3 devices simultaneously.',
    'If you attempt to log in on a 4th device, you must choose one device to forfeit (log out).',
    'The forfeited device will be locked from logging in for 30 days.',
    'This measure exists to prevent account sharing beyond 3 users.',
  ]},
  { title: '3. Content & Copyright', body: 'manga-dl is a reading tool. You are responsible for ensuring that any content you download or access complies with applicable copyright laws in your jurisdiction. We do not host manga content — the app connects to third-party providers.' },
  { title: '4. Data & Privacy', body: 'We store your email address, reading history, and device session data to provide the service. We do not sell your data to third parties. You can delete your account and all associated data at any time from Settings.' },
  { title: '5. Account Security', body: 'You are responsible for keeping your account credentials secure. Do not share your password. We will never ask for your password via email or chat.' },
  { title: '6. Service Availability', body: 'manga-dl is provided as-is. We do not guarantee uptime or availability. The service may change or be discontinued with reasonable notice.' },
  { title: '7. Changes to Terms', body: 'We may update these terms. Continued use of the service after notification of changes constitutes acceptance of the new terms.' },
]

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky-header border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { if (window.history.length > 1) navigate(-1); else window.close() }} className="icon-btn">
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'rgba(220,38,38,0.1)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.18)' }}>
              <ScrollText style={{ width: 16, height: 16, color: '#ef4444' }} />
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: 18 }}>Terms of Service</h1>
              <div style={{ fontSize: 11, color: 'var(--muted3)' }}>Last updated: June 2026</div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6 pt-6 pb-28 flex-1" style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
        {/* Large centered title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(2rem,8vw,4rem)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg)', lineHeight: 1 }}>
            Terms of
          </h2>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(2rem,8vw,4rem)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', lineHeight: 1 }}>
            Service
          </h2>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              style={{
                padding: '18px 20px',
                borderRadius: 18,
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--accent)',
                background: 'var(--surface)',
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)', marginBottom: 10 }}>{s.title}</h2>
              {s.body && <p style={{ fontSize: 13, color: 'var(--muted1)', lineHeight: 1.7 }}>{s.body}</p>}
              {s.list && (
                <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {s.list.map((item, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--muted1)', lineHeight: 1.6 }}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </motion.div>

        {/* Accept button */}
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <button
            onClick={() => navigate('/register')}
            className="btn-primary"
            style={{ padding: '14px 40px', fontSize: 14, fontWeight: 800 }}
          >
            I Accept These Terms
          </button>
          <p style={{ fontSize: 11, color: 'var(--muted3)', marginTop: 10 }}>
            By clicking above you agree to all sections above
          </p>
        </div>
      </div>
    </div>
  )
}

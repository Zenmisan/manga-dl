import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastVariant = 'info' | 'success' | 'error' | 'warning'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration: number
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => string
  dismiss: (id: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ToastCtx = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast requires ToastProvider')
  return ctx
}

const ICONS: Record<ToastVariant, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
}

const COLORS: Record<ToastVariant, { bg: string; border: string; icon: string; text: string }> = {
  info:    { bg: 'rgba(30,30,46,0.96)',  border: 'rgba(255,255,255,0.1)', icon: 'rgba(148,163,184,1)', text: 'var(--fg)' },
  success: { bg: 'rgba(14,46,30,0.96)',  border: 'rgba(74,222,128,0.25)', icon: 'rgb(74,222,128)',      text: 'var(--fg)' },
  error:   { bg: 'rgba(46,10,10,0.96)',  border: 'rgba(220,38,38,0.3)',   icon: '#ef4444',              text: 'var(--fg)' },
  warning: { bg: 'rgba(40,28,8,0.96)',   border: 'rgba(251,146,60,0.3)',  icon: 'rgb(251,146,60)',      text: 'var(--fg)' },
}

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: 'calc(76px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        width: 'min(calc(100vw - 32px), 400px)',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="sync">
        {toasts.map(t => {
          const c = COLORS[t.variant]
          const Icon = ICONS[t.variant]
          return (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 16,
                background: c.bg,
                border: `1px solid ${c.border}`,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                pointerEvents: 'auto',
              }}
            >
              <Icon style={{ width: 16, height: 16, color: c.icon, flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{t.message}</span>
              <button
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
                style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                  border: 'none', background: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function ConfirmDialog({
  state,
  onClose,
}: {
  state: { options: ConfirmOptions; resolve: (v: boolean) => void } | null
  onClose: (result: boolean) => void
}) {
  const opts = state?.options
  return (
    <AnimatePresence>
      {state && opts && (
        <>
          <motion.div
            key="confirm-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => onClose(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000 }}
          />
          <motion.div
            key="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10001,
              width: 'min(calc(100vw - 32px), 360px)',
              borderRadius: 24,
              background: 'rgba(14,14,22,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              padding: '24px 24px 20px',
            }}
          >
            {opts.title && (
              <p id="confirm-title" style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)', marginBottom: 8 }}>
                {opts.title}
              </p>
            )}
            <p id="confirm-body" style={{ fontSize: 13.5, color: 'var(--muted1)', lineHeight: 1.55, marginBottom: 20 }}>
              {opts.message}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => onClose(false)}
                style={{
                  padding: '9px 18px', borderRadius: 12, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {opts.cancelLabel ?? 'Cancel'}
              </button>
              <button
                autoFocus
                onClick={() => onClose(true)}
                className={cn('focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black')}
                style={{
                  padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 800,
                  background: opts.danger ? 'rgba(220,38,38,0.9)' : 'var(--accent)',
                  color: '#fff',
                }}
              >
                {opts.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions
    resolve: (v: boolean) => void
  } | null>(null)

  const show = useCallback((message: string, variant: ToastVariant = 'info', duration = 4000): string => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev.slice(-4), { id, message, variant, duration }])
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => setConfirmState({ options, resolve }))
  }, [])

  const handleConfirmClose = (result: boolean) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  return (
    <ToastCtx.Provider value={{ show, dismiss, confirm }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog state={confirmState} onClose={handleConfirmClose} />
    </ToastCtx.Provider>
  )
}

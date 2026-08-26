import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Layers, AlertCircle, Check, CheckSquare } from 'lucide-react'
import { toggleSource, enableAllSources } from '../../lib/sourceManager'
import { cn } from '../../lib/utils'

interface SourceItem {
  id: string
  name: string
}

interface SourceToggleModalProps {
  isOpen: boolean
  onClose: () => void
  availableSources: SourceItem[]
  enabledSources: string[]
  onSourcesChange: (enabled: string[]) => void
}

export function SourceToggleModal({
  isOpen,
  onClose,
  availableSources,
  enabledSources,
  onSourcesChange,
}: SourceToggleModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleToggle = (sourceId: string) => {
    setErrorMessage(null)
    const allIds = availableSources.map(s => s.id)
    const result = toggleSource(sourceId, allIds)

    if (!result.success && result.message) {
      setErrorMessage(result.message)
      setTimeout(() => setErrorMessage(null), 4000)
    } else {
      onSourcesChange(result.enabled)
    }
  }

  const handleEnableAll = () => {
    setErrorMessage(null)
    const allIds = availableSources.map(s => s.id)
    const updated = enableAllSources(allIds)
    onSourcesChange(updated)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--fg)]">Manage Search Sources</h3>
                  <p className="text-[11px] text-[var(--muted2)]">
                    {enabledSources.length} of {availableSources.length} sources active
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted2)] hover:text-[var(--fg)] hover:bg-[var(--surface2)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error / Validation Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 py-2.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center gap-2 text-amber-400 text-xs font-semibold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Source Toggles List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {availableSources.map(source => {
                const isEnabled = enabledSources.includes(source.id)
                return (
                  <button
                    key={source.id}
                    onClick={() => handleToggle(source.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-left",
                      isEnabled
                        ? "bg-[var(--surface2)]/70 border-[var(--accent)]/30 hover:border-[var(--accent)]/50"
                        : "bg-[var(--surface2)]/20 border-[var(--border)] opacity-60 hover:opacity-80"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                          isEnabled
                            ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm"
                            : "border-[var(--muted3)] bg-transparent"
                        )}
                      >
                        {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-[var(--fg)]">{source.name}</div>
                        <div className="text-[10px] text-[var(--muted3)] uppercase tracking-wider font-semibold">
                          {source.id}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        isEnabled
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-neutral-500/15 border-neutral-500/30 text-neutral-400"
                      )}
                    >
                      {isEnabled ? 'Active' : 'Disabled'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface2)]/30">
              <button
                onClick={handleEnableAll}
                className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Enable All</span>
              </button>

              <button
                onClick={onClose}
                className="btn-primary py-2 px-5 text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

import React from 'react'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ThemedSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  style?: React.CSSProperties
  glow?: boolean
}

export function ThemedSpinner({
  size = 'md',
  className = '',
  style = {},
  glow = true,
}: ThemedSpinnerProps) {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  }

  return (
    <Loader2
      className={`${sizeMap[size]} animate-spin text-[var(--accent)] ${glow ? 'drop-shadow-[0_0_10px_var(--accent-glow)]' : ''} ${className}`}
      style={style}
    />
  )
}

interface ThemedLoadingScreenProps {
  message?: string
  subMessage?: string
  fullScreen?: boolean
  className?: string
}

export function ThemedLoadingScreen({
  message = 'Loading...',
  subMessage,
  fullScreen = true,
  className = '',
}: ThemedLoadingScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 bg-[var(--bg)] text-[var(--fg)] transition-colors ${
        fullScreen ? 'min-h-[85vh] w-full' : 'py-16 w-full'
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing ambient accent ring */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.75, 0.35] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-full border-2 border-[var(--accent)]/30 absolute inset-0 -m-1"
          style={{ background: 'radial-gradient(circle, var(--accent-glow, rgba(220,38,38,0.2)) 0%, transparent 70%)' }}
        />
        {/* Glowing Themed Spinner */}
        <ThemedSpinner size="xl" />
      </div>

      <div className="text-center space-y-1 z-10">
        <p className="text-[var(--fg)] font-black text-xs md:text-sm uppercase tracking-[0.2em] animate-pulse">
          {message}
        </p>
        {subMessage && (
          <p className="text-[var(--muted2)] text-xs max-w-xs mx-auto">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  )
}

interface ThemedSkeletonGridProps {
  count?: number
  columns?: string
  aspectRatio?: string
  className?: string
}

export function ThemedSkeletonGrid({
  count = 12,
  columns = 'repeat(auto-fill, minmax(140px, 1fr))',
  aspectRatio = '2/3',
  className = '',
}: ThemedSkeletonGridProps) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: columns, gap: 14 }}
      className={`w-full ${className}`}
    >
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.02 }}
          style={{
            aspectRatio,
            background: 'var(--surface)',
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
          className="relative overflow-hidden group shadow-sm"
        >
          {/* Subtle animated shimmer matching theme accent */}
          <div
            className="absolute inset-0 animate-pulse opacity-40"
            style={{
              background: 'linear-gradient(135deg, transparent 20%, var(--surface-hover) 50%, transparent 80%)',
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

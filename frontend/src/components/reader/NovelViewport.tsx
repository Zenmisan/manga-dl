import { useEffect, useRef } from 'react'

export interface NovelSettings {
  theme: 'dark' | 'sepia' | 'white'
  fontSize: number
  fontFamily: 'serif' | 'sans' | 'mono'
  lineHeight: number
  maxWidth: number
}

export const DEFAULT_NOVEL_SETTINGS: NovelSettings = {
  theme: 'dark',
  fontSize: 17,
  fontFamily: 'serif',
  lineHeight: 1.8,
  maxWidth: 720,
}

const THEMES = {
  dark:  { bg: '#13111a', text: 'rgba(255,255,255,0.85)' },
  sepia: { bg: '#f4ecd8', text: '#3d2b1f' },
  white: { bg: '#ffffff', text: '#111111' },
}

const FONTS = {
  serif: 'Georgia, "Times New Roman", serif',
  sans:  'system-ui, -apple-system, sans-serif',
  mono:  '"JetBrains Mono", "Fira Mono", monospace',
}

function clientSanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

interface Props {
  content: string
  settings: NovelSettings
  onProgress: (pct: number) => void
}

export function NovelViewport({ content, settings, onProgress }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { bg, text } = THEMES[settings.theme]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = () => {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      onProgress(Math.min(100, Math.round((scrolled / total) * 100)))
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [onProgress])

  return (
    <div
      ref={ref}
      className="novel-viewport mx-auto px-6 py-10"
      style={{
        background: bg,
        color: text,
        fontFamily: FONTS[settings.fontFamily],
        fontSize: settings.fontSize + 'px',
        lineHeight: settings.lineHeight,
        maxWidth: settings.maxWidth + 'px',
      }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: clientSanitize(content) }}
    />
  )
}

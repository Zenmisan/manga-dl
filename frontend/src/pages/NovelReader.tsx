import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Settings2, List, X, BookOpen } from 'lucide-react'
import { ExtensionManager } from '../lib/extensions'
import { NovelViewport, DEFAULT_NOVEL_SETTINGS } from '../components/reader/NovelViewport'
import type { NovelSettings } from '../components/reader/NovelViewport'
import { buildNovelReadUrl } from '../lib/novelUrl'
import { usePageTitle } from '../lib/usePageTitle'
import { cn } from '../lib/utils'

const SETTINGS_KEY = 'manga-novel-settings'
const POS_KEY = (provider: string, novelId: string, chapterId: string) =>
  `novel-pos-${provider}-${novelId}-${chapterId}`

interface ChapterStub {
  id: string
  title: string
  number: number
}

export default function NovelReader() {
  const { provider = '', novelId = '', chapterId = '' } = useParams<{
    provider: string
    novelId: string
    chapterId: string
  }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const novelTitle = searchParams.get('title') || novelId
  const chapterTitle = searchParams.get('ch') || ''

  usePageTitle(chapterTitle ? `${chapterTitle} — ${novelTitle}` : novelTitle)

  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chapters, setChapters] = useState<ChapterStub[]>([])
  const [progress, setProgress] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showChapters, setShowChapters] = useState(false)

  const [settings, setSettings] = useState<NovelSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      return saved ? { ...DEFAULT_NOVEL_SETTINGS, ...JSON.parse(saved) } : DEFAULT_NOVEL_SETTINGS
    } catch {
      return DEFAULT_NOVEL_SETTINGS
    }
  })

  const decodedNovelId = decodeURIComponent(novelId)
  const decodedChapterId = decodeURIComponent(chapterId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setContent(null)

    async function load() {
      const mgr = ExtensionManager.getInstance()
      await mgr.init()
      const ext = mgr.extensions.get(provider)
      if (!ext || !ext.getChapterText) {
        if (!cancelled) setError(`Novel source "${provider}" not found or not a novel provider.`)
        return
      }

      try {
        const result = await ext.getChapterText(decodedChapterId)
        if (!cancelled) setContent(result.content)

        const posKey = POS_KEY(provider, decodedNovelId, decodedChapterId)
        const savedPos = localStorage.getItem(posKey)
        if (savedPos) {
          requestAnimationFrame(() => window.scrollTo(0, parseInt(savedPos, 10)))
        }

        if (chapters.length === 0) {
          const detail = await ext.getMangaDetail(decodedNovelId) as { chapters?: ChapterStub[] }
          if (!cancelled && detail?.chapters) setChapters(detail.chapters)
        }
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [provider, decodedNovelId, decodedChapterId])

  useEffect(() => {
    const handler = () => {
      const posKey = POS_KEY(provider, decodedNovelId, decodedChapterId)
      localStorage.setItem(posKey, String(Math.round(window.scrollY)))
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [provider, decodedNovelId, decodedChapterId])

  const saveSettings = useCallback((patch: Partial<NovelSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const currentIndex = chapters.findIndex(ch => ch.id === decodedChapterId)
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  const goChapter = (ch: ChapterStub) => {
    window.scrollTo(0, 0)
    navigate(buildNovelReadUrl(provider, decodedNovelId, ch.id, novelTitle, ch.title))
  }

  return (
    <div className="min-h-screen" style={{ background: settings.theme === 'dark' ? '#13111a' : settings.theme === 'sepia' ? '#f4ecd8' : '#ffffff' }}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-zinc-800">
        <div className="h-full bg-red-500 transition-all duration-150" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <header className="fixed top-0.5 left-0 right-0 z-40 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm border-b border-white/5">
        <button onClick={() => navigate(`/manga/${provider}/${decodedNovelId}`)} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/50 truncate">{novelTitle}</p>
          <p className="text-sm text-white/80 font-medium truncate">{chapterTitle || decodedChapterId}</p>
        </div>
        <button onClick={() => setShowChapters(true)} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white">
          <List size={18} />
        </button>
        <button onClick={() => setShowSettings(true)} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white">
          <Settings2 size={18} />
        </button>
      </header>

      {/* Content */}
      <div className="pt-12 pb-24">
        {loading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="max-w-xl mx-auto p-8 text-center">
            <p className="text-red-400 font-medium mb-2">Failed to load chapter</p>
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
        )}
        {content && !loading && (
          <NovelViewport content={content} settings={settings} onProgress={setProgress} />
        )}
      </div>

      {/* Prev / Next footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm border-t border-white/5">
        <button
          onClick={() => prevChapter && goChapter(prevChapter)}
          disabled={!prevChapter}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded text-sm', prevChapter ? 'text-white/80 hover:bg-white/10' : 'text-white/20 cursor-not-allowed')}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          onClick={() => setShowChapters(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white/50 hover:bg-white/10"
        >
          <BookOpen size={14} />
          {currentIndex >= 0 ? `Ch ${currentIndex + 1} / ${chapters.length}` : '—'}
        </button>
        <button
          onClick={() => nextChapter && goChapter(nextChapter)}
          disabled={!nextChapter}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded text-sm', nextChapter ? 'text-white/80 hover:bg-white/10' : 'text-white/20 cursor-not-allowed')}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Settings sheet */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-lg bg-zinc-900 rounded-t-2xl p-5 pb-8 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Reading Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>

            {/* Theme */}
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide mb-2 block">Theme</label>
              <div className="flex gap-2">
                {(['dark', 'sepia', 'white'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => saveSettings({ theme: t })}
                    className={cn('flex-1 py-2 rounded-lg text-sm capitalize border', settings.theme === t ? 'border-red-500 text-red-400' : 'border-zinc-700 text-zinc-300')}
                    style={{ background: t === 'dark' ? '#13111a' : t === 'sepia' ? '#f4ecd8' : '#fff', color: t === 'white' ? '#111' : t === 'sepia' ? '#3d2b1f' : undefined }}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide mb-2 block">Font</label>
              <div className="flex gap-2">
                {(['serif', 'sans', 'mono'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => saveSettings({ fontFamily: f })}
                    className={cn('flex-1 py-2 rounded-lg text-sm capitalize border', settings.fontFamily === f ? 'border-red-500 text-red-400' : 'border-zinc-700 text-zinc-300')}
                  >{f}</button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Font Size — {settings.fontSize}px</label>
              <input type="range" min={14} max={24} step={1} value={settings.fontSize}
                onChange={e => saveSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-red-500" />
            </div>

            {/* Line height */}
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Line Height — {settings.lineHeight.toFixed(1)}</label>
              <input type="range" min={1.4} max={2.2} step={0.1} value={settings.lineHeight}
                onChange={e => saveSettings({ lineHeight: Number(e.target.value) })}
                className="w-full accent-red-500" />
            </div>

            {/* Max width */}
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Width — {settings.maxWidth}px</label>
              <input type="range" min={480} max={860} step={20} value={settings.maxWidth}
                onChange={e => saveSettings({ maxWidth: Number(e.target.value) })}
                className="w-full accent-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Chapter list sheet */}
      {showChapters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowChapters(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-lg bg-zinc-900 rounded-t-2xl flex flex-col"
            style={{ maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Chapters</h3>
              <button onClick={() => setShowChapters(false)} className="p-1 text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => { setShowChapters(false); goChapter(ch) }}
                  className={cn(
                    'w-full text-left px-5 py-3 border-b border-zinc-800/50 hover:bg-zinc-800 transition-colors',
                    ch.id === decodedChapterId && 'bg-zinc-800 border-l-4 border-l-red-500'
                  )}
                >
                  <p className="text-sm text-white/80 truncate">{ch.title || `Chapter ${i + 1}`}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Chapter {ch.number}</p>
                </button>
              ))}
              {chapters.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-8">Loading chapters…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

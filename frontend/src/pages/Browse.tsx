import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { ExtensionManager } from '../lib/extensions'
import { buildSmartMangaUrl } from '../lib/smartUrl'
import { usePageTitle } from '../lib/usePageTitle'

interface MangaResult {
  id: string
  title: string
  cover_url: string | null
  provider: string
  url: string
  status: string | null
}

type DiscoveryResponse = Record<string, { popular: MangaResult[]; latest: MangaResult[] }>

function BrowseCard({ r, idx, navigate }: { r: MangaResult; idx: number; navigate: ReturnType<typeof useNavigate> }) {
  const [coverError, setCoverError] = useState(false)
  const apiBase = api.defaults.baseURL || ''
  const apiKey = localStorage.getItem('manga-api-key') || ''
  const coverSrc = r.cover_url ? `${apiBase}/manga/image-proxy?url=${encodeURIComponent(r.cover_url)}&api_key=${apiKey}` : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate(buildSmartMangaUrl(r.provider, r.id, r.title))}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ height: 155, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', position: 'relative' }}>
        {coverSrc && !coverError ? (
          <img
            src={coverSrc}
            alt={r.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setCoverError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen style={{ width: 24, height: 24, color: 'var(--muted3)' }} />
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
          padding: '2px 5px', borderRadius: 5,
          fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {r.provider}
        </div>
      </div>
      <div style={{
        marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {r.title}
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div>
      <motion.div animate={{ opacity: [0.4, 0.65, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ height: 155, borderRadius: 10, background: 'var(--surface)' }} />
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        style={{ marginTop: 6, height: 12, borderRadius: 4, background: 'var(--surface)', width: '85%' }} />
      <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        style={{ marginTop: 4, height: 10, borderRadius: 4, background: 'var(--surface)', width: '60%' }} />
    </div>
  )
}

export default function BrowsePage() {
  const { category } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const isPopular = category !== 'latest'
  const pageTitle = isPopular ? 'Popular Now' : 'Latest Updates'
  usePageTitle(pageTitle)

  const [items, setItems] = useState<MangaResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const manager = ExtensionManager.getInstance()
      if (manager.extensions.size === 0) await manager.init()
      const providerIds = Array.from(manager.extensions.keys()).join(',')

      const data: DiscoveryResponse = await api
        .get(`/sources/discovery?providers=${providerIds}`)
        .then(r => r.data as DiscoveryResponse)
        .catch(() => ({} as DiscoveryResponse))

      const key = isPopular ? 'popular' : 'latest'
      const cols = Object.entries(data)
        .filter(([id]) => id !== 'mangadex')
        .map(([, v]) => v[key] ?? [])
      const maxLen = Math.max(0, ...cols.map(c => c.length))
      const all: MangaResult[] = []
      for (let i = 0; i < maxLen; i++) {
        for (const col of cols) { if (i < col.length) all.push(col[i]) }
      }

      setItems(all)
      setLoading(false)
    }
    run()
  }, [isPopular])

  const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16 } as const

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-6 pt-5 pb-28 flex-1">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--muted2)', display: 'flex', borderRadius: 10 }}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--fg)', lineHeight: 1.1, margin: 0 }}>{pageTitle}</h1>
        </div>

        {loading ? (
          <div style={GRID}>
            {Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length > 0 ? (
          <div style={GRID}>
            {items.map((r, i) => (
              <BrowseCard key={`${r.provider}:${r.id}`} r={r} idx={i} navigate={navigate} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--muted2)', fontSize: 14 }}>
            No results yet — sources may still be warming up.
          </div>
        )}
      </div>
    </div>
  )
}

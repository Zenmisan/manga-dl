import { useEffect } from 'react'

export const DEFAULT_TITLE = 'manga-dl | Read & Download Manga from 50+ Sources, Free'
export const DEFAULT_DESCRIPTION =
  'Read and download manga, manhwa, webtoons, and light novels across 50+ sources with a fast, distraction-free reader.'
export const DEFAULT_IMAGE = 'https://manga-dl.me/pwa-512x512.png'

export interface PageMeta {
  description?: string | null
  image?: string | null
  url?: string | null
  type?: 'website' | 'article' | 'book'
  noindex?: boolean
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined' || !document.head) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonicalLink(href: string) {
  if (typeof document === 'undefined' || !document.head) return
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function applyPageMetadata(title: string | null | undefined, meta?: PageMeta) {
  if (typeof document === 'undefined') return

  const fullTitle = title ? `${title} | manga-dl` : DEFAULT_TITLE
  const description = (meta?.description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 240)
  const image = meta?.image || DEFAULT_IMAGE
  const url =
    meta?.url ||
    (typeof window !== 'undefined' && window.location ? window.location.href : 'https://manga-dl.me/')
  const ogType = meta?.type || (title ? 'article' : 'website')

  document.title = fullTitle

  upsertMetaTag('name', 'description', description)
  upsertMetaTag('property', 'og:title', fullTitle)
  upsertMetaTag('property', 'og:description', description)
  upsertMetaTag('property', 'og:image', image)
  upsertMetaTag('property', 'og:url', url)
  upsertMetaTag('property', 'og:type', ogType)
  upsertMetaTag('name', 'twitter:card', 'summary_large_image')
  upsertMetaTag('name', 'twitter:title', fullTitle)
  upsertMetaTag('name', 'twitter:description', description)
  upsertMetaTag('name', 'twitter:image', image)
  if (meta?.noindex) {
    upsertMetaTag('name', 'robots', 'noindex, nofollow')
  } else {
    upsertMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
  }
  upsertCanonicalLink(url)
}

export function usePageTitle(title: string | null | undefined, meta?: PageMeta) {
  const description = meta?.description ?? null
  const image = meta?.image ?? null
  const url = meta?.url ?? null
  const type = meta?.type
  const noindex = meta?.noindex ?? false

  useEffect(() => {
    applyPageMetadata(title, { description, image, url, type, noindex })
    return () => {
      applyPageMetadata(null)
    }
  }, [title, description, image, url, type, noindex])
}

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Build a cover/page image proxy URL.
// Prefers the Cloudflare Worker (VITE_CF_IMAGE_PROXY) which needs no API key.
// Falls back to the backend proxy; apiKey goes in the URL because <img src> can't carry headers.
export function buildImageProxyUrl(rawUrl: string, apiBase: string, apiKey: string): string {
  const cfProxy = import.meta.env.VITE_CF_IMAGE_PROXY
  if (cfProxy) return `${cfProxy}?url=${encodeURIComponent(rawUrl)}`
  return `${apiBase}/manga/image-proxy?url=${encodeURIComponent(rawUrl)}&api_key=${apiKey}`
}

const ALLOWED_SCHEMES = ['http:', 'https:']
const PRIVATE_PREFIXES = ['localhost', '127.', '10.', '192.168.', '169.254.', '::1', '[fc', '[fe8']

function isPrivate(hostname) {
  const h = hostname.toLowerCase()
  return PRIVATE_PREFIXES.some(p => h === p || h.startsWith(p))
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = url.searchParams.get('url')
    if (!target) return new Response('missing url', { status: 400 })

    let parsed
    try {
      parsed = new URL(target)
    } catch {
      return new Response('invalid url', { status: 400 })
    }

    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      return new Response('forbidden scheme', { status: 403 })
    }
    if (isPrivate(parsed.hostname)) {
      return new Response('forbidden host', { status: 403 })
    }

    const resp = await fetch(target, {
      headers: {
        'Referer': `${parsed.protocol}//${parsed.hostname}/`,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!resp.ok) return new Response('upstream error', { status: resp.status })

    return new Response(resp.body, {
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}

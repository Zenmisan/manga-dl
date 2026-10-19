// Cloudflare Worker — Hybrid Edge Router & Image Proxy for Comics (Manga-DL)
//
// Capabilities:
// 1. /_img?url=<encoded> and /?url=<encoded>: High-performance image proxy with SSRF protection,
//    Referer/User-Agent spoofing, CORS headers, and aggressive edge caching.
// 2. /* (Crawler / Social Bot User-Agent or ?__bot=1): Edge-rendered OpenGraph, Twitter Card,
//    and Schema.org HTML with 24h Cloudflare Edge Cache, Backend Discovery API lookup, and
//    AniList GraphQL fallback.
// 3. /* (Human Browser / Static Assets): Zero-overhead pass-through to the PWA origin.

export const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

// Block private/internal IP ranges to prevent SSRF
export const PRIVATE_PREFIXES = [
  '10.', '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
  '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
  '172.30.', '172.31.', '192.168.', '127.', '0.', '169.254.',
  'localhost', '[::1]', '[fc', '[fd', '[fe80',
];

export const CRAWLER_PATTERNS = [
  'discordbot',
  'twitterbot',
  'whatsapp',
  'telegrambot',
  'facebookexternalhit',
  'facebot',
  'slackbot',
  'linkedinbot',
  'pinterest',
  'redditbot',
  'applebot',
  'googlebot',
  'bingbot',
  'yandex',
  'duckduckbot',
  'baiduspider',
  'embedly',
  'quora link preview',
  'vkshare',
  'skypeuripreview',
];

export const CODE_TO_EXTENSION = {
  as: 'asurascans',
  tcb: 'tcbscans',
  mp: 'mangapill',
  md: 'mangadex',
  wtr: 'wtrlab',
  mb: 'mangabuddy',
  mf: 'mangafire',
  wr: 'weebrook',
  cp: 'comick',
  fl: 'flamescans',
  ls: 'luminousscans',
  rs: 'realmscans',
  nv: 'novelfire',
  rb: 'royalroad',
};

const STATIC_ASSET_EXT_RE = /\.(?:js|mjs|css|map|json|webmanifest|ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|otf|eot|txt|xml|wasm)$/i;

const DEFAULT_META = {
  siteName: 'Comics',
  title: 'Comics | Manga, Manhwa & Webnovel Reader',
  description: 'Read and track manga, manhwa, webtoons, and light novels across multiple sources with a fast, distraction-free reader.',
  image: 'https://manga-dl.web.app/pwa-512x512.png',
  type: 'website',
};

export function isAllowedTargetUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (!host) return false;
    if (PRIVATE_PREFIXES.some((prefix) => host.startsWith(prefix) || host === prefix)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isStaticAssetPath(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith('/assets/') || pathname.startsWith('/icons/')) return true;
  return STATIC_ASSET_EXT_RE.test(pathname);
}

export function isCrawler(userAgent = '', requestUrl = '') {
  try {
    if (requestUrl) {
      const parsed = new URL(requestUrl);
      if (parsed.searchParams.get('__bot') === '1') return true;
      if (parsed.searchParams.get('__bot') === '0') return false;
    }
  } catch {
    // ignore URL parse error
  }
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return false;
  return CRAWLER_PATTERNS.some((pattern) => ua.includes(pattern));
}

export function humanizeSlug(slug = '') {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function parseSmartSlug(smartSlug = '') {
  const clean = decodeURIComponent(String(smartSlug || '').trim());
  const lastDash = clean.lastIndexOf('-');
  if (lastDash > 0) {
    const code = clean.slice(lastDash + 1).toLowerCase();
    const titleSlug = clean.slice(0, lastDash);
    const provider = CODE_TO_EXTENSION[code] || null;
    if (provider) {
      return {
        provider,
        code,
        titleSlug,
        title: humanizeSlug(titleSlug),
      };
    }
  }
  return {
    provider: null,
    code: null,
    titleSlug: clean,
    title: humanizeSlug(clean),
  };
}

export function decodeCtx(ctxParam) {
  if (!ctxParam) return null;
  try {
    const normalized = String(ctxParam).replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const raw = new TextDecoder().decode(bytes);
    const parts = raw.split(':');
    if (parts.length < 3) return null;
    return {
      provider: parts[0] || null,
      mangaId: parts[1] || null,
      chapterId: parts[2] || null,
      mangaTitle: parts[3] || null,
      chapterTitle: parts.slice(4).join(':') || null,
    };
  } catch {
    return null;
  }
}

export function parseRoute(requestUrl) {
  const url = typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;
  const segments = url.pathname.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  // Short reader link: /r?d=<ctx>
  if (segments.length === 1 && segments[0] === 'r') {
    const ctx = decodeCtx(url.searchParams.get('d'));
    if (ctx) {
      return {
        kind: 'reader',
        mediaType: 'manga',
        provider: ctx.provider,
        seriesId: ctx.mangaId,
        chapterId: ctx.chapterId,
        title: ctx.mangaTitle || humanizeSlug(ctx.mangaId || ''),
        chapterTitle: ctx.chapterTitle || null,
        slug: null,
      };
    }
  }

  // Novel reader: /read/novel/:provider/:novelId/:chapterId
  if (segments.length >= 5 && segments[0] === 'read' && segments[1] === 'novel') {
    const provider = segments[2];
    const novelId = segments[3];
    const chapterId = segments.slice(4).join('/');
    const queryTitle = url.searchParams.get('title');
    const queryChapter = url.searchParams.get('ch');
    return {
      kind: 'reader',
      mediaType: 'novel',
      provider,
      seriesId: novelId,
      chapterId,
      title: queryTitle || humanizeSlug(novelId),
      chapterTitle: queryChapter || humanizeSlug(chapterId),
      slug: novelId,
    };
  }

  // Manga reader: /read/:smartSlug/:chSlug or /read/:provider/:mangaId/:chapterId
  if (segments.length === 3 && segments[0] === 'read') {
    const ctx = decodeCtx(url.searchParams.get('ctx'));
    const parsedSlug = parseSmartSlug(segments[1]);
    const chRaw = segments[2];
    const chNum = chRaw.startsWith('ch-') ? chRaw.slice(3) : chRaw;
    return {
      kind: 'reader',
      mediaType: 'manga',
      provider: (ctx && ctx.provider) || parsedSlug.provider,
      seriesId: (ctx && ctx.mangaId) || parsedSlug.titleSlug,
      chapterId: (ctx && ctx.chapterId) || chRaw,
      title: (ctx && ctx.mangaTitle) || parsedSlug.title,
      chapterTitle: (ctx && ctx.chapterTitle) || (chNum ? `Chapter ${chNum}` : null),
      slug: parsedSlug.titleSlug,
    };
  }

  if (segments.length >= 4 && segments[0] === 'read') {
    const provider = segments[1];
    const mangaId = segments[2];
    const chapterId = segments.slice(3).join('/');
    const queryTitle = url.searchParams.get('title');
    const queryChapter = url.searchParams.get('ch');
    return {
      kind: 'reader',
      mediaType: 'manga',
      provider,
      seriesId: mangaId,
      chapterId,
      title: queryTitle || humanizeSlug(mangaId),
      chapterTitle: queryChapter || humanizeSlug(chapterId),
      slug: mangaId,
    };
  }

  // Manga detail: /manga/:smartSlug
  if (segments.length === 2 && segments[0] === 'manga') {
    const parsedSlug = parseSmartSlug(segments[1]);
    return {
      kind: 'series',
      mediaType: 'manga',
      provider: parsedSlug.provider,
      seriesId: parsedSlug.titleSlug,
      chapterId: null,
      title: parsedSlug.title,
      chapterTitle: null,
      slug: parsedSlug.titleSlug,
    };
  }

  // Manga detail legacy: /manga/:provider/:mangaId
  if (segments.length >= 3 && segments[0] === 'manga') {
    const provider = segments[1];
    const mangaId = segments.slice(2).join('/');
    return {
      kind: 'series',
      mediaType: 'manga',
      provider,
      seriesId: mangaId,
      chapterId: null,
      title: humanizeSlug(mangaId),
      chapterTitle: null,
      slug: mangaId,
    };
  }

  // Novel detail: /novel/:provider/:novelId
  if (segments.length >= 3 && segments[0] === 'novel') {
    const provider = segments[1];
    const novelId = segments.slice(2).join('/');
    return {
      kind: 'series',
      mediaType: 'novel',
      provider,
      seriesId: novelId,
      chapterId: null,
      title: humanizeSlug(novelId),
      chapterTitle: null,
      slug: novelId,
    };
  }

  return {
    kind: 'home',
    mediaType: 'website',
    provider: null,
    seriesId: null,
    chapterId: null,
    title: null,
    chapterTitle: null,
    slug: null,
  };
}

export function escapeHtml(str = '') {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripHtml(str = '') {
  return String(str || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateText(str = '', maxLength = 220) {
  const clean = stripHtml(str);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildProxiedImageUrl(workerOrigin, rawCoverUrl) {
  if (!rawCoverUrl) return DEFAULT_META.image;
  if (!isAllowedTargetUrl(rawCoverUrl)) return DEFAULT_META.image;
  try {
    const origin = String(workerOrigin || 'https://manga-dl.web.app').replace(/\/$/, '');
    // AniList CDN and first-party images don't require Referer spoofing, but proxying via /_img
    // guarantees hotlink protection bypass for all scraper sources.
    if (rawCoverUrl.startsWith(origin)) return rawCoverUrl;
    return `${origin}/_img?url=${encodeURIComponent(rawCoverUrl)}`;
  } catch {
    return DEFAULT_META.image;
  }
}

export function renderOpenGraphHtml(meta) {
  const siteName = escapeHtml(meta.siteName || DEFAULT_META.siteName);
  const title = escapeHtml(meta.title || DEFAULT_META.title);
  const description = escapeHtml(truncateText(meta.description || DEFAULT_META.description, 240));
  const image = escapeHtml(meta.image || DEFAULT_META.image);
  const canonicalUrl = escapeHtml(meta.url || 'https://manga-dl.web.app/');
  const ogType = escapeHtml(meta.type || 'website');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': meta.mediaType === 'novel' ? 'Book' : meta.kind === 'series' || meta.kind === 'reader' ? 'ComicSeries' : 'WebSite',
    name: meta.rawTitle || meta.title || DEFAULT_META.title,
    description: truncateText(meta.description || DEFAULT_META.description, 240),
    image: meta.image || DEFAULT_META.image,
    url: meta.url || 'https://manga-dl.web.app/',
    ...(meta.author ? { author: { '@type': 'Person', name: meta.author } } : {}),
    ...(Array.isArray(meta.genres) && meta.genres.length > 0 ? { genre: meta.genres.slice(0, 6) } : {}),
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- OpenGraph -->
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${canonicalUrl}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />

  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${description}</p>
    <p><a href="${canonicalUrl}">Open in ${siteName}</a></p>
  </main>
</body>
</html>`;
}

async function fetchBackendMetadata(route, env) {
  const backendBase = String((env && env.BACKEND_API_URL) || '').replace(/\/$/, '');
  if (!backendBase) return null;

  try {
    const params = new URLSearchParams();
    if (route.provider) params.set('provider', route.provider);
    if (route.seriesId) params.set('manga_id', route.seriesId);
    if (route.slug) params.set('slug', route.slug);
    if (route.title) params.set('title', route.title);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const resp = await fetch(`${backendBase}/api/discovery/metadata?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data || (!data.title && !data.cover_url)) return null;
      return {
        title: data.title || null,
        description: data.description || data.synopsis || null,
        coverUrl: data.cover_url || null,
        author: data.author || null,
        status: data.status || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

async function fetchAniListMetadata(searchTitle) {
  if (!searchTitle) return null;
  const query = `
    query ($search: String) {
      Media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
        title {
          english
          romaji
          native
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
        }
        genres
        status
      }
    }
  `;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const resp = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { search: searchTitle },
        }),
        signal: controller.signal,
      });
      if (!resp.ok) return null;
      const payload = await resp.json();
      const media = payload && payload.data && payload.data.Media;
      if (!media) return null;
      const resolvedTitle =
        (media.title && (media.title.english || media.title.romaji || media.title.native)) ||
        searchTitle;
      const coverUrl =
        (media.coverImage && (media.coverImage.extraLarge || media.coverImage.large)) || null;
      return {
        title: resolvedTitle,
        description: media.description ? stripHtml(media.description) : null,
        coverUrl,
        author: null,
        status: media.status || null,
        genres: Array.isArray(media.genres) ? media.genres : [],
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

export async function resolveRouteMetadata(route, requestUrl, env) {
  const url = typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;
  const cleanUrl = new URL(url.toString());
  cleanUrl.searchParams.delete('__bot');

  if (route.kind === 'home') {
    return {
      ...DEFAULT_META,
      kind: 'home',
      mediaType: 'website',
      url: cleanUrl.toString(),
    };
  }

  // 1. Try Backend Discovery Metadata API first
  let resolved = await fetchBackendMetadata(route, env);

  // 2. Fallback to AniList GraphQL search by title
  if (!resolved || (!resolved.coverUrl && !resolved.description)) {
    const anilist = await fetchAniListMetadata(route.title || humanizeSlug(route.seriesId || ''));
    if (anilist) {
      resolved = {
        title: (resolved && resolved.title) || anilist.title,
        description: (resolved && resolved.description) || anilist.description,
        coverUrl: (resolved && resolved.coverUrl) || anilist.coverUrl,
        author: (resolved && resolved.author) || anilist.author,
        status: (resolved && resolved.status) || anilist.status,
        genres:
          resolved && Array.isArray(resolved.genres) && resolved.genres.length > 0
            ? resolved.genres
            : anilist.genres,
      };
    }
  }

  const seriesTitle = (resolved && resolved.title) || route.title || 'Manga Series';
  const isReader = route.kind === 'reader';
  const chapterLabel = route.chapterTitle || (route.chapterId ? `Chapter ${route.chapterId}` : null);
  const providerLabel = route.provider ? humanizeSlug(route.provider) : null;

  const displayTitle = isReader && chapterLabel
    ? `${seriesTitle} | ${chapterLabel} | Comics`
    : `${seriesTitle} | Comics`;

  let description = resolved && resolved.description ? truncateText(resolved.description, 220) : '';
  if (!description) {
    if (isReader && chapterLabel) {
      description = `Read ${seriesTitle} ${chapterLabel} online${providerLabel ? ` on ${providerLabel}` : ''} in high quality with Comics.`;
    } else {
      description = `Read ${seriesTitle} online${providerLabel ? ` (${providerLabel})` : ''} — chapters, synopsis, and progress tracking on Comics.`;
    }
  } else if (isReader && chapterLabel) {
    description = `Reading ${chapterLabel} • ${description}`;
  }

  const image = resolved && resolved.coverUrl
    ? buildProxiedImageUrl(url.origin, resolved.coverUrl)
    : DEFAULT_META.image;

  return {
    siteName: DEFAULT_META.siteName,
    kind: route.kind,
    mediaType: route.mediaType,
    rawTitle: seriesTitle,
    title: displayTitle,
    description,
    image,
    url: cleanUrl.toString(),
    type: route.mediaType === 'novel' ? 'book' : 'article',
    author: (resolved && resolved.author) || null,
    genres: (resolved && resolved.genres) || [],
  };
}

export async function handleImageProxy(request, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  if (!isAllowedTargetUrl(targetUrl)) {
    return new Response('Forbidden target URL', { status: 403 });
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Referer: `${parsed.origin}/`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=604800, immutable');
    headers.delete('content-security-policy');
    headers.delete('x-frame-options');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (err) {
    return new Response(`Proxy error: ${err && err.message ? err.message : 'unknown'}`, {
      status: 502,
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Image Proxy Endpoint (/_img?url=... or legacy /?url=...)
    if (url.pathname === '/_img' || (url.pathname === '/' && url.searchParams.has('url'))) {
      return handleImageProxy(request, url);
    }

    // 2. Crawler / Bot OpenGraph Edge Responder
    const userAgent = request.headers.get('User-Agent') || '';
    if (
      request.method === 'GET' &&
      !isStaticAssetPath(url.pathname) &&
      isCrawler(userAgent, url.toString())
    ) {
      const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
      const cacheKeyUrl = new URL(url.toString());
      cacheKeyUrl.searchParams.set('__edge_og', 'v1');
      const cacheKey = new Request(cacheKeyUrl.toString(), { method: 'GET' });

      if (cache) {
        const cachedResp = await cache.match(cacheKey);
        if (cachedResp) {
          return cachedResp;
        }
      }

      const route = parseRoute(url);
      const meta = await resolveRouteMetadata(route, url, env);
      const html = renderOpenGraphHtml(meta);

      const response = new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          'X-Edge-Rendered': 'opengraph',
        },
      });

      if (cache && ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    }

    // 3. Human Browser & Static Asset Pass-Through to PWA Origin
    const originBase = String((env && env.ORIGIN_URL) || 'https://manga-dl.web.app').replace(/\/$/, '');
    const targetOriginUrl = `${originBase}${url.pathname}${url.search}`;
    return fetch(targetOriginUrl, {
      method: request.method,
      headers: request.headers,
      redirect: 'follow',
    });
  },
};

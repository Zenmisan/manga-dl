import re
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from curl_cffi import requests
from app.providers import get_provider
from app.providers.komga import KomgaProvider
from app.providers.suwayomi import SuwayomiProvider

log = logging.getLogger(__name__)
router = APIRouter(prefix="/sources", tags=["sources"])

KEIYOUSHI_INDEX = "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json"

# ---------------------------------------------------------------------------
# Built-in JS Extensions
# These run inside Web Workers in the browser. Each defines a global
# `extension` object with search(), getMangaDetail(), getPages() methods.
# Return shapes must match the frontend MangaDetail / MangaResult interfaces.
# ---------------------------------------------------------------------------

_MANGADEX_JS = r"""
var _MD = 'https://api.mangadex.org';
var _CDN = 'https://uploads.mangadex.org';

function _cover(data) {
  var rels = data.relationships || [];
  for (var i = 0; i < rels.length; i++) {
    var r = rels[i];
    if (r.type === 'cover_art' && r.attributes && r.attributes.fileName) {
      return _CDN + '/covers/' + data.id + '/' + r.attributes.fileName;
    }
  }
  return null;
}

function _title(attr) {
  var t = attr.title || {};
  return t.en || Object.values(t)[0] || 'Unknown';
}

function _toResult(item) {
  var attr = item.attributes || {};
  return {
    id: item.id,
    title: _title(attr),
    cover_url: _cover(item),
    provider: 'mangadex',
    url: 'https://mangadex.org/title/' + item.id,
    status: attr.status || null,
  };
}

var extension = {
  async search(query, page) {
    var offset = ((page || 1) - 1) * 20;
    var url = _MD + '/manga?title=' + encodeURIComponent(query) +
      '&limit=20&offset=' + offset +
      '&includes[]=cover_art&availableTranslatedLanguage[]=en' +
      '&contentRating[]=safe&contentRating[]=suggestive' +
      '&contentRating[]=erotica&contentRating[]=pornographic';
    var res = await fetch(url);
    if (!res.ok) throw new Error('MangaDex search: ' + res.status);
    var data = await res.json();
    return (data.data || []).map(_toResult);
  },

  async getMangaDetail(mangaId) {
    var detRes = await fetch(_MD + '/manga/' + mangaId +
      '?includes[]=cover_art&includes[]=author&includes[]=artist');
    if (!detRes.ok) throw new Error('MangaDex detail: ' + detRes.status);
    var det = (await detRes.json()).data;
    var attr = det.attributes || {};

    var genres = (attr.tags || [])
      .map(function(t) { return t.attributes && t.attributes.name && t.attributes.name.en; })
      .filter(Boolean);

    var authorMap = {};
    (det.relationships || []).forEach(function(r) {
      if ((r.type === 'author' || r.type === 'artist') && r.attributes && r.attributes.name) {
        authorMap[r.attributes.name] = true;
      }
    });

    // Fetch all chapters (paginated)
    var allItems = [];
    var limit = 500;
    var offset = 0;
    while (true) {
      var feedRes = await fetch(_MD + '/manga/' + mangaId +
        '/feed?limit=' + limit + '&offset=' + offset +
        '&translatedLanguage[]=en&order[chapter]=asc' +
        '&contentRating[]=safe&contentRating[]=suggestive' +
        '&contentRating[]=erotica&contentRating[]=pornographic');
      if (!feedRes.ok) break;
      var feedData = await feedRes.json();
      var items = feedData.data || [];
      allItems = allItems.concat(items);
      if (items.length < limit) break;
      offset += limit;
    }

    var chapters = allItems.map(function(item) {
      var a = item.attributes || {};
      return {
        id: item.id,
        title: a.title || ('Chapter ' + (a.chapter || '')),
        number: parseFloat(a.chapter) || 0,
        published_at: a.publishAt || null,
      };
    });

    return {
      id: det.id,
      title: _title(attr),
      cover_url: _cover(det),
      description: (attr.description || {}).en || null,
      status: attr.status || null,
      genres: genres,
      authors: Object.keys(authorMap),
      provider: 'mangadex',
      url: 'https://mangadex.org/title/' + det.id,
      chapters: chapters,
    };
  },

  async getPages(chapterId) {
    var res = await fetch(_MD + '/at-home/server/' + chapterId);
    if (!res.ok) throw new Error('MangaDex pages: ' + res.status);
    var data = await res.json();
    var base = data.baseUrl;
    var hash = data.chapter.hash;
    return (data.chapter.data || []).map(function(f) {
      return base + '/data/' + hash + '/' + f;
    });
  },

  async getPopular(page) {
    var offset = ((page || 1) - 1) * 20;
    var res = await fetch(_MD + '/manga?limit=20&offset=' + offset +
      '&includes[]=cover_art&availableTranslatedLanguage[]=en' +
      '&contentRating[]=safe&contentRating[]=suggestive' +
      '&order[followedCount]=desc');
    if (!res.ok) throw new Error('MangaDex popular: ' + res.status);
    var data = await res.json();
    return (data.data || []).map(_toResult);
  },

  async getLatest(page) {
    var offset = ((page || 1) - 1) * 20;
    var res = await fetch(_MD + '/manga?limit=20&offset=' + offset +
      '&includes[]=cover_art&availableTranslatedLanguage[]=en' +
      '&contentRating[]=safe&contentRating[]=suggestive' +
      '&order[latestUploadedChapter]=desc');
    if (!res.ok) throw new Error('MangaDex latest: ' + res.status);
    var data = await res.json();
    return (data.data || []).map(_toResult);
  },
};
"""

_OMEGASCANS_JS = r"""
var _OA = 'https://api.omegascans.org';
var _OS = 'https://omegascans.org';

function _osResult(item) {
  var slug = item.series_slug || item.slug || '';
  return {
    id: slug,
    title: item.title || item.name || 'Unknown',
    cover_url: item.thumbnail || null,
    provider: 'omegascans',
    url: _OS + '/series/' + slug,
    status: item.status || null,
  };
}

var extension = {
  async search(query, page) {
    var res = await fetch(_OA + '/query?adult=true&query_string=' +
      encodeURIComponent(query) + '&page=' + (page || 1) + '&perPage=20');
    if (!res.ok) throw new Error('OmegaScans search: ' + res.status);
    var data = await res.json();
    return (data.data || [])
      .filter(function(i) { return i.series_type === 'Comic'; })
      .map(_osResult);
  },

  async getMangaDetail(mangaId) {
    var serRes = await fetch(_OA + '/series/' + mangaId);
    if (!serRes.ok) throw new Error('OmegaScans detail: ' + serRes.status);
    var series = await serRes.json();

    var chapRes = await fetch(_OA + '/chapter/query?page=1&perPage=1999&series_id=' + series.id);
    var chapData = chapRes.ok ? (await chapRes.json()) : { data: [] };
    var chapters = (chapData.data || []).map(function(item) {
      var slug = item.chapter_slug || item.slug || '';
      var num = 0;
      try { num = parseFloat(slug.replace('chapter-', '')) || 0; } catch(e) {}
      return {
        id: mangaId + '/' + slug,
        title: item.chapter_name || item.name || slug,
        number: num,
        published_at: item.created_at || null,
      };
    });

    return {
      id: mangaId,
      title: series.title || series.name || 'Unknown',
      cover_url: series.thumbnail || null,
      description: series.description || series.summary || null,
      status: series.status || null,
      genres: (series.genres || []).map(function(g) { return g.name || ''; }),
      authors: (series.authors || []).map(function(a) { return a.name || ''; }),
      provider: 'omegascans',
      url: _OS + '/series/' + mangaId,
      chapters: chapters,
    };
  },

  async getPages(chapterId) {
    var parts = chapterId.split('/');
    var seriesSlug = parts[0];
    var chapterSlug = parts.slice(1).join('/');
    var res = await fetch(_OA + '/chapter/' + seriesSlug + '/' + chapterSlug);
    if (!res.ok) throw new Error('OmegaScans pages: ' + res.status);
    var data = await res.json();
    try { return data.chapter.chapter_data.images || []; }
    catch(e) { return []; }
  },

  async getPopular(page) {
    var res = await fetch(_OA + '/query?adult=true&page=' + (page || 1) + '&perPage=20&order=desc&orderBy=total_views');
    if (!res.ok) throw new Error('OmegaScans popular: ' + res.status);
    var data = await res.json();
    return (data.data || []).filter(function(i) { return i.series_type === 'Comic'; }).map(_osResult);
  },

  async getLatest(page) {
    var res = await fetch(_OA + '/query?adult=true&page=' + (page || 1) + '&perPage=20&order=desc&orderBy=created_at');
    if (!res.ok) throw new Error('OmegaScans latest: ' + res.status);
    var data = await res.json();
    return (data.data || []).filter(function(i) { return i.series_type === 'Comic'; }).map(_osResult);
  },
};
"""

_ASURASCANS_JS = r"""
var _AS = 'https://asuracomic.net';

async function _fetchDoc(url) {
  var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
  return new DOMParser().parseFromString(data.html, 'text/html');
}

function _asParseChapters(doc, mangaId) {
  var chapters = [];
  var seen = {};
  doc.querySelectorAll("a[href*='/chapter/']").forEach(function(a) {
    var href = a.getAttribute('href') || '';
    if (!href.includes('/chapter/')) return;
    var chSlug = href.split('/chapter/').pop().replace(/\/$/, '');
    var fullId = mangaId + '/chapter/' + chSlug;
    if (seen[fullId]) return;
    seen[fullId] = true;
    var numMatch = chSlug.match(/([\d.]+)/);
    var num = numMatch ? parseFloat(numMatch[1]) : 0;
    var span = a.querySelector('span, p');
    chapters.push({
      id: fullId,
      title: (span && span.textContent.trim()) || ('Chapter ' + num),
      number: num,
      published_at: null,
    });
  });
  chapters.sort(function(a, b) { return b.number - a.number; });
  return chapters;
}

var extension = {
  async search(query, page) {
    var doc = await _fetchDoc(_AS + '/series?page=' + (page || 1) + '&name=' + encodeURIComponent(query));
    var results = [];
    var seen = {};
    doc.querySelectorAll("a[href*='/series/']").forEach(function(card) {
      var href = card.getAttribute('href') || '';
      if (!href || href === '/series' || href.includes('/chapter/')) return;
      var slug = href.split('/series/').pop().replace(/\/$/, '');
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = card.querySelector('img');
      var titleEl = card.querySelector('span.font-bold, h3, .text-sm.font-bold, p.font-bold');
      results.push({
        id: slug,
        title: (titleEl && titleEl.textContent.trim()) || slug,
        cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
        provider: 'asurascans',
        url: _AS + '/series/' + slug,
        status: null,
      });
    });
    return results;
  },

  async getMangaDetail(mangaId) {
    var doc = await _fetchDoc(_AS + '/series/' + mangaId);
    var titleEl = doc.querySelector('h1') || doc.querySelector('span.text-xl.font-bold');
    var title = titleEl ? titleEl.textContent.trim() : mangaId;
    var img = doc.querySelector("img[alt='poster']") || doc.querySelector('img.object-cover') || doc.querySelector('img');
    var descEl = doc.querySelector('span.font-medium.text-sm') || doc.querySelector('p.text-sm');
    var genres = [];
    doc.querySelectorAll("a[href*='/genre/'], a[href*='/genres/']").forEach(function(a) {
      var g = a.textContent.trim();
      if (g) genres.push(g);
    });
    return {
      id: mangaId,
      title: title,
      cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
      description: descEl ? descEl.textContent.trim() : null,
      status: null,
      genres: genres,
      authors: [],
      provider: 'asurascans',
      url: _AS + '/series/' + mangaId,
      chapters: _asParseChapters(doc, mangaId),
    };
  },

  async getPages(chapterId) {
    var doc = await _fetchDoc(_AS + '/series/' + chapterId);
    var pages = [];
    doc.querySelectorAll("img[alt*='chapter'], img[alt*='page'], .chapter-content img, div[class*='reader'] img").forEach(function(img) {
      var src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
        pages.push(src);
      }
    });
    // Fallback: all images after removing nav/UI elements
    if (!pages.length) {
      doc.querySelectorAll('img').forEach(function(img) {
        var src = img.getAttribute('src') || '';
        if (src.startsWith('http') && (src.includes('cdn') || src.includes('chapter') || src.includes('image'))) {
          pages.push(src);
        }
      });
    }
    return pages;
  },

  async getPopular(page) {
    var doc = await _fetchDoc(_AS + '/series?page=' + (page || 1) + '&genres=&status=&types=&order=rating');
    var results = [];
    var seen = {};
    doc.querySelectorAll("a[href*='/series/']").forEach(function(card) {
      var href = card.getAttribute('href') || '';
      if (!href || href === '/series' || href.includes('/chapter/')) return;
      var slug = href.split('/series/').pop().replace(/\/$/, '');
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = card.querySelector('img');
      var titleEl = card.querySelector('span.font-bold, h3');
      results.push({
        id: slug,
        title: (titleEl && titleEl.textContent.trim()) || slug,
        cover_url: img ? img.getAttribute('src') : null,
        provider: 'asurascans',
        url: _AS + '/series/' + slug,
        status: null,
      });
    });
    return results;
  },

  async getLatest(page) {
    var doc = await _fetchDoc(_AS + '/series?page=' + (page || 1) + '&genres=&status=&types=&order=update');
    var results = [];
    var seen = {};
    doc.querySelectorAll("a[href*='/series/']").forEach(function(card) {
      var href = card.getAttribute('href') || '';
      if (!href || href === '/series' || href.includes('/chapter/')) return;
      var slug = href.split('/series/').pop().replace(/\/$/, '');
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = card.querySelector('img');
      var titleEl = card.querySelector('span.font-bold, h3');
      results.push({
        id: slug,
        title: (titleEl && titleEl.textContent.trim()) || slug,
        cover_url: img ? img.getAttribute('src') : null,
        provider: 'asurascans',
        url: _AS + '/series/' + slug,
        status: null,
      });
    });
    return results;
  },
};
"""

_MANGAKATANA_JS = r"""
var _MK = 'https://mangakatana.com';

async function _fetchDoc(url) {
  var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
  return new DOMParser().parseFromString(data.html, 'text/html');
}

async function _fetchHtml(url) {
  var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
  return data.html;
}

var extension = {
  async search(query, page) {
    var pageStr = (page || 1) > 1 ? ('/page/' + page) : '';
    var doc = await _fetchDoc(_MK + pageStr + '?search=' + encodeURIComponent(query) + '&search_by=m_name');
    var results = [];
    var seen = {};
    doc.querySelectorAll('.manga_list-sbs .item, .item').forEach(function(item) {
      var a = item.querySelector('h3 a, .title a, a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!href.includes('/manga/')) return;
      var slug = href.replace(/\/$/, '').split('/').pop();
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = item.querySelector('img');
      results.push({
        id: slug,
        title: a.textContent.trim(),
        cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
        provider: 'mangakatana',
        url: href,
        status: null,
      });
    });
    return results;
  },

  async getMangaDetail(mangaId) {
    var doc = await _fetchDoc(_MK + '/manga/' + mangaId);
    var title = (doc.querySelector('h1.heading') || {textContent:mangaId}).textContent.trim();
    var coverEl = doc.querySelector('.cover img');
    var cover = coverEl ? coverEl.getAttribute('src') : null;
    var desc = null;
    var descEl = doc.querySelector('.summary p') || doc.querySelector('.summary');
    if (descEl) desc = descEl.textContent.trim();
    var genres = [];
    doc.querySelectorAll('.genres a').forEach(function(a) { genres.push(a.textContent.trim()); });
    var authors = [];
    doc.querySelectorAll('.author a').forEach(function(a) { authors.push(a.textContent.trim()); });

    var chapters = [];
    doc.querySelectorAll('.chapters tr').forEach(function(row) {
      var a = row.querySelector('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var slug = href.replace(/\/$/, '').split('/').pop();
      var numMatch = slug.match(/([\d.]+)/);
      var num = numMatch ? parseFloat(numMatch[1]) : 0;
      var dateEl = row.querySelector('.update_time, time, td:last-child');
      chapters.push({
        id: mangaId + '/' + slug,
        title: a.textContent.trim() || ('Chapter ' + num),
        number: num,
        published_at: dateEl ? dateEl.textContent.trim() : null,
      });
    });

    return {
      id: mangaId, title: title,
      cover_url: cover, description: desc,
      status: null, genres: genres, authors: authors,
      provider: 'mangakatana',
      url: _MK + '/manga/' + mangaId,
      chapters: chapters,
    };
  },

  async getPages(chapterId) {
    var html = await _fetchHtml(_MK + '/manga/' + chapterId);
    // MangaKatana stores images in a JS var array: var thzq=[...] or similar
    var best = [];
    var re = /var\s+\w+\s*=\s*(\['[^']*'(?:,'[^']*')*\])\s*;/g;
    var m;
    while ((m = re.exec(html)) !== null) {
      try {
        var arr = JSON.parse(m[1].replace(/'/g, '"'));
        if (Array.isArray(arr) && arr.length > best.length && typeof arr[0] === 'string' && arr[0].startsWith('http')) {
          best = arr;
        }
      } catch(e) {}
    }
    if (best.length) return best;
    // Fallback
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var pages = [];
    doc.querySelectorAll('.wrap_warpper img[data-src], #img_list img').forEach(function(img) {
      var src = img.getAttribute('data-src') || img.getAttribute('src');
      if (src) pages.push(src);
    });
    return pages;
  },

  async getPopular(page) {
    var doc = await _fetchDoc(_MK + '/manga/page/' + (page || 1));
    var results = [];
    var seen = {};
    doc.querySelectorAll('.item').forEach(function(item) {
      var a = item.querySelector('h3 a, a');
      if (!a || !a.getAttribute('href').includes('/manga/')) return;
      var slug = a.getAttribute('href').replace(/\/$/, '').split('/').pop();
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = item.querySelector('img');
      results.push({
        id: slug,
        title: a.textContent.trim(),
        cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
        provider: 'mangakatana',
        url: a.getAttribute('href'),
        status: null,
      });
    });
    return results;
  },

  async getLatest(page) {
    var doc = await _fetchDoc(_MK + '/manga/page/' + (page || 1) + '?filter=latest');
    var results = [];
    var seen = {};
    doc.querySelectorAll('.item').forEach(function(item) {
      var a = item.querySelector('h3 a, a');
      if (!a || !a.getAttribute('href').includes('/manga/')) return;
      var slug = a.getAttribute('href').replace(/\/$/, '').split('/').pop();
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = item.querySelector('img');
      results.push({
        id: slug,
        title: a.textContent.trim(),
        cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
        provider: 'mangakatana',
        url: a.getAttribute('href'),
        status: null,
      });
    });
    return results;
  },
};
"""

# Map provider ID → { code, name, lang, version, icon }
BUILT_IN_EXTENSIONS: dict[str, dict] = {
    "mangadex": {
        "code": _MANGADEX_JS,
        "name": "MangaDex",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://mangadex.org/favicon.ico",
        "nsfw": False,
        "skip_proxy": True,  # CDN is CORS-enabled, no proxy needed for images
    },
    "omegascans": {
        "code": _OMEGASCANS_JS,
        "name": "Omega Scans",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://omegascans.org/favicon.ico",
        "nsfw": False,
        "skip_proxy": False,
    },
    "asurascans": {
        "code": _ASURASCANS_JS,
        "name": "Asura Scans",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://asuracomic.net/favicon.ico",
        "nsfw": False,
        "skip_proxy": False,
    },
    "mangakatana": {
        "code": _MANGAKATANA_JS,
        "name": "MangaKatana",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://mangakatana.com/favicon.ico",
        "nsfw": False,
        "skip_proxy": False,
    },
}


@router.get("/builtins")
async def list_builtins():
    """Return metadata for all built-in extensions."""
    return [
        {
            "id": ext_id,
            "name": meta["name"],
            "lang": meta["lang"],
            "version": meta["version"],
            "icon": meta["icon"],
            "nsfw": meta["nsfw"],
            "builtin": True,
            "skip_proxy": meta["skip_proxy"],
        }
        for ext_id, meta in BUILT_IN_EXTENSIONS.items()
    ]


@router.get("/market")
async def list_market_sources():
    """Return built-in extensions + Keiyoushi community extensions."""
    # Start with built-ins (always reliable)
    sources = [
        {
            "id": ext_id,
            "name": meta["name"],
            "version": meta["version"],
            "lang": meta["lang"],
            "icon": meta["icon"],
            "nsfw": meta["nsfw"],
            "builtin": True,
            "skip_proxy": meta["skip_proxy"],
        }
        for ext_id, meta in BUILT_IN_EXTENSIONS.items()
    ]

    # Try to append Keiyoushi community extensions (best-effort)
    try:
        response = requests.get(KEIYOUSHI_INDEX, impersonate="chrome110", timeout=10)
        if response.status_code == 200:
            data = response.json()
            builtin_ids = set(BUILT_IN_EXTENSIONS.keys())
            for ext in data:
                pkg = ext.get("pkg", "")
                # Skip if we have a built-in for this provider
                simple_id = pkg.split(".")[-1]
                if simple_id in builtin_ids:
                    continue
                sources.append({
                    "id": pkg,
                    "name": re.sub(r'^Tachiyomi:?\s*', '', ext.get("name", "")),
                    "version": ext.get("version"),
                    "lang": ext.get("lang"),
                    "icon": f"https://raw.githubusercontent.com/keiyoushi/extensions/repo/icon/{pkg}.png",
                    "nsfw": ext.get("nsfw", 0) == 1,
                    "builtin": False,
                    "skip_proxy": False,
                })
    except Exception as e:
        log.warning("Keiyoushi market fetch failed (non-fatal): %s", e)

    return sources


@router.get("/code/{pkg_id}")
async def get_extension_code(pkg_id: str):
    """Return built-in JS extension code, or proxy from Keiyoushi for community extensions."""
    if pkg_id in BUILT_IN_EXTENSIONS:
        meta = BUILT_IN_EXTENSIONS[pkg_id]
        return {
            "code": meta["code"],
            "skip_proxy": meta["skip_proxy"],
        }

    # Community extension — attempt Keiyoushi (JS may not exist, will 404)
    try:
        ext_url = f"https://raw.githubusercontent.com/keiyoushi/extensions/repo/sources/{pkg_id}/index.js"
        response = requests.get(ext_url, impersonate="chrome110", timeout=10)
        if response.status_code == 200:
            return {"code": response.text, "skip_proxy": False}
        raise HTTPException(status_code=404, detail="Extension code not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class KomgaConfig(BaseModel):
    base_url: str
    username: str = ""
    password: str = ""


class SuwayomiConfig(BaseModel):
    base_url: str


@router.post("/configure/komga")
async def configure_komga(config: KomgaConfig):
    provider = get_provider("komga")
    if not isinstance(provider, KomgaProvider):
        raise HTTPException(500, "Komga provider not registered")
    provider.configure(config.base_url, config.username, config.password)
    return {"status": "ok", "base_url": config.base_url}


@router.post("/configure/suwayomi")
async def configure_suwayomi(config: SuwayomiConfig):
    provider = get_provider("suwayomi")
    if not isinstance(provider, SuwayomiProvider):
        raise HTTPException(500, "Suwayomi provider not registered")
    provider.configure(config.base_url)
    return {"status": "ok", "base_url": config.base_url}

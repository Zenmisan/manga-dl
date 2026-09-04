"""
Server-side discovery cache.

Pre-fetches popular/latest manga for all built-in sources and stores results in
an in-memory dict. Refreshed every 30 minutes via a background asyncio task.
"""
import asyncio
import logging
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.services.js_extensions import BUILT_IN_EXTENSIONS

log = logging.getLogger(__name__)

_cache: dict[str, dict[str, list]] = {}
_task_handle: asyncio.Task | None = None

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

_HEADERS = {
    "User-Agent": _UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}


async def get_discovery(provider_ids: list[str]) -> dict[str, dict[str, list]]:
    """Return cached popular+latest for the requested providers."""
    return {pid: _cache.get(pid, {"popular": [], "latest": []}) for pid in provider_ids}


def start_discovery_refresh() -> None:
    global _task_handle
    _task_handle = asyncio.create_task(_refresh_loop())
    log.info("[Discovery] Background refresh task started")


def stop_discovery_refresh() -> None:
    global _task_handle
    if _task_handle:
        _task_handle.cancel()
        _task_handle = None


async def _refresh_loop() -> None:
    await warm_all()
    while True:
        await asyncio.sleep(30 * 60)
        await warm_all()


async def warm_all() -> None:
    """Fire scrapers for all built-in sources concurrently."""
    log.info("[Discovery] Warming cache for %d built-in sources...", len(BUILT_IN_EXTENSIONS))
    tasks: list[Any] = []
    for pid, meta in BUILT_IN_EXTENSIONS.items():
        if pid == "mangadex":
            tasks.append(_warm_mangadex())
        elif meta.get("template") == "mangathemesia":
            tasks.append(_warm_mangathemesia(pid, meta["base_url"]))
        elif meta.get("template") == "madara":
            tasks.append(_warm_madara(pid, meta["base_url"]))
    results = await asyncio.gather(*tasks, return_exceptions=True)
    errors = sum(1 for r in results if isinstance(r, Exception))
    log.info("[Discovery] Cache warm complete — %d sources, %d errors", len(tasks), errors)


# ── MangaDex ─────────────────────────────────────────────────────────────────

async def _warm_mangadex() -> None:
    base = "https://api.mangadex.org"
    params_common: dict[str, Any] = {
        "limit": 20,
        "contentRating[]": "safe",
        "includes[]": "cover_art",
    }
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            pop_r = await client.get(f"{base}/manga", params={**params_common, "order[followedCount]": "desc"})
            lat_r = await client.get(f"{base}/manga", params={**params_common, "order[latestUploadedChapter]": "desc"})
        pop_r.raise_for_status()
        lat_r.raise_for_status()
        _cache["mangadex"] = {
            "popular": _parse_mangadex(pop_r.json()),
            "latest": _parse_mangadex(lat_r.json()),
        }
        log.debug("[Discovery] mangadex: %d popular, %d latest", len(_cache["mangadex"]["popular"]), len(_cache["mangadex"]["latest"]))
    except Exception as exc:
        log.warning("[Discovery] mangadex failed: %s", exc)
        _cache.setdefault("mangadex", {"popular": [], "latest": []})


def _parse_mangadex(data: dict) -> list[dict]:
    results = []
    for m in data.get("data", []):
        mid = m["id"]
        attrs = m.get("attributes", {})
        title = next(iter(attrs.get("title", {}).values()), "")
        cover_rel = next((r for r in m.get("relationships", []) if r["type"] == "cover_art"), None)
        cover_url = None
        if cover_rel and cover_rel.get("attributes"):
            fname = cover_rel["attributes"].get("fileName", "")
            cover_url = f"https://uploads.mangadex.org/covers/{mid}/{fname}.256.jpg" if fname else None
        results.append({
            "id": mid,
            "title": title,
            "cover_url": cover_url,
            "provider": "mangadex",
            "url": f"https://mangadex.org/title/{mid}",
            "status": attrs.get("status"),
        })
    return results


# ── MangaThemesia ─────────────────────────────────────────────────────────────

async def _warm_mangathemesia(pid: str, base_url: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True, headers=_site_headers(base_url)) as client:
            pop_r = await client.get(f"{base_url}/manga/", params={"type": "", "status": "", "order": "popular"})
            lat_r = await client.get(f"{base_url}/manga/", params={"type": "", "status": "", "order": "update"})
        _cache[pid] = {
            "popular": _parse_mangathemesia(pop_r.text, pid),
            "latest": _parse_mangathemesia(lat_r.text, pid),
        }
        log.debug("[Discovery] %s (MangaThemesia): %d popular, %d latest", pid, len(_cache[pid]["popular"]), len(_cache[pid]["latest"]))
    except Exception as exc:
        log.warning("[Discovery] %s (MangaThemesia) failed: %s", pid, exc)
        _cache.setdefault(pid, {"popular": [], "latest": []})


def _parse_mangathemesia(html: str, provider: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for item in soup.select(".bsx")[:20]:
        a = item.select_one("a")
        if not a:
            continue
        url = a.get("href", "")
        title_el = item.select_one(".tt")
        img = item.select_one("img")
        cover = None
        if img:
            cover = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
        slug = url.rstrip("/").split("/")[-1]
        results.append({
            "id": slug,
            "title": title_el.get_text(strip=True) if title_el else slug,
            "cover_url": cover,
            "provider": provider,
            "url": url,
            "status": None,
        })
    return results


# ── Madara (WordPress) ────────────────────────────────────────────────────────

def _site_headers(base_url: str) -> dict:
    return {**_HEADERS, "Referer": base_url + "/", "Origin": base_url}


async def _warm_madara(pid: str, base_url: str) -> None:
    headers = _site_headers(base_url)
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers=headers) as client:
            pop_r = await client.get(f"{base_url}/manga/", params={"m_orderby": "trending"})
            lat_r = await client.get(f"{base_url}/manga/", params={"m_orderby": "latest"})
        pop_r.raise_for_status()
        lat_r.raise_for_status()
        _cache[pid] = {
            "popular": _parse_madara_html(pop_r.text, pid),
            "latest": _parse_madara_html(lat_r.text, pid),
        }
        log.debug("[Discovery] %s (Madara): %d popular, %d latest", pid, len(_cache[pid]["popular"]), len(_cache[pid]["latest"]))
    except Exception as exc:
        log.warning("[Discovery] %s (Madara) failed: %s", pid, exc)
        _cache.setdefault(pid, {"popular": [], "latest": []})


def _parse_madara_html(html: str, provider: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    results = []
    # GET browse pages use .page-item-detail; AJAX responses use .manga
    items = soup.select(".page-item-detail, .manga-item, .c-image-hover")[:20]
    if not items:
        # Some themes wrap items differently
        items = soup.select("div[class*='manga']")[:20]
    for item in items:
        a = item.select_one("a[href]")
        title_el = item.select_one(".post-title h3, .post-title h5, .post-title a, h3 a, h4 a")
        img = item.select_one("img")
        if not a:
            continue
        url = a.get("href", "")
        if not url or "wp-" in url:
            continue
        cover = None
        if img:
            cover = img.get("data-src") or img.get("data-lazy-src") or img.get("src")
        slug = url.rstrip("/").split("/")[-1]
        title_text = title_el.get_text(strip=True) if title_el else slug
        if not title_text:
            continue
        results.append({
            "id": slug,
            "title": title_text,
            "cover_url": cover,
            "provider": provider,
            "url": url,
            "status": None,
        })
    return results

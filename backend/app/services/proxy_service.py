import asyncio
import logging
from urllib.parse import urlparse
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from curl_cffi.requests import AsyncSession as CurlSession

log = logging.getLogger(__name__)

MAX_RETRIES = 2


async def proxy_html_content(url: str) -> dict:
    """Proxy HTML content for extensions unable to bypass CORS directly."""
    parsed = urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    last_exc = None

    for attempt in range(1 + MAX_RETRIES):
        try:
            async with CurlSession(impersonate="chrome110") as client:
                resp = await client.get(
                    url,
                    headers={"Referer": referer, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
                    timeout=20.0,
                    allow_redirects=True,
                )
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code, detail=f"Upstream HTML error: {resp.status_code}")
                return {"html": resp.text, "url": str(resp.url)}
        except HTTPException:
            raise
        except Exception as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                log.warning("HTML proxy retry %d for %s due to %s", attempt + 1, url, exc)
                await asyncio.sleep(0.5 * (attempt + 1))

    err_str = str(last_exc)
    log.error("HTML proxy failed for %s: %s", url, err_str)
    if "Could not resolve host" in err_str or "(6)" in err_str:
        raise HTTPException(status_code=502, detail=f"Could not resolve host: {parsed.netloc}. Check DNS or internet connection.")
    raise HTTPException(status_code=502, detail=f"HTML proxy failed: {err_str}")


async def proxy_json_content(url: str) -> dict | list:
    """Proxy JSON API responses for JS extensions."""
    parsed = urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    last_exc = None

    for attempt in range(1 + MAX_RETRIES):
        try:
            async with CurlSession(impersonate="chrome110") as client:
                resp = await client.get(
                    url,
                    headers={"Referer": referer, "Accept": "application/json"},
                    timeout=20.0,
                    allow_redirects=True,
                )
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code, detail=f"Upstream JSON error: {resp.status_code}")
                return resp.json()
        except HTTPException:
            raise
        except Exception as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                log.warning("JSON proxy retry %d for %s due to %s", attempt + 1, url, exc)
                await asyncio.sleep(0.5 * (attempt + 1))

    err_str = str(last_exc)
    log.error("JSON proxy failed for %s: %s", url, err_str)
    if "Could not resolve host" in err_str or "(6)" in err_str:
        raise HTTPException(status_code=502, detail=f"Could not resolve host: {parsed.netloc}. Check DNS or internet connection.")
    raise HTTPException(status_code=502, detail=f"JSON proxy failed: {err_str}")


async def proxy_image_response(url: str) -> StreamingResponse:
    """Proxy image content to bypass hotlinking restrictions."""
    parsed = urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    last_exc = None

    for attempt in range(1 + MAX_RETRIES):
        try:
            async with CurlSession(impersonate="chrome110") as client:
                resp = await client.get(
                    url,
                    headers={
                        "Referer": referer,
                        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Cache-Control": "no-cache",
                    },
                    timeout=30.0,
                    allow_redirects=True,
                )
                if resp.status_code != 200:
                    log.warning("Image proxy upstream %s for %s", resp.status_code, url)
                    raise HTTPException(status_code=resp.status_code, detail=f"Upstream image error: {resp.status_code}")
                content_type = resp.headers.get("content-type", "image/jpeg")
                return StreamingResponse(
                    iter([resp.content]),
                    media_type=content_type,
                    headers={
                        "Cache-Control": "public, max-age=86400",
                        "Access-Control-Allow-Origin": "*",
                    },
                )
        except HTTPException:
            raise
        except Exception as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                log.warning("Image proxy retry %d for %s due to %s", attempt + 1, url, exc)
                await asyncio.sleep(0.5 * (attempt + 1))

    err_str = str(last_exc)
    log.error("Image proxy failed for %s: %s", url, err_str)
    if "Could not resolve host" in err_str or "(6)" in err_str:
        raise HTTPException(status_code=502, detail=f"Could not resolve host: {parsed.netloc}. Check DNS or internet connection.")
    raise HTTPException(status_code=502, detail=f"Image proxy failed: {err_str}")

import logging
from urllib.parse import urlparse
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from curl_cffi.requests import AsyncSession as CurlSession

log = logging.getLogger(__name__)


async def proxy_html_content(url: str) -> dict:
    """Proxy HTML content for extensions unable to bypass CORS directly."""
    try:
        parsed = urlparse(url)
        referer = f"{parsed.scheme}://{parsed.netloc}/"
        async with CurlSession(impersonate="chrome110") as client:
            resp = await client.get(
                url,
                headers={"Referer": referer, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
                timeout=20.0,
                allow_redirects=True,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Upstream error")
            return {"html": resp.text, "url": str(resp.url)}
    except HTTPException:
        raise
    except Exception as exc:
        log.error("HTML proxy failed for %s: %s", url, exc)
        raise HTTPException(status_code=502, detail="HTML proxy failed")


async def proxy_json_content(url: str) -> dict | list:
    """Proxy JSON API responses for JS extensions."""
    try:
        parsed = urlparse(url)
        referer = f"{parsed.scheme}://{parsed.netloc}/"
        async with CurlSession(impersonate="chrome110") as client:
            resp = await client.get(
                url,
                headers={"Referer": referer, "Accept": "application/json"},
                timeout=20.0,
                allow_redirects=True,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Upstream error: {resp.status_code}")
            return resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        log.error("JSON proxy failed for %s: %s", url, exc)
        raise HTTPException(status_code=502, detail="JSON proxy failed")


async def proxy_image_response(url: str) -> StreamingResponse:
    """Proxy image content to bypass hotlinking restrictions."""
    try:
        parsed = urlparse(url)
        referer = f"{parsed.scheme}://{parsed.netloc}/"
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
                raise HTTPException(status_code=resp.status_code, detail="Upstream image error")
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
        log.error("Image proxy failed for %s: %s", url, exc)
        raise HTTPException(status_code=502, detail="Image proxy failed")

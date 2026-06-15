from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from curl_cffi.requests import AsyncSession as CurlSession
import logging

log = logging.getLogger(__name__)
from pydantic import BaseModel
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.manga import MangaRecord

router = APIRouter(prefix="/manga", tags=["manga"])


class SubscribeMeta(BaseModel):
    title: str = ""
    cover_url: str | None = None
    description: str | None = None
    status: str | None = None
    genres: list[str] = []
    authors: list[str] = []
    url: str = ""


class MigrationRequest(BaseModel):
    old_provider: str
    old_manga_id: str
    new_provider: str
    new_manga_id: str
    new_title: str | None = None
    new_cover_url: str | None = None


@router.get("/proxy/html")
async def proxy_html(url: str = Query(...)):
    """Proxy HTML for extension Web Workers that can't bypass CORS."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        referer = f"{parsed.scheme}://{parsed.netloc}/"
        async with CurlSession(impersonate="chrome110") as client:
            resp = await client.get(
                url,
                headers={"Referer": referer, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
                timeout=20.0,
                follow_redirects=True,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Upstream error")
            return {"html": resp.text, "url": str(resp.url)}
    except HTTPException:
        raise
    except Exception as exc:
        log.error("HTML proxy failed for %s: %s", url, exc)
        raise HTTPException(status_code=502, detail="HTML proxy failed")


@router.get("/proxy/json")
async def proxy_json(url: str = Query(...)):
    """Proxy a JSON API for JS extensions — bypasses CORS restrictions on third-party APIs."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        referer = f"{parsed.scheme}://{parsed.netloc}/"
        async with CurlSession(impersonate="chrome110") as client:
            resp = await client.get(
                url,
                headers={"Referer": referer, "Accept": "application/json"},
                timeout=20.0,
                follow_redirects=True,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Upstream error: {resp.status_code}")
            return resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        log.error("JSON proxy failed for %s: %s", url, exc)
        raise HTTPException(status_code=502, detail="JSON proxy failed")


@router.get("/image-proxy")
async def proxy_image(url: str = Query(...)):
    """Proxy a remote manga page/cover image to avoid CORS and hotlink restrictions."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        referer = f"{parsed.scheme}://{parsed.netloc}/"
        async with CurlSession(impersonate="chrome110") as client:
            resp = await client.get(
                url,
                headers={"Referer": referer},
                timeout=20.0,
                follow_redirects=True,
            )
            if resp.status_code != 200:
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


@router.get("/updates")
async def get_manga_updates(db: AsyncSession = Depends(get_db)):
    """Return latest chapters from all subscribed manga (uses cached chapter data)."""
    result = await db.execute(select(MangaRecord).where(MangaRecord.subscribed == True))
    manga_list = result.scalars().all()

    updates = []
    for manga in manga_list:
        chapters_json = manga.chapters_json or {}
        if not isinstance(chapters_json, dict):
            continue
        chapter_list = list(chapters_json.values())
        chapter_list.sort(key=lambda c: c.get("number", 0) if isinstance(c, dict) else 0, reverse=True)
        for ch in chapter_list[:10]:
            if not isinstance(ch, dict):
                continue
            updates.append({
                "manga_title": manga.title,
                "manga_id": manga.provider_manga_id,
                "provider": manga.provider,
                "cover_url": manga.cover_url,
                "chapter_id": ch.get("id", ""),
                "chapter_title": ch.get("title", ""),
                "chapter_number": ch.get("number", 0),
                "published_at": ch.get("published_at", ""),
            })

    updates.sort(
        key=lambda u: (u.get("published_at") or ""),
        reverse=True,
    )
    return updates[:200]


@router.post("/sync")
async def trigger_sync():
    """Manually trigger one sync cycle for all subscribed manga."""
    from app.core.tasks import _sync_once
    asyncio.create_task(_sync_once())
    return {"status": "sync started"}


@router.get("/subscription/{provider_id}/{manga_id:path}")
async def get_subscription_status(provider_id: str, manga_id: str, db: AsyncSession = Depends(get_db)):
    """Get subscription status for a manga."""
    record_id = f"{provider_id}:{manga_id}"
    result = await db.execute(select(MangaRecord).where(MangaRecord.id == record_id))
    record = result.scalar_one_or_none()
    return {"subscribed": record.subscribed if record else False}


@router.post("/subscribe/{provider_id}/{manga_id:path}")
async def toggle_subscribe(provider_id: str, manga_id: str, meta: SubscribeMeta = SubscribeMeta(), db: AsyncSession = Depends(get_db)):
    """Toggle subscription for a manga. Creates a record using provided metadata if it doesn't exist."""
    record_id = f"{provider_id}:{manga_id}"
    result = await db.execute(select(MangaRecord).where(MangaRecord.id == record_id))
    record = result.scalar_one_or_none()

    if not record:
        if not meta.title:
            raise HTTPException(
                status_code=422,
                detail="Manga not found in library and no metadata provided. Supply title and other fields to create a new record."
            )
        record = MangaRecord(
            id=record_id,
            provider=provider_id,
            provider_manga_id=manga_id,
            title=meta.title,
            cover_url=meta.cover_url,
            description=meta.description,
            status=meta.status,
            genres=meta.genres,
            authors=meta.authors,
            url=meta.url,
            subscribed=True,
        )
        db.add(record)
        await db.commit()
        return {"subscribed": True}

    record.subscribed = not record.subscribed
    await db.commit()
    return {"subscribed": record.subscribed}


@router.post("/migrate")
async def migrate_manga_source(req: MigrationRequest, db: AsyncSession = Depends(get_db)):
    """Migrate manga from one source to another, preserving downloads and subscription."""
    old_id = f"{req.old_provider}:{req.old_manga_id}"
    result = await db.execute(select(MangaRecord).where(MangaRecord.id == old_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Manga not found in library")

    new_id = f"{req.new_provider}:{req.new_manga_id}"

    record.id = new_id
    record.provider = req.new_provider
    record.provider_manga_id = req.new_manga_id
    if req.new_title:
        record.title = req.new_title
    if req.new_cover_url:
        record.cover_url = req.new_cover_url

    await db.commit()
    return {"status": "migrated", "new_id": new_id}

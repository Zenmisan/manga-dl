import logging
import asyncio
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.supabase_auth import get_current_user_email
from app.services.proxy_service import (
    proxy_html_content,
    proxy_json_content,
    proxy_image_response,
)
from app.services.manga_service import (
    fetch_manga_updates,
    fetch_subscription_status,
    toggle_manga_subscription,
    migrate_manga_provider,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/manga", tags=["manga"])


async def _assert_admin(request: Request):
    """Raise 403 if the user is not zenmisan@gmail.com."""
    email = await get_current_user_email(request)
    if email != "zenmisan@gmail.com":
        raise HTTPException(status_code=403, detail="Library access is restricted to administrator.")


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
    return await proxy_html_content(url)


@router.get("/proxy/json")
async def proxy_json(url: str = Query(...)):
    """Proxy a JSON API for JS extensions — bypasses CORS restrictions on third-party APIs."""
    return await proxy_json_content(url)


@router.get("/image-proxy")
async def proxy_image(url: str = Query(...)):
    """Proxy a remote manga page/cover image to avoid CORS and hotlink restrictions."""
    return await proxy_image_response(url)


@router.get("/updates")
async def get_manga_updates(db: AsyncSession = Depends(get_db)):
    """Return latest chapters from all subscribed manga (uses cached chapter data)."""
    return await fetch_manga_updates(db)


@router.post("/sync")
async def trigger_sync(request: Request):
    """Manually trigger one sync cycle for all subscribed manga."""
    await _assert_admin(request)
    from app.core.tasks import _sync_once
    asyncio.create_task(_sync_once())
    return {"status": "sync started"}


@router.get("/subscription/{provider_id}/{manga_id:path}")
async def get_subscription_status(provider_id: str, manga_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Get subscription status for a manga."""
    email = await get_current_user_email(request)
    status = await fetch_subscription_status(provider_id, manga_id, email, db)
    return {"subscribed": status}


@router.post("/subscribe/{provider_id}/{manga_id:path}")
async def toggle_subscribe(provider_id: str, manga_id: str, request: Request, meta: SubscribeMeta = SubscribeMeta(), db: AsyncSession = Depends(get_db)):
    """Toggle subscription for a manga. Creates a record using provided metadata if it doesn't exist."""
    await _assert_admin(request)
    status = await toggle_manga_subscription(provider_id, manga_id, meta.model_dump(), db)
    return {"subscribed": status}


@router.post("/migrate")
async def migrate_manga_source(req: MigrationRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Migrate manga from one source to another, preserving downloads and subscription."""
    await _assert_admin(request)
    new_id = await migrate_manga_provider(
        req.old_provider, req.old_manga_id, req.new_provider, req.new_manga_id, req.new_title, req.new_cover_url, db
    )
    return {"status": "migrated", "new_id": new_id}

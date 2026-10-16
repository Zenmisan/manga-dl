from fastapi import APIRouter, HTTPException, Query
from app.core.discovery_cache import get_discovery, lookup_manga_metadata

router = APIRouter()
public_router = APIRouter()


@router.get("/sources/discovery")
async def discovery_endpoint(providers: str = Query(default="")):
    """Return cached popular+latest manga for the requested provider IDs."""
    ids = [p.strip() for p in providers.split(",") if p.strip()]
    return await get_discovery(ids)


@public_router.get("/discovery/metadata")
async def discovery_metadata_endpoint(
    provider: str = Query(default=""),
    manga_id: str = Query(default=""),
    slug: str = Query(default=""),
    title: str = Query(default=""),
):
    """Public metadata lookup for Cloudflare Edge Worker OpenGraph generation."""
    result = await lookup_manga_metadata(
        provider=provider.strip() or None,
        manga_id=manga_id.strip() or None,
        slug=slug.strip() or None,
        title=title.strip() or None,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Metadata not found in discovery cache")
    return result


@public_router.get("/discovery/manga/{provider}/{manga_id:path}")
async def discovery_manga_by_provider_endpoint(provider: str, manga_id: str):
    """Direct public metadata lookup by provider and manga_id for Edge Worker."""
    result = await lookup_manga_metadata(
        provider=provider.strip(),
        manga_id=manga_id.strip(),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Metadata not found in discovery cache")
    return result

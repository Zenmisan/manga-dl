from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any
import asyncio

from app.providers import get_provider, list_providers
from app.providers.base import MangaResult, MangaDetail, ProviderHealth

router = APIRouter(prefix="/manga", tags=["manga"])


class ProviderInfo(BaseModel):
    id: str
    name: str
    base_url: str
    health: str


class SearchResult(BaseModel):
    id: str
    title: str
    cover_url: str | None
    provider: str
    url: str
    status: str | None
    anilist_score: int | None = None
    anilist_url: str | None = None


class ChapterOut(BaseModel):
    id: str
    title: str
    number: float
    url: str
    published_at: str | None


class MangaDetailOut(BaseModel):
    id: str
    title: str
    cover_url: str | None
    description: str | None
    status: str | None
    genres: list[str]
    authors: list[str]
    provider: str
    url: str
    chapters: list[ChapterOut]


@router.get("/providers", response_model=list[ProviderInfo])
async def get_providers():
    """List all registered providers with their health status."""
    return [
        ProviderInfo(
            id=p.id,
            name=p.name,
            base_url=p.base_url,
            health=p.health.value,
        )
        for p in list_providers()
    ]


@router.post("/providers/{provider_id}/validate")
async def validate_provider(provider_id: str):
    """Run scraper validation for a provider and return the health report."""
    provider = get_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")

    report = await provider.validate()
    return {
        "provider": provider_id,
        "status": report.status.value,
        "failures": report.failures,
        "message": report.message,
    }


@router.post("/providers/validate-all")
async def validate_all_providers():
    """Run validation for all providers concurrently."""
    providers = list_providers()
    reports = await asyncio.gather(*[p.validate() for p in providers], return_exceptions=True)
    return [
        {
            "provider": p.id,
            "status": r.status.value if not isinstance(r, Exception) else "broken",
            "message": r.message if not isinstance(r, Exception) else str(r),
            "failures": r.failures if not isinstance(r, Exception) else [],
        }
        for p, r in zip(providers, reports)
    ]


@router.get("/search", response_model=list[SearchResult])
async def search_manga(
    q: str = Query(..., min_length=1),
    provider: str | None = Query(None),
    page: int = Query(1, ge=1),
):
    """Search manga across one or all providers."""
    if provider:
        p = get_provider(provider)
        if not p:
            raise HTTPException(status_code=404, detail=f"Provider '{provider}' not found")
        providers = [p]
    else:
        providers = list_providers()

    async def _search(p):
        try:
            return await p.search(q, page=page)
        except Exception as exc:
            return []

    results_nested = await asyncio.gather(*[_search(p) for p in providers])
    results = [item for sublist in results_nested for item in sublist]

    # Enrich with AniList scores (non-blocking)
    from app.core.metadata import enrich_results_with_metadata
    try:
        results = await enrich_results_with_metadata(results)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Metadata enrichment failed: {e}")

    return [
        SearchResult(
            id=r.id,
            title=r.title,
            cover_url=r.cover_url,
            provider=r.provider,
            url=r.url,
            status=r.status,
            anilist_score=getattr(r, "anilist_score", None),
            anilist_url=getattr(r, "anilist_url", None),
        )
        for r in results
    ]


@router.get("/{provider_id}/{manga_id:path}", response_model=MangaDetailOut)
async def get_manga_detail(provider_id: str, manga_id: str):
    """Get full manga details and chapter list from a specific provider."""
    provider = get_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")

    try:
        detail = await provider.get_manga(manga_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch manga: {exc}")

    return MangaDetailOut(
        id=detail.id,
        title=detail.title,
        cover_url=detail.cover_url,
        description=detail.description,
        status=detail.status,
        genres=detail.genres,
        authors=detail.authors,
        provider=detail.provider,
        url=detail.url,
        chapters=[
            ChapterOut(
                id=c.id,
                title=c.title,
                number=c.number,
                url=c.url,
                published_at=c.published_at,
            )
            for c in detail.chapters
        ],
    )

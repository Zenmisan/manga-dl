"""
OmegaScans provider — ported from omega-dl.
Uses the OmegaScans internal API.
"""
import httpx
import asyncio
from app.providers.base import Provider, MangaResult, MangaDetail, ChapterResult, HealthReport, ProviderHealth

API = "https://api.omegascans.org"
SITE = "https://omegascans.org"


class OmegaScansProvider(Provider):
    id = "omegascans"
    name = "Omega Scans"
    base_url = SITE
    fingerprints = []  # API-based

    async def validate(self) -> HealthReport:
        try:
            client = await self._get_client()
            resp = await client.get(f"{API}/query?adult=true&page=1&perPage=1", timeout=15.0)
            resp.raise_for_status()
            data = resp.json()
            if "data" in data:
                report = HealthReport(status=ProviderHealth.OK, message="API reachable")
            else:
                report = HealthReport(status=ProviderHealth.DEGRADED, message="Unexpected API response shape")
        except Exception as exc:
            report = HealthReport(status=ProviderHealth.BROKEN, message=str(exc))

        self._health = report.status
        self._health_report = report
        return report

    async def search(self, query: str, page: int = 1) -> list[MangaResult]:
        client = await self._get_client()
        resp = await client.get(f"{API}/query", params={
            "adult": "true",
            "query_string": query,
            "page": page,
            "perPage": 20,
        })
        resp.raise_for_status()
        data = resp.json().get("data", [])

        return [self._to_result(item) for item in data if item.get("series_type") == "Comic"]

    async def get_manga(self, manga_id: str) -> MangaDetail:
        client = await self._get_client()

        # manga_id here is the series slug
        resp = await client.get(f"{API}/series/{manga_id}")
        resp.raise_for_status()
        series = resp.json()

        chapters = await self._fetch_chapters(series.get("id"), manga_id)
        return self._to_detail(series, chapters)

    async def get_pages(self, chapter_id: str) -> list[str]:
        # chapter_id format: "{series_slug}/{chapter_slug}"
        series_slug, chapter_slug = chapter_id.split("/", 1)
        client = await self._get_client()
        resp = await client.get(f"{API}/chapter/{series_slug}/{chapter_slug}")
        resp.raise_for_status()
        data = resp.json()

        try:
            return data["chapter"]["chapter_data"]["images"]
        except (KeyError, TypeError):
            return []

    async def _fetch_chapters(self, series_id: str, series_slug: str) -> list[ChapterResult]:
        client = await self._get_client()
        resp = await client.get(f"{API}/chapter/query", params={
            "page": 1,
            "perPage": 1999,
            "series_id": series_id,
        })
        resp.raise_for_status()
        items = resp.json().get("data", [])

        chapters = []
        for item in items:
            slug = item.get("chapter_slug") or item.get("slug", "")
            name = item.get("chapter_name") or item.get("name", slug)
            try:
                num = float(slug.replace("chapter-", ""))
            except ValueError:
                num = 0.0
            chapters.append(ChapterResult(
                id=f"{series_slug}/{slug}",
                title=name,
                number=num,
                url=f"{SITE}/series/{series_slug}/{slug}",
                published_at=item.get("created_at"),
            ))
        return chapters

    def _to_result(self, item: dict) -> MangaResult:
        slug = item.get("series_slug") or item.get("slug", "")
        return MangaResult(
            id=slug,
            title=item.get("title") or item.get("name", "Unknown"),
            cover_url=item.get("thumbnail"),
            provider=self.id,
            url=f"{SITE}/series/{slug}",
            status=item.get("status"),
        )

    def _to_detail(self, data: dict, chapters: list[ChapterResult]) -> MangaDetail:
        slug = data.get("series_slug") or data.get("slug", "")
        return MangaDetail(
            id=slug,
            title=data.get("title") or data.get("name", "Unknown"),
            cover_url=data.get("thumbnail"),
            description=data.get("description") or data.get("summary"),
            status=data.get("status"),
            genres=[g.get("name", "") for g in data.get("genres", [])],
            authors=[a.get("name", "") for a in data.get("authors", [])],
            provider=self.id,
            url=f"{SITE}/series/{slug}",
            chapters=chapters,
        )

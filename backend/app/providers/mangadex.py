"""
MangaDex provider — uses the official public API.
Docs: https://api.mangadex.org/docs/
"""
import asyncio
from app.providers.base import Provider, MangaResult, MangaDetail, ChapterResult, HealthReport, ProviderHealth, ScraperFingerprint


API = "https://api.mangadex.org"
CDN = "https://uploads.mangadex.org"


class MangaDexProvider(Provider):
    id = "mangadex"
    name = "MangaDex"
    base_url = "https://mangadex.org"
    fingerprints = []  # API-based, no HTML fingerprints

    async def validate(self) -> HealthReport:
        """Ping the MangaDex API health endpoint."""
        try:
            client = await self._get_client()
            resp = await client.get(f"{API}/ping", timeout=10.0)
            if resp.text.strip() == "pong":
                report = HealthReport(status=ProviderHealth.OK, message="API reachable")
            else:
                report = HealthReport(status=ProviderHealth.DEGRADED, message=f"Unexpected ping response: {resp.text[:50]}")
        except Exception as exc:
            report = HealthReport(status=ProviderHealth.BROKEN, message=str(exc))

        self._health = report.status
        self._health_report = report
        return report

    async def search(self, query: str, page: int = 1) -> list[MangaResult]:
        client = await self._get_client()
        offset = (page - 1) * 20
        resp = await client.get(f"{API}/manga", params={
            "title": query,
            "limit": 20,
            "offset": offset,
            "includes[]": ["cover_art"],
            "availableTranslatedLanguage[]": ["en"],
            "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"],
        })
        resp.raise_for_status()
        data = resp.json()

        results = []
        for item in data.get("data", []):
            results.append(self._to_manga_result(item))
        return results

    async def get_manga(self, manga_id: str) -> MangaDetail:
        client = await self._get_client()

        manga_resp = await client.get(f"{API}/manga/{manga_id}", params={
            "includes[]": ["cover_art", "author", "artist"],
        })
        manga_resp.raise_for_status()
        manga_data = manga_resp.json()["data"]

        chapters = await self._fetch_all_chapters(manga_id)

        return self._to_manga_detail(manga_data, chapters)

    async def get_popular(self, page: int = 1) -> list[MangaResult]:
        client = await self._get_client()
        offset = (page - 1) * 20
        resp = await client.get(f"{API}/manga", params={
            "limit": 20,
            "offset": offset,
            "includes[]": ["cover_art"],
            "availableTranslatedLanguage[]": ["en"],
            "contentRating[]": ["safe", "suggestive"],
            "order[followedCount]": "desc",
        })
        resp.raise_for_status()
        return [self._to_manga_result(item) for item in resp.json().get("data", [])]

    async def get_latest(self, page: int = 1) -> list[MangaResult]:
        client = await self._get_client()
        offset = (page - 1) * 20
        resp = await client.get(f"{API}/manga", params={
            "limit": 20,
            "offset": offset,
            "includes[]": ["cover_art"],
            "availableTranslatedLanguage[]": ["en"],
            "contentRating[]": ["safe", "suggestive"],
            "order[latestUploadedChapter]": "desc",
        })
        resp.raise_for_status()
        return [self._to_manga_result(item) for item in resp.json().get("data", [])]

    async def get_pages(self, chapter_id: str) -> list[str]:
        client = await self._get_client()
        resp = await client.get(f"{API}/at-home/server/{chapter_id}")
        resp.raise_for_status()
        data = resp.json()

        base = data["baseUrl"]
        chapter = data["chapter"]
        hash_ = chapter["hash"]
        return [f"{base}/data/{hash_}/{f}" for f in chapter["data"]]

    async def _fetch_all_chapters(self, manga_id: str) -> list[ChapterResult]:
        client = await self._get_client()
        chapters = []
        offset = 0
        limit = 500

        while True:
            resp = await client.get(f"{API}/manga/{manga_id}/feed", params={
                "limit": limit,
                "offset": offset,
                "translatedLanguage[]": ["en"],
                "order[chapter]": "asc",
                "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"],
            })
            resp.raise_for_status()
            data = resp.json()
            items = data.get("data", [])
            for item in items:
                attr = item["attributes"]
                try:
                    num = float(attr.get("chapter") or 0)
                except (ValueError, TypeError):
                    num = 0.0
                chapters.append(ChapterResult(
                    id=item["id"],
                    title=attr.get("title") or f"Chapter {attr.get('chapter', '')}",
                    number=num,
                    url=f"https://mangadex.org/chapter/{item['id']}",
                    published_at=attr.get("publishAt"),
                ))
            if len(items) < limit:
                break
            offset += limit
            await asyncio.sleep(0.5)

        return chapters

    def _cover_url(self, manga_data: dict) -> str | None:
        for rel in manga_data.get("relationships", []):
            if rel["type"] == "cover_art":
                filename = rel.get("attributes", {}).get("fileName")
                if filename:
                    return f"{CDN}/covers/{manga_data['id']}/{filename}"
        return None

    def _to_manga_result(self, item: dict) -> MangaResult:
        attr = item["attributes"]
        title = (attr.get("title") or {}).get("en") or next(iter((attr.get("title") or {}).values()), "Unknown")
        status = attr.get("status")
        cover = self._cover_url(item)
        return MangaResult(
            id=item["id"],
            title=title,
            cover_url=cover,
            provider=self.id,
            url=f"https://mangadex.org/title/{item['id']}",
            status=status,
        )

    def _to_manga_detail(self, data: dict, chapters: list[ChapterResult]) -> MangaDetail:
        attr = data["attributes"]
        title = (attr.get("title") or {}).get("en") or next(iter((attr.get("title") or {}).values()), "Unknown")
        desc = (attr.get("description") or {}).get("en", "")
        genres = [t["attributes"]["name"].get("en", "") for t in attr.get("tags", []) if t.get("attributes")]
        authors = [
            r.get("attributes", {}).get("name", "")
            for r in data.get("relationships", [])
            if r["type"] in ("author", "artist") and r.get("attributes")
        ]
        return MangaDetail(
            id=data["id"],
            title=title,
            cover_url=self._cover_url(data),
            description=desc,
            status=attr.get("status"),
            genres=genres,
            authors=list(dict.fromkeys(authors)),
            provider=self.id,
            url=f"https://mangadex.org/title/{data['id']}",
            chapters=chapters,
        )

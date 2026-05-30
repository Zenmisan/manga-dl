"""
Asura Scans provider — HTML scraping.
Note: Asura has migrated to asuracomic.net and uses Next.js SSR.
Fingerprints are validated before each scraping session.
"""
import re
import json
import asyncio
from bs4 import BeautifulSoup
from app.providers.base import (
    Provider, MangaResult, MangaDetail, ChapterResult,
    HealthReport, ProviderHealth, ScraperFingerprint,
)

SITE = "https://asuracomic.net"

_FINGERPRINTS = [
    ScraperFingerprint(name=".grid.grid-cols-2", critical=True),     # manga grid on browse page
    ScraperFingerprint(name=".flex.flex-col.gap-2", critical=False),  # chapter list
]


class AsuraScansProvider(Provider):
    id = "asurascans"
    name = "Asura Scans"
    base_url = SITE
    fingerprints = _FINGERPRINTS

    async def validate(self) -> HealthReport:
        from bs4 import BeautifulSoup

        failures: list[str] = []
        critical_failure = False

        try:
            client = await self._get_client()
            resp = await client.get(f"{SITE}/series", params={"name": "solo leveling"})
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Check for manga grid
            if not soup.select_one(".grid"):
                failures.append(".grid (manga grid)")
                critical_failure = True

        except Exception as exc:
            report = HealthReport(status=ProviderHealth.BROKEN, failures=["network_error"], message=str(exc))
            self._health = ProviderHealth.BROKEN
            self._health_report = report
            return report

        status = ProviderHealth.BROKEN if critical_failure else (ProviderHealth.DEGRADED if failures else ProviderHealth.OK)
        report = HealthReport(
            status=status,
            failures=failures,
            message=f"{len(failures)} selector(s) missing" if failures else "All checks passed",
        )
        self._health = status
        self._health_report = report
        return report

    async def search(self, query: str, page: int = 1) -> list[MangaResult]:
        client = await self._get_client()
        resp = await client.get(f"{SITE}/series", params={
            "name": query,
            "page": page,
        })
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []
        # Asura uses Next.js; manga cards are typically <a> tags in a grid
        for card in soup.select("a[href*='/series/']"):
            href = card.get("href", "")
            if not href or href == "/series":
                continue
            slug = href.rstrip("/").split("/")[-1]
            if not slug or slug == "series":
                continue

            img = card.select_one("img")
            title_el = card.select_one("span, h3, .font-bold")
            title = title_el.get_text(strip=True) if title_el else slug

            # Avoid duplicates
            if any(r.id == slug for r in results):
                continue

            results.append(MangaResult(
                id=slug,
                title=title,
                cover_url=img["src"] if img else None,
                provider=self.id,
                url=f"{SITE}/series/{slug}",
                status=self._parse_status(card),
            ))
        return results

    async def get_manga(self, manga_id: str) -> MangaDetail:
        client = await self._get_client()
        resp = await client.get(f"{SITE}/series/{manga_id}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        title_el = soup.select_one("span.text-xl.font-bold") or soup.select_one("h1")
        title = title_el.get_text(strip=True) if title_el else manga_id

        img = soup.select_one("img[alt]")
        cover = img["src"] if img else None

        desc_el = soup.select_one("span.font-medium.text-sm") or soup.select_one(".summary")
        desc = desc_el.get_text(strip=True) if desc_el else None

        status = None
        for el in soup.select("div.flex"):
            text = el.get_text(strip=True).lower()
            if "ongoing" in text:
                status = "ongoing"
                break
            if "completed" in text or "hiatus" in text:
                status = "completed" if "completed" in text else "hiatus"
                break

        genres = [a.get_text(strip=True) for a in soup.select("a[href*='/genre/']")]
        authors = [a.get_text(strip=True) for a in soup.select("a[href*='/author/']")]

        chapters = self._parse_chapters(soup, manga_id)

        return MangaDetail(
            id=manga_id,
            title=title,
            cover_url=cover,
            description=desc,
            status=status,
            genres=genres,
            authors=authors,
            provider=self.id,
            url=f"{SITE}/series/{manga_id}",
            chapters=chapters,
        )

    async def get_pages(self, chapter_id: str) -> list[str]:
        # chapter_id format: "{manga_slug}/chapter/{num}" or a full chapter URL path
        client = await self._get_client()
        resp = await client.get(f"{SITE}/series/{chapter_id}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Asura embeds images as <img> with data-src or src
        imgs = soup.select("div#readerarea img")
        if imgs:
            return [img.get("src") or img.get("data-src") for img in imgs
                    if (img.get("src") or img.get("data-src"))]

        # Fallback: look in __NEXT_DATA__ JSON embedded in the page
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data and next_data.string:
            try:
                data = json.loads(next_data.string)
                pages = self._extract_pages_from_next_data(data)
                if pages:
                    return pages
            except (json.JSONDecodeError, KeyError):
                pass

        return []

    def _parse_status(self, card) -> str | None:
        text = card.get_text(strip=True).lower()
        if "ongoing" in text:
            return "ongoing"
        if "completed" in text:
            return "completed"
        if "hiatus" in text:
            return "hiatus"
        return None

    def _parse_chapters(self, soup: BeautifulSoup, manga_id: str) -> list[ChapterResult]:
        chapters = []
        for a in soup.select("a[href*='/chapter/']"):
            href = a.get("href", "")
            if not href:
                continue

            # Extract slug from href like /series/manga-name/chapter/123
            parts = href.rstrip("/").split("/")
            if len(parts) < 2:
                continue

            chapter_part = "/".join(parts[parts.index("chapter"):]) if "chapter" in parts else parts[-1]
            slug = f"{manga_id}/{chapter_part}"

            num_match = re.search(r"[\d.]+", chapter_part)
            num = float(num_match.group()) if num_match else 0.0

            title_el = a.select_one("span, p")
            title = title_el.get_text(strip=True) if title_el else f"Chapter {num}"

            if any(c.id == slug for c in chapters):
                continue

            chapters.append(ChapterResult(
                id=slug,
                title=title,
                number=num,
                url=f"{SITE}/series/{slug}",
            ))

        # Sort descending by chapter number (latest first)
        chapters.sort(key=lambda c: c.number, reverse=True)
        return chapters

    def _extract_pages_from_next_data(self, data: dict) -> list[str]:
        try:
            props = data["props"]["pageProps"]
            chapter = props.get("chapter") or props.get("data", {}).get("chapter", {})
            images = chapter.get("content", []) or chapter.get("images", [])
            if isinstance(images, list) and images:
                if isinstance(images[0], str):
                    return images
                if isinstance(images[0], dict):
                    return [img.get("url") or img.get("src") for img in images if img.get("url") or img.get("src")]
        except (KeyError, TypeError, IndexError):
            pass
        return []

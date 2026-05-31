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

SITE = "https://asurascans.com"

_FINGERPRINTS = [
    ScraperFingerprint(name="a[href*='/comics/']", critical=True),     # manga links
    ScraperFingerprint(name="a[href*='/chapter/']", critical=False),  # chapter links
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
            # Try to hit the browse page
            resp = await client.get(f"{SITE}/browse")
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Check for manga links
            if not soup.select("a[href*='/comics/']"):
                failures.append("a[href*='/comics/'] (manga links)")
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
        # Asura Scans search is robust on /browse?q=
        url = f"{SITE}/browse"
        resp = await client.get(url, params={"q": query})
        
        # Handle direct redirects if they happen (e.g. searching exact title)
        if "/comics/" in str(resp.url) and resp.url != url:
            soup = BeautifulSoup(resp.text, "html.parser")
            slug = str(resp.url).rstrip("/").split("/")[-1]
            title_el = soup.select_one("h1") or soup.select_one("span.text-xl.font-bold")
            img = soup.select_one("img[alt='poster']") or soup.select_one("img")
            return [MangaResult(
                id=slug,
                title=title_el.get_text(strip=True) if title_el else slug,
                cover_url=img.get("src") if img else None,
                provider=self.id,
                url=str(resp.url),
            )]

        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []
        # Asura uses Astro; manga cards are often <a> tags containing /comics/ in href
        for card in soup.select("a[href*='/comics/']"):
            href = card.get("href", "")
            if not href or href == "/comics" or "/chapter/" in href:
                continue
            
            # Slug is the full part after /comics/
            slug = href.split("/comics/")[-1].strip("/")
            if not slug or any(x in slug for x in ["genres", "authors", "status"]):
                continue

            # In search results, there's often an img and a title
            img = card.select_one("img")
            title_el = card.select_one("span.font-bold, h3, .text-sm.font-bold, p.font-bold")
            title = title_el.get_text(strip=True) if title_el else slug.split("-")[0].replace("-", " ").title()

            if any(r.id == slug for r in results):
                continue

            results.append(MangaResult(
                id=slug,
                title=title,
                cover_url=img.get("src") if img else None,
                provider=self.id,
                url=f"{SITE}/comics/{slug}",
                status=self._parse_status(card),
            ))
        
        return results

    async def get_manga(self, manga_id: str) -> MangaDetail:
        client = await self._get_client()
        # manga_id should be the full slug like "solo-leveling-7b57f74d"
        resp = await client.get(f"{SITE}/comics/{manga_id}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        title_el = soup.select_one("h1") or soup.select_one("span.text-xl.font-bold")
        title = title_el.get_text(strip=True) if title_el else manga_id

        img = soup.select_one("img[alt='poster']") or soup.select_one("img.object-cover") or soup.select_one("img")
        cover = img.get("src") if img else None

        desc_el = soup.select_one("span.font-medium.text-sm") or soup.select_one(".summary") or soup.select_one("p.text-sm")
        desc = desc_el.get_text(strip=True) if desc_el else None

        status = None
        for el in soup.select("div.flex, span.flex"):
            text = el.get_text(strip=True).lower()
            if "ongoing" in text:
                status = "ongoing"
                break
            elif "completed" in text:
                status = "completed"
                break

        genres = [a.get_text(strip=True) for a in soup.select("a[href*='/genres/']")]
        authors = []

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
            url=f"{SITE}/comics/{manga_id}",
            chapters=chapters,
        )

    async def get_pages(self, chapter_id: str) -> list[str]:
        # chapter_id format: "{manga_slug}/chapter/{num}"
        client = await self._get_client()
        resp = await client.get(f"{SITE}/comics/{chapter_id}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Asura embeds images in the new Astro layout
        # Look for images in the reader area
        imgs = soup.select("img[alt*='chapter']") or soup.select("img.object-contain") or soup.select("div.flex.flex-col img")
        if imgs:
            return [img.get("src") for img in imgs if img.get("src") and "http" in img.get("src")]

        return []

    def _parse_status(self, card) -> str | None:
        text = card.get_text(strip=True).lower()
        if "ongoing" in text:
            return "ongoing"
        if "completed" in text:
            return "completed"
        return None

    def _parse_chapters(self, soup: BeautifulSoup, manga_id: str) -> list[ChapterResult]:
        chapters = []
        # Chapter links are now often in the format /comics/manga-slug/chapter/num
        for a in soup.select("a[href*='/chapter/']"):
            href = a.get("href", "")
            if not href:
                continue

            # href might be relative or absolute
            if href.startswith("/"):
                href = f"{SITE}{href}"
            
            # Extract chapter part from href
            # Example: https://asurascans.com/comics/solo-leveling-7b57f74d/chapter/180
            if "/chapter/" not in href:
                continue
                
            chapter_slug = href.split("/chapter/")[-1].strip("/")
            full_slug = f"{manga_id}/chapter/{chapter_slug}"

            # Extract number
            num_match = re.search(r"[\d.]+", chapter_slug)
            num = float(num_match.group()) if num_match else 0.0

            title_el = a.select_one("span, p")
            title = title_el.get_text(strip=True) if title_el else f"Chapter {num}"

            if any(c.id == full_slug for c in chapters):
                continue

            chapters.append(ChapterResult(
                id=full_slug,
                title=title,
                number=num,
                url=href,
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

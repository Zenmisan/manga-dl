"""
MangaKatana provider — HTML scraping via BeautifulSoup.
Fingerprints are checked before every scraping session to detect site layout changes.
"""
import re
import json
import asyncio
from bs4 import BeautifulSoup
from app.providers.base import (
    Provider, MangaResult, MangaDetail, ChapterResult,
    HealthReport, ProviderHealth, ScraperFingerprint,
)

SITE = "https://mangakatana.com"

# These selectors are checked on each validate() call.
# If the site updates its layout and these selectors disappear, the provider is flagged.
_FINGERPRINTS = [
    ScraperFingerprint(name=".manga_list-sbs", critical=True),      # search results grid
    ScraperFingerprint(name=".single-header", critical=True),        # manga detail page header (checked separately)
    ScraperFingerprint(name=".chapters", critical=True),             # chapter list
]


class MangaKatanaProvider(Provider):
    id = "mangakatana"
    name = "MangaKatana"
    base_url = SITE
    fingerprints = _FINGERPRINTS

    async def validate(self) -> HealthReport:
        """
        Validate by hitting the search page and a known manga page.
        Checks that key CSS selectors still exist.
        """
        from bs4 import BeautifulSoup

        failures: list[str] = []
        critical_failure = False

        try:
            client = await self._get_client()
            # Check search results page
            resp = await client.get(f"{SITE}/manga", params={"search": "one piece", "search_by": "book_name"})
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            if not soup.select_one(".manga_list-sbs"):
                failures.append(".manga_list-sbs (search results grid)")
                critical_failure = True

            # Check a known stable manga page for chapter list structure
            resp2 = await client.get(f"{SITE}/manga/one-piece")
            if resp2.status_code == 200:
                soup2 = BeautifulSoup(resp2.text, "html.parser")
                if not soup2.select_one(".chapters"):
                    failures.append(".chapters (chapter list)")
                    critical_failure = True
                if not soup2.select_one(".single-header"):
                    failures.append(".single-header (manga detail header)")
                    # not critical — detail still works without this

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
        resp = await client.get(f"{SITE}/page/{page}", params={
            "search": query,
            "search_by": "book_name",
        })
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []
        for item in soup.select(".manga_list-sbs .item"):
            a = item.select_one("h3 a") or item.select_one("a")
            if not a:
                continue
            img = item.select_one("img")
            slug = a["href"].rstrip("/").split("/")[-1]
            results.append(MangaResult(
                id=slug,
                title=a.get_text(strip=True),
                cover_url=img["src"] if img else None,
                provider=self.id,
                url=a["href"],
                status=self._parse_status(item),
            ))
        return results

    async def get_manga(self, manga_id: str) -> MangaDetail:
        client = await self._get_client()
        resp = await client.get(f"{SITE}/manga/{manga_id}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        title_el = soup.select_one("h1.heading")
        title = title_el.get_text(strip=True) if title_el else manga_id

        cover_el = soup.select_one(".cover img")
        cover = cover_el["src"] if cover_el else None

        desc_el = soup.select_one(".summary p") or soup.select_one(".summary")
        desc = desc_el.get_text(strip=True) if desc_el else None

        status = None
        for row in soup.select(".info-list .item"):
            label = row.select_one(".label")
            if label and "status" in label.get_text(strip=True).lower():
                val = row.select_one("span:not(.label)")
                if val:
                    status = val.get_text(strip=True).lower()

        genres = [a.get_text(strip=True) for a in soup.select(".genres a")]
        authors = [a.get_text(strip=True) for a in soup.select(".author a")]

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
            url=f"{SITE}/manga/{manga_id}",
            chapters=chapters,
        )

    async def get_pages(self, chapter_id: str) -> list[str]:
        # chapter_id format: "{manga_slug}/{chapter_slug}"
        client = await self._get_client()
        resp = await client.get(f"{SITE}/manga/{chapter_id}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # MangaKatana stores image list in a JS variable: var thzq=[...] or similar
        scripts = soup.find_all("script")
        for script in scripts:
            if script.string and ("thzq" in script.string or "var iL" in script.string):
                match = re.search(r'var\s+\w+\s*=\s*(\[.*?\])\s*;', script.string, re.DOTALL)
                if match:
                    try:
                        urls = json.loads(match.group(1))
                        return [u for u in urls if u.startswith("http")]
                    except json.JSONDecodeError:
                        pass

        # Fallback: look for img tags with data-src
        imgs = soup.select(".wrap_warpper img[data-src], .chapter-img img")
        if imgs:
            return [img.get("data-src") or img.get("src") for img in imgs if img.get("data-src") or img.get("src")]

        return []

    def _parse_status(self, item) -> str | None:
        badge = item.select_one(".status") or item.select_one(".chapter-count")
        if badge:
            text = badge.get_text(strip=True).lower()
            if "ongoing" in text:
                return "ongoing"
            if "completed" in text or "complete" in text:
                return "completed"
        return None

    def _parse_chapters(self, soup: BeautifulSoup, manga_id: str) -> list[ChapterResult]:
        chapters = []
        for row in soup.select(".chapters .item"):
            a = row.select_one("a")
            if not a:
                continue
            href = a["href"]
            slug = href.rstrip("/").split("/")[-1]
            title = a.get_text(strip=True)

            # Extract chapter number from slug like "c001" or "chapter-5"
            num_match = re.search(r"[\d.]+", slug)
            num = float(num_match.group()) if num_match else 0.0

            date_el = row.select_one(".update_time") or row.select_one("time")
            published = date_el.get_text(strip=True) if date_el else None

            chapters.append(ChapterResult(
                id=f"{manga_id}/{slug}",
                title=title,
                number=num,
                url=href,
                published_at=published,
            ))
        return chapters

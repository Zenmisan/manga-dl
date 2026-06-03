"""
MangaKatana provider — HTML scraping via BeautifulSoup.
Fingerprints are checked before every scraping session to detect site layout changes.
"""
import re
import json
import asyncio
from bs4 import BeautifulSoup  # pyright: ignore[reportMissingImports]
from app.providers.base import (
    Provider, MangaResult, MangaDetail, ChapterResult,
    HealthReport, ProviderHealth, ScraperFingerprint,
)

SITE = "https://mangakatana.com"

# These selectors are checked on each validate() call.
_FINGERPRINTS = [
    ScraperFingerprint(name=".manga-list, .manga_list-sbs", critical=True), # search results grid
    ScraperFingerprint(name=".chapters, #chapters", critical=True),       # chapter list
]


class MangaKatanaProvider(Provider):
    id = "mangakatana"
    name = "MangaKatana"
    base_url = SITE
    fingerprints = _FINGERPRINTS

    async def validate(self) -> HealthReport:
        """
        Validate by hitting the search page and a known manga page.
        """
        failures: list[str] = []
        critical_failure = False

        try:
            client = await self._get_client()
            # Check search results page - use a generic search
            resp = await client.get(SITE, params={"search": "one", "search_by": "m_name"})
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            if not soup.select_one(".manga-list, .manga_list-sbs, .item"):
                failures.append("manga-list (search results)")
                # only critical if no fallback works
                if not soup.select(".item"):
                    critical_failure = True

            # Check a known stable manga page
            resp2 = await client.get(f"{SITE}/manga/one-piece.49")
            if resp2.status_code == 200:
                soup2 = BeautifulSoup(resp2.text, "html.parser")
                if not soup2.select_one(".chapters, #chapters, .chapter"):
                    failures.append("chapters (chapter list)")
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
        # Search is on the root URL or /manga
        # Based on user feedback: https://mangakatana.com/?search=onepiece&search_by=m_name
        url = f"{SITE}/page/{page}" if page > 1 else SITE
        resp = await client.get(url, params={
            "search": query,
            "search_by": "m_name",
        })
        
        # If the site redirects directly to a manga page (e.g. searching "one piece" might redirect to /manga/one-piece.49)
        if "/manga/" in str(resp.url) and resp.url != url:
            # We are on a detail page, extract info from here
            soup = BeautifulSoup(resp.text, "html.parser")
            slug = str(resp.url).rstrip("/").split("/")[-1]
            title_el = soup.select_one("h1.heading")
            img = soup.select_one(".cover img")
            return [MangaResult(
                id=slug,
                title=title_el.get_text(strip=True) if title_el else slug,
                cover_url=img.get("src") or img.get("data-src") if img else None,
                provider=self.id,
                url=str(resp.url),
            )]

        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []
        # Search results are usually in a div with .manga_list-sbs or just .item
        items = soup.select(".manga_list-sbs .item") or soup.select(".item")
        for item in items:
            a = item.select_one("h3 a") or item.select_one(".title a") or item.select_one("a")
            if not a or "/manga/" not in a["href"]:
                continue
            
            img = item.select_one("img")
            href = a["href"]
            slug = href.rstrip("/").split("/")[-1]
            
            if any(r.id == slug for r in results):
                continue

            results.append(MangaResult(
                id=slug,
                title=a.get_text(strip=True),
                cover_url=img.get("src") or img.get("data-src") if img else None,
                provider=self.id,
                url=href,
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
        # Multiple arrays might exist (for different servers). We pick the longest one.
        import ast
        scripts = soup.find_all("script")
        all_url_lists = []
        
        for script in scripts:
            if script.string:
                # Look for patterns like var \w+ = ['...', '...']
                matches = re.findall(r'var\s+\w+\s*=\s*(\[.*?\])\s*;', script.string, re.DOTALL)
                for content in matches:
                    try:
                        # Convert JS-style array with single quotes to Python list
                        urls = ast.literal_eval(content)
                        if isinstance(urls, list) and urls and isinstance(urls[0], str) and "http" in urls[0]:
                            all_url_lists.append(urls)
                    except (ValueError, SyntaxError):
                        pass

        if all_url_lists:
            # Return the longest list of URLs found
            return max(all_url_lists, key=len)

        # Fallback: look for img tags
        imgs = soup.select(".wrap_warpper img[data-src], .chapter-img img, #img_list img")
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
        # MangaKatana uses a table inside .chapters
        for row in soup.select(".chapters tr"):
            a = row.select_one("a")
            if not a:
                continue
            href = a["href"]
            slug = href.rstrip("/").split("/")[-1]
            title = a.get_text(strip=True)

            # Extract chapter number from slug like "c001" or "chapter-5"
            num_match = re.search(r"[\d.]+", slug)
            num = float(num_match.group()) if num_match else 0.0

            date_el = row.select_one(".update_time") or row.select_one("time") or row.select_one("td:last-child")
            published = date_el.get_text(strip=True) if date_el else None

            chapters.append(ChapterResult(
                id=f"{manga_id}/{slug}",
                title=title,
                number=num,
                url=href,
                published_at=published,
            ))
        return chapters

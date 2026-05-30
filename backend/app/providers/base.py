from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
import httpx
import asyncio
import logging

log = logging.getLogger(__name__)


class ProviderHealth(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"  # some fingerprints missing
    BROKEN = "broken"      # critical fingerprints missing
    UNCHECKED = "unchecked"


@dataclass
class ScraperFingerprint:
    """A CSS selector or JSON key that must exist for the scraper to work."""
    name: str
    critical: bool = True  # if False, failure → DEGRADED; if True → BROKEN


@dataclass
class HealthReport:
    status: ProviderHealth
    failures: list[str] = field(default_factory=list)
    message: str = ""


@dataclass
class MangaResult:
    id: str
    title: str
    cover_url: str | None
    provider: str
    url: str
    status: str | None = None
    description: str | None = None


@dataclass
class ChapterResult:
    id: str
    title: str
    number: float
    url: str
    published_at: str | None = None


@dataclass
class MangaDetail:
    id: str
    title: str
    cover_url: str | None
    description: str | None
    status: str | None
    genres: list[str]
    authors: list[str]
    provider: str
    url: str
    chapters: list[ChapterResult] = field(default_factory=list)


class Provider(ABC):
    id: str
    name: str
    base_url: str
    # HTML-based scrapers define fingerprints; API-based providers leave this empty.
    fingerprints: list[ScraperFingerprint] = []

    def __init__(self):
        self._client: httpx.AsyncClient | None = None
        self._health: ProviderHealth = ProviderHealth.UNCHECKED
        self._health_report: HealthReport | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers=self._default_headers(),
                follow_redirects=True,
                timeout=30.0,
            )
        return self._client

    def _default_headers(self) -> dict[str, str]:
        return {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        }

    async def close(self):
        if self._client and not self._client.closed:
            await self._client.close()

    # ── Scraper validation ────────────────────────────────────────────────────

    async def validate(self) -> HealthReport:
        """
        Validate that the site structure still matches expectations.
        API-based providers override this to check endpoint availability.
        HTML-based providers rely on CSS fingerprints defined in `fingerprints`.
        """
        if not self.fingerprints:
            # No fingerprints defined → assume healthy (API provider)
            report = HealthReport(status=ProviderHealth.OK, message="API provider, no fingerprints")
            self._health = ProviderHealth.OK
            self._health_report = report
            return report

        return await self._check_fingerprints()

    async def _check_fingerprints(self) -> HealthReport:
        """Fetch the provider home page and validate CSS selectors."""
        from bs4 import BeautifulSoup

        failures: list[str] = []
        critical_failure = False

        try:
            client = await self._get_client()
            resp = await client.get(self.base_url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            report = HealthReport(
                status=ProviderHealth.BROKEN,
                failures=["homepage_unreachable"],
                message=str(exc),
            )
            self._health = ProviderHealth.BROKEN
            self._health_report = report
            return report

        for fp in self.fingerprints:
            if not soup.select_one(fp.name):
                failures.append(fp.name)
                if fp.critical:
                    critical_failure = True

        if critical_failure:
            status = ProviderHealth.BROKEN
        elif failures:
            status = ProviderHealth.DEGRADED
        else:
            status = ProviderHealth.OK

        report = HealthReport(
            status=status,
            failures=failures,
            message=f"{len(failures)} fingerprint(s) missing" if failures else "All checks passed",
        )
        self._health = status
        self._health_report = report
        return report

    @property
    def health(self) -> ProviderHealth:
        return self._health

    @property
    def health_report(self) -> HealthReport | None:
        return self._health_report

    # ── Abstract provider interface ────────────────────────────────────────────

    @abstractmethod
    async def search(self, query: str, page: int = 1) -> list[MangaResult]:
        """Search for manga by title."""

    @abstractmethod
    async def get_manga(self, manga_id: str) -> MangaDetail:
        """Get full manga details including chapter list."""

    @abstractmethod
    async def get_pages(self, chapter_id: str) -> list[str]:
        """Return ordered list of image URLs for a chapter."""

    # ── Registry ─────────────────────────────────────────────────────────────

    @classmethod
    def info(cls) -> dict[str, Any]:
        return {
            "id": cls.id,
            "name": cls.name,
            "base_url": cls.base_url,
        }
,
            "base_url": cls.base_url,
        }

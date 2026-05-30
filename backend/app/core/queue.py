"""
Async download queue with WebSocket broadcast for real-time progress.
"""
import asyncio
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Callable, Awaitable

from app.config import get_settings
from app.core.downloader import download_chapter_to_cbz

log = logging.getLogger(__name__)
settings = get_settings()

# Active WebSocket connections waiting for progress events
_ws_listeners: set[Callable[[dict], Awaitable[None]]] = set()

# download_id → task info
_active: dict[str, dict] = {}


def register_ws_listener(callback: Callable[[dict], Awaitable[None]]):
    _ws_listeners.add(callback)


def unregister_ws_listener(callback: Callable[[dict], Awaitable[None]]):
    _ws_listeners.discard(callback)


async def _broadcast(event: dict):
    dead = set()
    for cb in _ws_listeners:
        try:
            await cb(event)
        except Exception:
            dead.add(cb)
    for cb in dead:
        _ws_listeners.discard(cb)


class DownloadQueue:
    def __init__(self, max_concurrent: int = 3):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._running = False

    async def start(self):
        self._running = True
        asyncio.create_task(self._worker())

    async def stop(self):
        self._running = False

    async def enqueue(
        self,
        *,
        db_session_factory,
        provider_id: str,
        manga_id: str,
        manga_title: str,
        chapter_id: str,
        chapter_title: str,
        chapter_number: float,
        page_urls: list[str],
    ) -> str:
        download_id = str(uuid.uuid4())
        _active[download_id] = {
            "id": download_id,
            "provider": provider_id,
            "manga_id": manga_id,
            "manga_title": manga_title,
            "chapter_id": chapter_id,
            "chapter_title": chapter_title,
            "chapter_number": chapter_number,
            "status": "queued",
            "progress": 0,
            "total_pages": len(page_urls),
            "downloaded_pages": 0,
            "error": None,
            "created_at": datetime.utcnow().isoformat(),
        }

        await _broadcast({"type": "queued", "download": _active[download_id]})

        await self._queue.put({
            "download_id": download_id,
            "db_session_factory": db_session_factory,
            "provider_id": provider_id,
            "manga_id": manga_id,
            "manga_title": manga_title,
            "chapter_id": chapter_id,
            "chapter_title": chapter_title,
            "chapter_number": chapter_number,
            "page_urls": page_urls,
        })

        return download_id

    async def _worker(self):
        while self._running:
            try:
                job = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            async with self._semaphore:
                asyncio.create_task(self._run_job(job))

    async def _run_job(self, job: dict):
        download_id = job["download_id"]
        info = _active[download_id]

        async def on_progress(downloaded: int, total: int):
            info["downloaded_pages"] = downloaded
            info["total_pages"] = total
            info["progress"] = int((downloaded / total) * 100) if total else 0
            info["status"] = "downloading"
            await _broadcast({"type": "progress", "download": dict(info)})

        info["status"] = "downloading"
        await _broadcast({"type": "started", "download": dict(info)})

        try:
            cbz_path = await download_chapter_to_cbz(
                provider_id=job["provider_id"],
                manga_title=job["manga_title"],
                chapter_title=job["chapter_title"],
                chapter_number=job["chapter_number"],
                page_urls=job["page_urls"],
                library_path=Path(settings.LIBRARY_PATH),
                cache_path=Path(settings.CACHE_PATH),
                on_progress=on_progress,
            )

            info["status"] = "done"
            info["progress"] = 100
            info["output_path"] = str(cbz_path)

            # Persist to DB
            async with job["db_session_factory"]() as db:
                from app.models.download import DownloadRecord
                record = DownloadRecord(
                    id=download_id,
                    manga_id=f"{job['provider_id']}:{job['manga_id']}",
                    chapter_id=job["chapter_id"],
                    provider=job["provider_id"],
                    manga_title=job["manga_title"],
                    chapter_title=job["chapter_title"],
                    chapter_number=job["chapter_number"],
                    status="done",
                    progress=100,
                    total_pages=info["total_pages"],
                    downloaded_pages=info["total_pages"],
                    output_path=str(cbz_path),
                    completed_at=datetime.utcnow(),
                )
                db.add(record)
                await db.commit()

        except Exception as exc:
            log.error("Download failed for %s: %s", download_id, exc)
            info["status"] = "failed"
            info["error"] = str(exc)

        await _broadcast({"type": "completed", "download": dict(info)})

    def list_active(self) -> list[dict]:
        return list(_active.values())

    def get(self, download_id: str) -> dict | None:
        return _active.get(download_id)


# Singleton queue instance
download_queue = DownloadQueue(max_concurrent=settings.MAX_CONCURRENT_DOWNLOADS)

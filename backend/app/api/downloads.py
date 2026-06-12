from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.providers import get_provider
from app.core.queue import download_queue, register_ws_listener, unregister_ws_listener
from app.database import get_db, AsyncSessionLocal
from app.models.download import DownloadRecord
from sqlalchemy import delete

router = APIRouter(prefix="/downloads", tags=["downloads"])


class DownloadRequest(BaseModel):
    provider_id: str
    manga_id: str
    chapter_id: str


@router.post("/queue")
async def queue_download(req: DownloadRequest):
    """Queue a chapter for download. Fetches page URLs then enqueues."""
    provider = get_provider(req.provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider '{req.provider_id}' not found")

    # Fetch the manga detail to get titles (needed for file naming)
    try:
        manga = await provider.get_manga(req.manga_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch manga info: {exc}")

    # Find the chapter
    chapter = next((c for c in manga.chapters if c.id == req.chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Fetch page URLs
    try:
        pages = await provider.get_pages(req.chapter_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch chapter pages: {exc}")

    if not pages:
        raise HTTPException(status_code=422, detail="No pages found — chapter may be paywalled or unavailable")

    download_id = await download_queue.enqueue(
        db_session_factory=AsyncSessionLocal,
        provider_id=req.provider_id,
        manga_id=req.manga_id,
        manga_title=manga.title,
        chapter_id=req.chapter_id,
        chapter_title=chapter.title,
        chapter_number=chapter.number,
        page_urls=pages,
    )

    return {"download_id": download_id, "total_pages": len(pages)}


@router.post("/pause")
async def pause_downloads():
    """Pause all queued downloads. In-progress downloads finish first."""
    download_queue.pause()
    return {"paused": True}


@router.post("/resume")
async def resume_downloads():
    """Resume the download queue."""
    download_queue.resume()
    return {"paused": False}


@router.get("/queue-status")
async def queue_status():
    """Get current queue pause state."""
    return {"paused": download_queue.is_paused}


@router.post("/cancel/{download_id}")
async def cancel_download(download_id: str):
    """Cancel a queued or in-progress download."""
    cancelled = await download_queue.cancel(download_id, AsyncSessionLocal)
    if not cancelled:
        raise HTTPException(status_code=404, detail="Download not found in active queue")
    return {"cancelled": True}


@router.post("/retry/{download_id}")
async def retry_download(download_id: str, db: AsyncSession = Depends(get_db)):
    """Re-queue a failed download using its stored metadata."""
    result = await db.execute(
        select(DownloadRecord).where(DownloadRecord.id == download_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Download record not found")

    provider = get_provider(record.provider)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider '{record.provider}' not found")

    try:
        pages = await provider.get_pages(record.chapter_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch pages: {exc}")

    if not pages:
        raise HTTPException(status_code=422, detail="No pages found")

    new_id = await download_queue.enqueue(
        db_session_factory=AsyncSessionLocal,
        provider_id=record.provider,
        manga_id=record.manga_id,
        manga_title=record.manga_title,
        chapter_id=record.chapter_id,
        chapter_title=record.chapter_title,
        chapter_number=record.chapter_number,
        page_urls=pages,
    )
    return {"download_id": new_id, "total_pages": len(pages)}


@router.delete("/history")
async def clear_history(db: AsyncSession = Depends(get_db)):
    """Delete all completed/failed download records."""
    await db.execute(
        delete(DownloadRecord).where(DownloadRecord.status.in_(["done", "failed"]))
    )
    await db.commit()
    return {"cleared": True}


@router.get("/active")
async def list_active_downloads():
    """List all currently active/queued downloads."""
    return download_queue.list_active()


@router.get("/history")
async def download_history(db: AsyncSession = Depends(get_db)):
    """List completed download history from DB."""
    result = await db.execute(
        select(DownloadRecord).order_by(DownloadRecord.created_at.desc()).limit(100)
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "manga_title": r.manga_title,
            "chapter_title": r.chapter_title,
            "chapter_number": r.chapter_number,
            "provider": r.provider,
            "status": r.status,
            "output_path": r.output_path,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in records
    ]


@router.websocket("/ws")
async def download_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time download progress.
    Broadcasts events: {type: "queued"|"started"|"progress"|"completed", download: {...}}
    """
    await websocket.accept()

    async def send_event(event: dict):
        await websocket.send_json(event)

    register_ws_listener(send_event)

    # Send current state immediately on connect
    await websocket.send_json({"type": "state", "downloads": download_queue.list_active()})

    try:
        while True:
            # Keep connection alive; client sends pings
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        unregister_ws_listener(send_event)

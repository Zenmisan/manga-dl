"""
Device session management for the 3-device-limit account system.
Supabase Auth handles authentication; this API manages device registration
and enforces the max-3-devices rule.
"""
import hashlib
import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.device import UserDevice
from app.models.reading_progress import ReadingProgress
from app.core.supabase_auth import get_current_user

log = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])

MAX_DEVICES = 3


class DeviceRegisterRequest(BaseModel):
    device_name: str = "Unknown Device"


class ForfeitDeviceRequest(BaseModel):
    forfeit_device_id: str
    new_device_name: str = "Unknown Device"


def _fingerprint(request: Request, user_id: str) -> str:
    ua = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else "unknown"
    raw = f"{user_id}:{ua}:{ip}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


@router.post("/device/register")
async def register_device(
    body: DeviceRegisterRequest,
    request: Request,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register this device for the current user. Enforces 3-device limit."""
    fingerprint = _fingerprint(request, user_id)

    # Check if this device is already registered
    result = await db.execute(
        select(UserDevice).where(
            UserDevice.user_id == user_id,
            UserDevice.device_fingerprint == fingerprint,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Check if locked
        if existing.locked_until and existing.locked_until > datetime.utcnow():
            remaining = (existing.locked_until - datetime.utcnow()).days + 1
            raise HTTPException(
                status_code=403,
                detail=f"This device is locked for {remaining} more day(s). It was forfeited to allow login on another device.",
            )
        # Update last_active
        existing.last_active = datetime.utcnow()
        existing.locked_until = None
        return {"status": "ok", "device_id": existing.id, "existing": True}

    # Count active devices
    active_result = await db.execute(
        select(UserDevice).where(UserDevice.user_id == user_id)
    )
    all_devices = active_result.scalars().all()
    active_devices = [d for d in all_devices if not d.locked_until or d.locked_until <= datetime.utcnow()]

    if len(active_devices) >= MAX_DEVICES:
        # Return device list so frontend can ask which to forfeit
        raise HTTPException(
            status_code=409,
            detail={
                "code": "device_limit_reached",
                "message": f"Maximum {MAX_DEVICES} devices allowed. Choose one to forfeit.",
                "devices": [
                    {
                        "id": d.id,
                        "name": d.device_name,
                        "last_active": d.last_active.isoformat() if d.last_active else None,
                    }
                    for d in active_devices
                ],
            },
        )

    # Register new device
    device = UserDevice(
        id=str(uuid.uuid4()),
        user_id=user_id,
        device_fingerprint=fingerprint,
        device_name=body.device_name,
    )
    db.add(device)
    return {"status": "ok", "device_id": device.id, "existing": False}


@router.post("/device/forfeit")
async def forfeit_device(
    body: ForfeitDeviceRequest,
    request: Request,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Forfeit an existing device so a new one can be registered. Locks forfeited device for 30 days."""
    # Lock the forfeited device
    result = await db.execute(
        select(UserDevice).where(
            UserDevice.id == body.forfeit_device_id,
            UserDevice.user_id == user_id,
        )
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Device not found.")

    target.locked_until = datetime.utcnow() + timedelta(days=30)

    # Register the new device
    fingerprint = _fingerprint(request, user_id)
    device = UserDevice(
        id=str(uuid.uuid4()),
        user_id=user_id,
        device_fingerprint=fingerprint,
        device_name=body.new_device_name,
    )
    db.add(device)
    return {"status": "ok", "device_id": device.id, "forfeited_until": target.locked_until.isoformat()}


class ReadingProgressUpsert(BaseModel):
    provider: str
    manga_id: str
    chapter_id: str
    last_page: int
    manga_title: str | None = None
    chapter_title: str | None = None


@router.put("/reading-progress")
async def upsert_reading_progress(
    body: ReadingProgressUpsert,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user_id,
            ReadingProgress.provider == body.provider,
            ReadingProgress.manga_id == body.manga_id,
            ReadingProgress.chapter_id == body.chapter_id,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.last_page = body.last_page
        record.updated_at = datetime.utcnow()
        if body.manga_title:
            record.manga_title = body.manga_title
        if body.chapter_title:
            record.chapter_title = body.chapter_title
    else:
        record = ReadingProgress(
            user_id=user_id,
            provider=body.provider,
            manga_id=body.manga_id,
            chapter_id=body.chapter_id,
            last_page=body.last_page,
            manga_title=body.manga_title,
            chapter_title=body.chapter_title,
        )
        db.add(record)
    await db.commit()
    return {"status": "ok", "last_page": body.last_page}


@router.get("/history")
async def get_reading_history(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, le=500),
):
    result = await db.execute(
        select(ReadingProgress)
        .where(ReadingProgress.user_id == user_id)
        .order_by(ReadingProgress.updated_at.desc())
        .limit(limit)
    )
    records = result.scalars().all()
    return [
        {
            "provider": r.provider,
            "manga_id": r.manga_id,
            "chapter_id": r.chapter_id,
            "manga_title": r.manga_title or r.manga_id,
            "chapter_title": r.chapter_title or r.chapter_id,
            "last_page": r.last_page,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in records
    ]


@router.delete("/history")
async def clear_reading_history(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(ReadingProgress).where(ReadingProgress.user_id == user_id)
    )
    await db.commit()
    return {"cleared": True}


@router.get("/reading-progress/{provider}/{manga_id:path}")
async def get_reading_progress(
    provider: str,
    manga_id: str,
    chapter_id: str = Query(...),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user_id,
            ReadingProgress.provider == provider,
            ReadingProgress.manga_id == manga_id,
            ReadingProgress.chapter_id == chapter_id,
        )
    )
    record = result.scalar_one_or_none()
    return {"last_page": record.last_page if record else 1}


@router.get("/devices")
async def list_devices(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all devices for the current user."""
    result = await db.execute(select(UserDevice).where(UserDevice.user_id == user_id))
    devices = result.scalars().all()
    return [
        {
            "id": d.id,
            "name": d.device_name,
            "last_active": d.last_active.isoformat() if d.last_active else None,
            "locked_until": d.locked_until.isoformat() if d.locked_until else None,
        }
        for d in devices
    ]

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
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.device import UserDevice
from app.models.reading_progress import ReadingProgress
from app.models.manga import MangaRecord
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


@router.delete("/history/{provider}/{manga_id:path}")
async def clear_manga_history(
    provider: str,
    manga_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(ReadingProgress).where(
            ReadingProgress.user_id == user_id,
            ReadingProgress.provider == provider,
            ReadingProgress.manga_id == manga_id,
        )
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


# ── Manga Overrides ──────────────────────────────────────────────────────────

class MangaOverrideUpsert(BaseModel):
    provider: str
    manga_id: str
    title: str | None = None
    cover_url: str | None = None
    description: str | None = None

@router.put("/manga-overrides")
async def upsert_manga_override(
    body: MangaOverrideUpsert,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MangaOverride).where(
            MangaOverride.user_id == user_id,
            MangaOverride.provider == body.provider,
            MangaOverride.manga_id == body.manga_id,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.title = body.title
        record.cover_url = body.cover_url
        record.description = body.description
        record.updated_at = datetime.utcnow()
    else:
        record = MangaOverride(
            user_id=user_id,
            provider=body.provider,
            manga_id=body.manga_id,
            title=body.title,
            cover_url=body.cover_url,
            description=body.description,
        )
        db.add(record)
    await db.commit()
    return {"status": "ok"}

@router.get("/manga-overrides")
async def get_all_manga_overrides(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all overrides for the user (useful for initial sync)."""
    result = await db.execute(
        select(MangaOverride).where(MangaOverride.user_id == user_id)
    )
    records = result.scalars().all()
    return [
        {
            "provider": r.provider,
            "manga_id": r.manga_id,
            "title": r.title,
            "cover_url": r.cover_url,
            "description": r.description,
        }
        for r in records
    ]

@router.get("/me/stats")
async def get_my_reading_stats(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate reading statistics based on ReadingProgress."""
    total_chapters = (await db.execute(
        select(func.count(ReadingProgress.chapter_id)).where(ReadingProgress.user_id == user_id)
    )).scalar() or 0

    total_manga = (await db.execute(
        select(func.count(distinct(ReadingProgress.manga_id))).where(ReadingProgress.user_id == user_id)
    )).scalar() or 0

    total_pages = (await db.execute(
        select(func.sum(ReadingProgress.last_page)).where(ReadingProgress.user_id == user_id)
    )).scalar() or 0

    # Reads per day — last 30 days
    cutoff_30 = datetime.utcnow() - timedelta(days=30)
    daily_rows = (await db.execute(
        select(
            func.date(ReadingProgress.updated_at).label("day"),
            func.count(ReadingProgress.chapter_id).label("count"),
        )
        .where(ReadingProgress.user_id == user_id)
        .where(ReadingProgress.updated_at >= cutoff_30)
        .group_by(func.date(ReadingProgress.updated_at))
        .order_by(func.date(ReadingProgress.updated_at))
    )).all()
    daily_reads = [{"day": str(r.day), "count": r.count} for r in daily_rows]

    # Reads per day — last 365 days (for heatmap)
    cutoff_365 = datetime.utcnow() - timedelta(days=365)
    yearly_rows = (await db.execute(
        select(
            func.date(ReadingProgress.updated_at).label("day"),
            func.count(ReadingProgress.chapter_id).label("count"),
        )
        .where(ReadingProgress.user_id == user_id)
        .where(ReadingProgress.updated_at >= cutoff_365)
        .group_by(func.date(ReadingProgress.updated_at))
        .order_by(func.date(ReadingProgress.updated_at))
    )).all()
    yearly_reads = [{"day": str(r.day), "count": r.count} for r in yearly_rows]

    # Provider breakdown
    provider_rows = (await db.execute(
        select(ReadingProgress.provider, func.count(ReadingProgress.chapter_id).label("count"))
        .where(ReadingProgress.user_id == user_id)
        .group_by(ReadingProgress.provider)
        .order_by(func.count(ReadingProgress.chapter_id).desc())
    )).all()
    provider_breakdown = [{"provider": r.provider, "count": r.count} for r in provider_rows]

    # Reading streak
    active_days = {str(r.day) for r in yearly_rows}
    streak = 0
    check = datetime.utcnow().date()
    while str(check) in active_days:
        streak += 1
        check = check - timedelta(days=1)

    return {
        "total_chapters": total_chapters,
        "total_manga": total_manga,
        "total_pages": total_pages,
        "storage_bytes": 0, # Downloads track storage, reads don't
        "daily_reads": daily_reads,
        "yearly_reads": yearly_reads,
        "provider_breakdown": provider_breakdown,
        "streak_days": streak,
    }


# ── Public profile (no auth) ──────────────────────────────────────────────────

@router.get("/profile/{user_id}")
async def get_public_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return publicly shareable reading stats for a user."""
    chapters_read = await db.scalar(
        select(func.count()).select_from(ReadingProgress).where(ReadingProgress.user_id == user_id)
    ) or 0

    manga_result = await db.execute(
        select(ReadingProgress.manga_id, ReadingProgress.provider, ReadingProgress.manga_title)
        .where(ReadingProgress.user_id == user_id)
        .distinct()
    )
    manga_rows = manga_result.all()
    manga_count = len(manga_rows)

    # Recent activity (last 10 chapters read)
    recent_result = await db.execute(
        select(ReadingProgress)
        .where(ReadingProgress.user_id == user_id)
        .order_by(ReadingProgress.updated_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()

    # Reading streak (days with at least 1 chapter)
    streak_result = await db.execute(
        select(func.date(ReadingProgress.updated_at))
        .where(ReadingProgress.user_id == user_id)
        .distinct()
        .order_by(func.date(ReadingProgress.updated_at).desc())
    )
    streak_days_raw = [row[0] for row in streak_result.all()]
    streak = 0
    if streak_days_raw:
        today = datetime.utcnow().date()
        prev = today
        for d in streak_days_raw:
            day = d if isinstance(d, type(today)) else datetime.fromisoformat(str(d)).date()
            if (prev - day).days <= 1:
                streak += 1
                prev = day
            else:
                break

    return {
        "user_id": user_id,
        "chapters_read": chapters_read,
        "manga_count": manga_count,
        "streak_days": streak,
        "recent_activity": [
            {
                "manga_title": r.manga_title or r.manga_id,
                "chapter_title": r.chapter_title or r.chapter_id,
                "provider": r.provider,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in recent
        ],
    }


@router.get("/me/profile-slug")
async def get_or_create_profile_slug(
    user_id: str = Depends(get_current_user),
):
    """Return the shareable profile URL for the current user."""
    return {"url": f"/profile/{user_id}"}

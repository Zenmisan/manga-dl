import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, distinct, or_

from app.models.reading_progress import ReadingProgress
from app.models.manga_override import MangaOverride
from app.models.profiles import UserProfile

log = logging.getLogger(__name__)


async def upsert_user_reading_progress(
    user_id: str,
    provider: str,
    manga_id: str,
    chapter_id: str,
    last_page: int,
    manga_title: str | None,
    chapter_title: str | None,
    db: AsyncSession,
) -> dict:
    """Save or update reading progress for a user."""
    result = await db.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user_id,
            ReadingProgress.provider == provider,
            ReadingProgress.manga_id == manga_id,
            ReadingProgress.chapter_id == chapter_id,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.last_page = last_page
        record.updated_at = datetime.utcnow()
        if manga_title:
            record.manga_title = manga_title
        if chapter_title:
            record.chapter_title = chapter_title
    else:
        record = ReadingProgress(
            user_id=user_id,
            provider=provider,
            manga_id=manga_id,
            chapter_id=chapter_id,
            last_page=last_page,
            manga_title=manga_title,
            chapter_title=chapter_title,
        )
        db.add(record)
    await db.commit()
    return {"status": "ok", "last_page": last_page}


async def fetch_user_reading_history(user_id: str, limit: int, db: AsyncSession) -> list[dict]:
    """Fetch reading history records for a user."""
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


async def clear_user_history(user_id: str, provider: str | None, manga_id: str | None, db: AsyncSession) -> dict:
    """Clear reading history for all manga or a specific series."""
    query = delete(ReadingProgress).where(ReadingProgress.user_id == user_id)
    if provider and manga_id:
        query = query.where(
            ReadingProgress.provider == provider,
            ReadingProgress.manga_id == manga_id,
        )
    await db.execute(query)
    await db.commit()
    return {"cleared": True}


async def fetch_user_reading_stats(user_id: str, db: AsyncSession) -> dict:
    """Aggregate user-specific reading statistics."""
    total_chapters = (await db.execute(
        select(func.count(ReadingProgress.chapter_id)).where(ReadingProgress.user_id == user_id)
    )).scalar() or 0

    total_manga = (await db.execute(
        select(func.count(distinct(ReadingProgress.manga_id))).where(ReadingProgress.user_id == user_id)
    )).scalar() or 0

    total_pages = (await db.execute(
        select(func.sum(ReadingProgress.last_page)).where(ReadingProgress.user_id == user_id)
    )).scalar() or 0

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

    provider_rows = (await db.execute(
        select(ReadingProgress.provider, func.count(ReadingProgress.chapter_id).label("count"))
        .where(ReadingProgress.user_id == user_id)
        .group_by(ReadingProgress.provider)
        .order_by(func.count(ReadingProgress.chapter_id).desc())
    )).all()
    provider_breakdown = [{"provider": r.provider, "count": r.count} for r in provider_rows]

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
        "storage_bytes": 0,
        "daily_reads": daily_reads,
        "yearly_reads": yearly_reads,
        "daily_downloads": daily_reads,
        "yearly_downloads": yearly_reads,
        "provider_breakdown": provider_breakdown,
        "streak_days": streak,
    }


async def fetch_public_user_profile(identifier: str, db: AsyncSession) -> dict:
    """Fetch publicly shareable profile data by user_id or username."""
    profile = None
    try:
        res = await db.execute(select(UserProfile).where(UserProfile.user_id == identifier))
        profile = res.scalar_one_or_none()
        if not profile:
            res = await db.execute(select(UserProfile).where(func.lower(UserProfile.username) == identifier.lower()))
            profile = res.scalar_one_or_none()
    except Exception as exc:
        log.warning("UserProfile lookup failed (%s)", exc)

    if profile:
        target_user_id = profile.user_id
        username = profile.username
        display_name = profile.display_name or profile.username
        bio = getattr(profile, "bio", None) or ""
        avatar_url = getattr(profile, "avatar_url", None) or ""
    else:
        target_user_id = identifier
        username = identifier if len(identifier) <= 30 and "-" not in identifier else None
        display_name = username or f"Reader #{identifier[:8].upper()}"
        bio = ""
        avatar_url = ""

    user_cond = or_(
        ReadingProgress.user_id == target_user_id,
        ReadingProgress.user_id == identifier,
    ) if target_user_id != identifier else (ReadingProgress.user_id == target_user_id)

    chapters_read = await db.scalar(
        select(func.count()).select_from(ReadingProgress).where(user_cond)
    ) or 0

    manga_result = await db.execute(
        select(ReadingProgress.manga_id, ReadingProgress.provider, ReadingProgress.manga_title)
        .where(user_cond)
        .distinct()
    )
    manga_rows = manga_result.all()
    manga_count = len(manga_rows)

    recent_result = await db.execute(
        select(ReadingProgress)
        .where(user_cond)
        .order_by(ReadingProgress.updated_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()

    streak_result = await db.execute(
        select(func.date(ReadingProgress.updated_at))
        .where(user_cond)
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
        "user_id": target_user_id,
        "username": username,
        "display_name": display_name,
        "bio": bio,
        "avatar_url": avatar_url,
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


async def search_public_profiles(query: str, limit: int, db: AsyncSession) -> list[dict]:
    """Search user profiles by username or display name."""
    clean_q = query.strip().lower()
    if not clean_q:
        return []

    pattern = f"%{clean_q}%"
    try:
        stmt = (
            select(UserProfile)
            .where(
                or_(
                    func.lower(UserProfile.username).like(pattern),
                    func.lower(UserProfile.display_name).like(pattern),
                )
            )
            .limit(limit)
        )
        res = await db.execute(stmt)
        profiles = res.scalars().all()
    except Exception as exc:
        log.warning("search_public_profiles error: %s", exc)
        profiles = []

    results = []
    for p in profiles:
        read_count = await db.scalar(
            select(func.count()).select_from(ReadingProgress).where(
                or_(ReadingProgress.user_id == p.user_id, ReadingProgress.user_id == p.username)
            )
        ) or 0
        manga_cnt = await db.scalar(
            select(func.count(distinct(ReadingProgress.manga_id))).where(
                or_(ReadingProgress.user_id == p.user_id, ReadingProgress.user_id == p.username)
            )
        ) or 0
        results.append({
            "user_id": p.user_id,
            "username": p.username,
            "display_name": p.display_name or p.username,
            "bio": getattr(p, "bio", "") or "",
            "avatar_url": getattr(p, "avatar_url", "") or "",
            "chapters_read": read_count,
            "manga_count": manga_cnt,
        })
    return results

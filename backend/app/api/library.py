import os
import zipfile
import io
import logging
import asyncio
import re
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Response, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct

from app.config import get_settings
from app.database import get_db
from app.models.download import DownloadRecord
from app.models.manga import MangaRecord

log = logging.getLogger(__name__)
router = APIRouter(prefix="/library", tags=["library"])
settings = get_settings()


class LibraryItem(BaseModel):
    title: str
    files: list[str]
    chapters_downloading: int = 0
    chapters_failed: int = 0
    cover_url: str | None = None
    subscribed: bool = False
    total_chapters: int = 0
    provider: str | None = None
    provider_manga_id: str | None = None


def natural_sort_key(s):
    """Sort strings with numbers in a way that humans expect (1, 2, 10 instead of 1, 10, 2)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', str(s))]


@router.get("/", response_model=list[LibraryItem])
async def list_library(db: AsyncSession = Depends(get_db)):
    """Fetch the library from the database. Show all series including in-progress downloads."""
    result = await db.execute(
        select(DownloadRecord)
        .order_by(DownloadRecord.created_at.desc())
    )
    records = result.scalars().all()

    grouped: dict[str, dict] = {}
    for r in records:
        title = r.manga_title
        if title not in grouped:
            grouped[title] = {"files": set(), "downloading": 0, "failed": 0, "cover_url": None, "subscribed": False}

        if r.status == "done" and r.output_path:
            grouped[title]["files"].add(Path(r.output_path).name)
        elif r.status in ("queued", "downloading", "packaging"):
            grouped[title]["downloading"] += 1
        elif r.status == "failed":
            grouped[title]["failed"] += 1

    # Include subscribed manga even if no chapters downloaded yet
    sub_result = await db.execute(select(MangaRecord).where(MangaRecord.subscribed == True))
    for r in sub_result.scalars().all():
        chapter_count = len(r.chapters_json) if isinstance(r.chapters_json, dict) else 0
        if r.title not in grouped:
            grouped[r.title] = {
                "files": set(), "downloading": 0, "failed": 0,
                "cover_url": r.cover_url, "subscribed": True,
                "total_chapters": chapter_count,
                "provider": r.provider, "provider_manga_id": r.provider_manga_id,
            }
        else:
            grouped[r.title]["cover_url"] = r.cover_url
            grouped[r.title]["subscribed"] = True
            grouped[r.title]["total_chapters"] = chapter_count
            grouped[r.title]["provider"] = r.provider
            grouped[r.title]["provider_manga_id"] = r.provider_manga_id

    items = [
        LibraryItem(
            title=title,
            files=sorted(list(data["files"]), key=natural_sort_key),
            chapters_downloading=data["downloading"],
            chapters_failed=data["failed"],
            cover_url=data.get("cover_url"),
            subscribed=data.get("subscribed", False),
            total_chapters=data.get("total_chapters", 0),
            provider=data.get("provider"),
            provider_manga_id=data.get("provider_manga_id"),
        )
        for title, data in grouped.items()
    ]
    return sorted(items, key=lambda x: x.title)


async def _ensure_local_file(manga_title: str, filename: str) -> Path:
    """
    Ensure the file exists locally. If it's only on Supabase, download it to the cache.
    """
    local_path = Path(settings.LIBRARY_PATH) / manga_title / filename
    if local_path.exists():
        return local_path
        
    cache_path = Path(settings.CACHE_PATH) / "library_cache" / manga_title / filename
    if cache_path.exists():
        return cache_path
        
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        from app.core.storage import download_file_to_cache
        remote_path = f"{manga_title}/{filename}"
        try:
            log.info(f"Downloading {remote_path} from Supabase to local cache...")
            await download_file_to_cache(remote_path, cache_path)
            return cache_path
        except Exception as e:
            log.error(f"Failed to fetch from Supabase: {e}")
            raise HTTPException(status_code=404, detail="File not found in cloud storage")
            
    raise HTTPException(status_code=404, detail="File not found locally and cloud storage is not configured")


@router.get("/file/{manga_title}/{filename}")
async def download_file(manga_title: str, filename: str):
    """Serve the raw CBZ file for downloading."""
    file_path = await _ensure_local_file(manga_title, filename)
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.comicbook+zip"
    )


@router.get("/read/{manga_title}/{filename}")
async def get_cbz_manifest(manga_title: str, filename: str, db: AsyncSession = Depends(get_db)):
    """List all image files inside a CBZ and return saved progress."""
    file_path = await _ensure_local_file(manga_title, filename)

    try:
        def _read_zip():
            with zipfile.ZipFile(file_path, 'r') as zf:
                images = [
                    name for name in zf.namelist() 
                    if name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))
                ]
                return sorted(images, key=natural_sort_key)
        
        images = await asyncio.to_thread(_read_zip)
        
        result = await db.execute(
            select(DownloadRecord.last_page_read)
            .where(DownloadRecord.manga_title == manga_title)
            .where(DownloadRecord.chapter_title.like(f"%{filename.split(' Ch.')[-1].replace('.cbz', '')}%"))
            .limit(1)
        )
        last_page = result.scalar_one_or_none() or 0
        
        return {
            "title": manga_title, 
            "filename": filename, 
            "pages": images,
            "last_page": last_page
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CBZ: {e}")

@router.get("/image/{manga_title}/{filename}/{image_name:path}")
async def get_cbz_image(
    manga_title: str, 
    filename: str, 
    image_name: str,
    upscale: bool = Query(False)
):
    """Extract and serve a single image from a CBZ file, with optional upscaling."""
    file_path = await _ensure_local_file(manga_title, filename)

    try:
        def _extract():
            with zipfile.ZipFile(file_path, 'r') as zf:
                if image_name not in zf.namelist():
                    return None
                with zf.open(image_name) as img_file:
                    return img_file.read()

        content = await asyncio.to_thread(_extract)
        if not content:
            raise HTTPException(status_code=404, detail="Image not found in archive")

        # --- Upscaling Foundation ---
        if upscale:
            from app.core.ai import upscale_image
            content = await upscale_image(content)

        ext = Path(image_name).suffix.lower()
        media_type = "image/jpeg"
        if ext == ".png": media_type = "image/png"
        elif ext == ".webp": media_type = "image/webp"
        elif ext == ".gif": media_type = "image/gif"
        
        return Response(content=content, media_type=media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting image: {e}")


@router.get("/pdf/{manga_title}/{filename}")
async def convert_to_pdf(manga_title: str, filename: str):
    """Losslessly convert a CBZ to PDF on the fly and stream it."""
    import img2pdf
    file_path = await _ensure_local_file(manga_title, filename)
    
    def _generate_pdf():
        from PIL import Image
        with zipfile.ZipFile(file_path, 'r') as zf:
            images = sorted([
                name for name in zf.namelist()
                if name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))
            ], key=natural_sort_key)

            image_data = []
            for name in images:
                data = zf.open(name).read()
                if name.lower().endswith('.webp'):
                    buf = io.BytesIO(data)
                    with Image.open(buf) as img:
                        out = io.BytesIO()
                        img.convert('RGB').save(out, format='JPEG', quality=90)
                        data = out.getvalue()
                image_data.append(data)

            pdf_bytes = io.BytesIO()
            img2pdf.convert(image_data, outputstream=pdf_bytes)
            pdf_bytes.seek(0)
            return pdf_bytes

    try:
        pdf_stream = await asyncio.to_thread(_generate_pdf)
        pdf_filename = filename.replace('.cbz', '.pdf')
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=\"{pdf_filename}\""}
        )
    except Exception as e:
        log.error(f"PDF conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")


class ProgressUpdate(BaseModel):
    page: int

@router.post("/progress/{manga_title}/{filename}")
async def update_progress(manga_title: str, filename: str, req: ProgressUpdate, db: AsyncSession = Depends(get_db)):
    """Update reading progress for a specific chapter."""
    result = await db.execute(
        select(DownloadRecord)
        .where(DownloadRecord.manga_title == manga_title)
        .where(DownloadRecord.chapter_title.like(f"%{filename.split(' Ch.')[-1].replace('.cbz', '')}%"))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if record:
        record.last_page_read = req.page
        await db.commit()
        return {"status": "ok", "page": req.page}
    return {"status": "not_found"}


@router.post("/pin/{manga_title}/{filename}")
async def toggle_pin(manga_title: str, filename: str, db: AsyncSession = Depends(get_db)):
    """Toggle the pinned status of a chapter to prevent auto-deletion."""
    result = await db.execute(
        select(DownloadRecord)
        .where(DownloadRecord.manga_title == manga_title)
        .where(DownloadRecord.chapter_title.like(f"%{filename.split(' Ch.')[-1].replace('.cbz', '')}%"))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if record:
        record.pinned = not record.pinned
        await db.commit()
        return {"status": "ok", "pinned": record.pinned}
    return {"status": "not_found"}


@router.post("/upload")
async def upload_manga(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    """Upload a local ZIP/CBZ file to the cloud library."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ('.zip', '.cbz'):
        raise HTTPException(status_code=400, detail=f"Invalid format: {ext}")

    temp_id = str(uuid.uuid4())
    temp_path = Path(settings.CACHE_PATH) / f"upload_{temp_id}_{file.filename}"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = temp_path.stat().st_size
        manga_title = file.filename.replace('.cbz', '').replace('.zip', '')
        if " Ch." in manga_title:
            manga_title = manga_title.split(" Ch.")[0].strip()
            
        remote_path = f"{manga_title}/{file.filename}"
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            from app.core.storage import upload_file, check_and_evict
            await check_and_evict(db, file_size)
            await upload_file(temp_path, remote_path)
            output_path = remote_path
        else:
            dest_path = Path(settings.LIBRARY_PATH) / manga_title / file.filename
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(temp_path, dest_path)
            output_path = str(dest_path)

        record = DownloadRecord(
            id=temp_id,
            manga_id=f"upload:{manga_title.lower().replace(' ', '-')}",
            chapter_id=temp_id,
            provider="upload",
            manga_title=manga_title,
            chapter_title=file.filename.replace('.cbz', '').replace('.zip', ''),
            chapter_number=0.0,
            status="done",
            progress=100,
            file_size_bytes=file_size,
            output_path=output_path,
            completed_at=datetime.utcnow(),
        )
        db.add(record)
        await db.commit()
        return {"status": "ok", "manga": manga_title}
    except Exception as e:
        log.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists(): temp_path.unlink()


@router.get("/stats")
async def get_library_stats(db: AsyncSession = Depends(get_db)):
    """Aggregate reading statistics from the download history."""
    base = select(DownloadRecord).where(DownloadRecord.status == "done")

    total_chapters = (await db.execute(
        select(func.count(DownloadRecord.id)).where(DownloadRecord.status == "done")
    )).scalar() or 0

    total_manga = (await db.execute(
        select(func.count(distinct(DownloadRecord.manga_title))).where(DownloadRecord.status == "done")
    )).scalar() or 0

    total_pages = (await db.execute(
        select(func.sum(DownloadRecord.total_pages)).where(DownloadRecord.status == "done")
    )).scalar() or 0

    storage_bytes = (await db.execute(
        select(func.sum(DownloadRecord.file_size_bytes)).where(DownloadRecord.status == "done")
    )).scalar() or 0

    # Downloads per day — last 30 days
    cutoff_30 = datetime.utcnow() - timedelta(days=30)
    daily_rows = (await db.execute(
        select(
            func.date(DownloadRecord.completed_at).label("day"),
            func.count(DownloadRecord.id).label("count"),
        )
        .where(DownloadRecord.status == "done")
        .where(DownloadRecord.completed_at >= cutoff_30)
        .group_by(func.date(DownloadRecord.completed_at))
        .order_by(func.date(DownloadRecord.completed_at))
    )).all()
    daily_downloads = [{"day": str(r.day), "count": r.count} for r in daily_rows]

    # Downloads per day — last 365 days (for heatmap)
    cutoff_365 = datetime.utcnow() - timedelta(days=365)
    yearly_rows = (await db.execute(
        select(
            func.date(DownloadRecord.completed_at).label("day"),
            func.count(DownloadRecord.id).label("count"),
        )
        .where(DownloadRecord.status == "done")
        .where(DownloadRecord.completed_at >= cutoff_365)
        .group_by(func.date(DownloadRecord.completed_at))
        .order_by(func.date(DownloadRecord.completed_at))
    )).all()
    yearly_downloads = [{"day": str(r.day), "count": r.count} for r in yearly_rows]

    # Provider breakdown
    provider_rows = (await db.execute(
        select(DownloadRecord.provider, func.count(DownloadRecord.id).label("count"))
        .where(DownloadRecord.status == "done")
        .group_by(DownloadRecord.provider)
        .order_by(func.count(DownloadRecord.id).desc())
    )).all()
    provider_breakdown = [{"provider": r.provider, "count": r.count} for r in provider_rows]

    # Reading streak — consecutive days ending today with ≥1 completed download
    active_days = {r.day for r in daily_rows}
    streak = 0
    check = datetime.utcnow().date()
    while check in active_days:
        streak += 1
        check = check - timedelta(days=1)

    return {
        "total_chapters": total_chapters,
        "total_manga": total_manga,
        "total_pages": total_pages,
        "storage_bytes": storage_bytes,
        "daily_downloads": daily_downloads,
        "yearly_downloads": yearly_downloads,
        "provider_breakdown": provider_breakdown,
        "streak_days": streak,
    }


@router.get("/epub/{manga_title}/{filename}")
async def convert_to_epub(manga_title: str, filename: str):
    """Convert a CBZ archive to EPUB3 on the fly and stream it."""
    file_path = await _ensure_local_file(manga_title, filename)

    def _generate_epub() -> io.BytesIO:
        from PIL import Image

        with zipfile.ZipFile(file_path, "r") as cbz:
            images = sorted(
                [n for n in cbz.namelist() if n.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))],
                key=natural_sort_key,
            )

            epub_buf = io.BytesIO()
            with zipfile.ZipFile(epub_buf, "w") as epub:
                # mimetype — must be first and uncompressed
                mi = zipfile.ZipInfo("mimetype")
                mi.compress_type = zipfile.ZIP_STORED
                epub.writestr(mi, "application/epub+zip")

                epub.writestr("META-INF/container.xml", (
                    '<?xml version="1.0"?>'
                    '<container version="1.0" xmlns="urn:oasis:schemas:container">'
                    "<rootfiles>"
                    '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>'
                    "</rootfiles></container>"
                ))

                manifest_items, spine_items, nav_items = [], [], []

                for idx, img_name in enumerate(images):
                    raw = cbz.open(img_name).read()

                    if img_name.lower().endswith(".webp"):
                        buf = io.BytesIO(raw)
                        with Image.open(buf) as img:
                            out = io.BytesIO()
                            img.convert("RGB").save(out, format="JPEG", quality=90)
                            raw = out.getvalue()
                        ext, mime = ".jpg", "image/jpeg"
                    else:
                        ext = os.path.splitext(img_name)[1].lower()
                        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif"}
                        mime = mime_map.get(ext, "image/jpeg")

                    img_id = f"img{idx:04d}"
                    page_id = f"page{idx:04d}"
                    img_rel = f"images/{img_id}{ext}"
                    page_rel = f"pages/{page_id}.xhtml"

                    epub.writestr(f"OEBPS/{img_rel}", raw)
                    epub.writestr(f"OEBPS/{page_rel}", (
                        '<?xml version="1.0" encoding="UTF-8"?>'
                        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">'
                        '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
                        f"<title>Page {idx + 1}</title>"
                        "<style>body{margin:0;padding:0;background:#000;}"
                        "img{display:block;max-width:100%;height:auto;margin:0 auto;}</style>"
                        f"</head><body><img src=\"../{img_rel}\" alt=\"Page {idx + 1}\"/></body></html>"
                    ))

                    manifest_items.append(f'<item id="{img_id}" href="{img_rel}" media-type="{mime}"/>')
                    manifest_items.append(f'<item id="{page_id}" href="{page_rel}" media-type="application/xhtml+xml"/>')
                    spine_items.append(f'<itemref idref="{page_id}"/>')
                    nav_items.append(f'<li><a href="{page_rel}">Page {idx + 1}</a></li>')

                epub.writestr("OEBPS/content.opf", (
                    '<?xml version="1.0" encoding="UTF-8"?>'
                    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">'
                    "<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">"
                    f"<dc:identifier id=\"uid\">{manga_title}</dc:identifier>"
                    f"<dc:title>{manga_title}</dc:title>"
                    "<dc:language>en</dc:language></metadata>"
                    "<manifest>"
                    + "".join(manifest_items)
                    + '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
                    "</manifest><spine>" + "".join(spine_items) + "</spine></package>"
                ))

                epub.writestr("OEBPS/nav.xhtml", (
                    '<?xml version="1.0" encoding="UTF-8"?>'
                    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
                    f"<head><title>{manga_title}</title></head><body>"
                    '<nav epub:type="toc"><ol>' + "".join(nav_items) + "</ol></nav>"
                    "</body></html>"
                ))

            epub_buf.seek(0)
            return epub_buf

    try:
        epub_stream = await asyncio.to_thread(_generate_epub)
        epub_filename = filename.replace(".cbz", ".epub")
        return StreamingResponse(
            epub_stream,
            media_type="application/epub+zip",
            headers={"Content-Disposition": f'attachment; filename="{epub_filename}"'},
        )
    except Exception as e:
        log.error("EPUB conversion failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")

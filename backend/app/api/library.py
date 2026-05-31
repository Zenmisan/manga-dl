import os
import zipfile
import io
import logging
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, Response, Depends, UploadFile, File
import shutil
import uuid
from datetime import datetime
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.database import get_db
from app.models.download import DownloadRecord

log = logging.getLogger(__name__)
router = APIRouter(prefix="/library", tags=["library"])
settings = get_settings()


class LibraryItem(BaseModel):
    title: str
    files: list[str]


@router.get("/", response_model=list[LibraryItem])
async def list_library(db: AsyncSession = Depends(get_db)):
    """Fetch the library from the database to support cloud storage."""
    result = await db.execute(
        select(DownloadRecord)
        .where(DownloadRecord.status == "done")
        .where(DownloadRecord.output_path.isnot(None))
    )
    records = result.scalars().all()
    
    # Group by manga_title
    grouped = {}
    for r in records:
        title = r.manga_title
        filename = Path(r.output_path).name
        
        if title not in grouped:
            grouped[title] = set()
        grouped[title].add(filename)
        
    items = [LibraryItem(title=title, files=sorted(list(files))) for title, files in grouped.items()]
    return sorted(items, key=lambda x: x.title)


async def _ensure_local_file(manga_title: str, filename: str) -> Path:
    """
    Ensure the file exists locally. If it's only on Supabase, download it to the cache.
    """
    # 1. Check if it's already in the permanent local library
    local_path = Path(settings.LIBRARY_PATH) / manga_title / filename
    if local_path.exists():
        return local_path
        
    # 2. Check if we have cached it from Supabase
    cache_path = Path(settings.CACHE_PATH) / "library_cache" / manga_title / filename
    if cache_path.exists():
        return cache_path
        
    # 3. Download from Supabase
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
                return sorted([
                    name for name in zf.namelist() 
                    if name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))
                ])
        
        images = await asyncio.to_thread(_read_zip)
        
        # Also fetch progress
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
async def get_cbz_image(manga_title: str, filename: str, image_name: str):
    """Extract and serve a single image from a CBZ file."""
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
        with zipfile.ZipFile(file_path, 'r') as zf:
            images = sorted([
                name for name in zf.namelist() 
                if name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))
            ])
            image_data = [zf.open(name).read() for name in images]
            
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
    if not file.filename.lower().endswith(('.zip', '.cbz')):
        raise HTTPException(status_code=400, detail="Only .zip or .cbz files are supported")

    # 1. Save to a temporary local file
    temp_id = str(uuid.uuid4())
    temp_path = Path(settings.CACHE_PATH) / f"upload_{temp_id}_{file.filename}"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Extract basic info (Title and Cover)
        manga_title = "Uploaded Manga"
        clean_name = file.filename.replace('.cbz', '').replace('.zip', '')
        if " Ch." in clean_name:
            manga_title = clean_name.split(" Ch.")[0]
        else:
            manga_title = clean_name
            
        file_size = temp_path.stat().st_size
        
        # 3. Upload to Supabase
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

        # 4. Create database record
        record = DownloadRecord(
            id=temp_id,
            manga_id=f"upload:{manga_title.lower().replace(' ', '-')}",
            chapter_id=temp_id,
            provider="upload",
            manga_title=manga_title,
            chapter_title=clean_name,
            chapter_number=0.0,
            status="done",
            progress=100,
            file_size_bytes=file_size,
            output_path=output_path,
            completed_at=datetime.utcnow(),
        )
        db.add(record)
        await db.commit()
        
        return {"status": "ok", "manga": manga_title, "file": file.filename}

    except Exception as e:
        log.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists():
            temp_path.unlink()

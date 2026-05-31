import os
import zipfile
import io
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, Response, Depends
from fastapi.responses import FileResponse
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
        # Handle both local paths (absolute) and Supabase paths (relative: title/file.cbz)
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
    # 1. Check if it's already in the permanent local library (for local deployments)
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
async def get_cbz_manifest(manga_title: str, filename: str):
    """List all image files inside a CBZ."""
    file_path = await _ensure_local_file(manga_title, filename)

    try:
        # Run blocking zip operation in thread
        import asyncio
        def _read_zip():
            with zipfile.ZipFile(file_path, 'r') as zf:
                return sorted([
                    name for name in zf.namelist() 
                    if name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))
                ])
        
        images = await asyncio.to_thread(_read_zip)
        return {"title": manga_title, "filename": filename, "pages": images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CBZ: {e}")


@router.get("/image/{manga_title}/{filename}/{image_name:path}")
async def get_cbz_image(manga_title: str, filename: str, image_name: str):
    """Extract and serve a single image from a CBZ file."""
    file_path = await _ensure_local_file(manga_title, filename)

    try:
        import asyncio
        def _extract():
            with zipfile.ZipFile(file_path, 'r') as zf:
                if image_name not in zf.namelist():
                    return None
                with zf.open(image_name) as img_file:
                    return img_file.read()
                    
        content = await asyncio.to_thread(_extract)
        if not content:
            raise HTTPException(status_code=404, detail="Image not found in archive")
            
        # Determine media type
        ext = Path(image_name).suffix.lower()
        media_type = "image/jpeg"
        if ext == ".png": media_type = "image/png"
        elif ext == ".webp": media_type = "image/webp"
        elif ext == ".gif": media_type = "image/gif"
        
        return Response(content=content, media_type=media_type)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting image: {e}")

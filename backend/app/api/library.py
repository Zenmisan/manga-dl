import os
import zipfile
import io
from pathlib import Path
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(prefix="/library", tags=["library"])
settings = get_settings()


class LibraryItem(BaseModel):
    title: str
    files: list[str]


@router.get("/", response_model=list[LibraryItem])
def list_library():
    """Scan LIBRARY_PATH and return downloaded manga folders."""
    library_path = Path(settings.LIBRARY_PATH)
    if not library_path.exists():
        return []

    items = []
    for item in library_path.iterdir():
        if item.is_dir():
            files = [f.name for f in item.glob("*.cbz")]
            if files:
                items.append(LibraryItem(title=item.name, files=sorted(files)))
    return sorted(items, key=lambda x: x.title)


@router.get("/{manga_title}")
def get_manga_files(manga_title: str):
    """List all CBZ files for a specific manga."""
    path = Path(settings.LIBRARY_PATH) / manga_title
    if not path.exists() or not path.is_dir():
        raise HTTPException(status_code=404, detail="Manga folder not found")
    
    files = sorted([f.name for f in path.glob("*.cbz")])
    return {"title": manga_title, "files": files}


@router.get("/file/{manga_title}/{filename}")
def download_file(manga_title: str, filename: str):
    """Serve the raw CBZ file for downloading."""
    file_path = Path(settings.LIBRARY_PATH) / manga_title / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.comicbook+zip"
    )


@router.get("/read/{manga_title}/{filename}")
def get_cbz_manifest(manga_title: str, filename: str):
    """List all image files inside a CBZ."""
    file_path = Path(settings.LIBRARY_PATH) / manga_title / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            # Filter for common image extensions
            images = sorted([
                name for name in zf.namelist() 
                if name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))
            ])
            return {"title": manga_title, "filename": filename, "pages": images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CBZ: {e}")


@router.get("/image/{manga_title}/{filename}/{image_name:path}")
def get_cbz_image(manga_title: str, filename: str, image_name: str):
    """Extract and serve a single image from a CBZ file."""
    file_path = Path(settings.LIBRARY_PATH) / manga_title / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            if image_name not in zf.namelist():
                raise HTTPException(status_code=404, detail="Image not found in archive")
            
            with zf.open(image_name) as img_file:
                content = img_file.read()
                
                # Determine media type
                ext = Path(image_name).suffix.lower()
                media_type = "image/jpeg"
                if ext == ".png": media_type = "image/png"
                elif ext == ".webp": media_type = "image/webp"
                elif ext == ".gif": media_type = "image/gif"
                
                return Response(content=content, media_type=media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting image: {e}")

import os
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(prefix="/library", tags=["library"])
settings = get_settings()


class LibraryItem(BaseModel):
    title: str
    files: list[str]


@router.get("/", response_model=list[LibraryItem])
def list_library():
    """Scan LIBRARY_PATH and return downloaded CBZ files."""
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

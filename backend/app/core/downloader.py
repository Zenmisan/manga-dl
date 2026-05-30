"""
Downloads chapter images and packages them into CBZ archives.
"""
import asyncio
import httpx
import zipfile
import os
import re
from pathlib import Path
import logging

log = logging.getLogger(__name__)


async def download_image(client: httpx.AsyncClient, url: str, dest: Path, filename: str):
    """Download a single image to dest/filename."""
    dest.mkdir(parents=True, exist_ok=True)
    out = dest / filename
    if out.exists():
        return

    try:
        resp = await client.get(url, timeout=30.0)
        resp.raise_for_status()
        out.write_bytes(resp.content)
    except Exception as exc:
        log.warning("Failed to download %s: %s", url, exc)
        raise


def _safe_filename(s: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", s).strip()


def package_cbz(image_dir: Path, output_path: Path):
    """Zip all images in image_dir into a CBZ at output_path."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    images = sorted(
        [f for f in image_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif")],
        key=lambda f: f.name,
    )
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for img in images:
            zf.write(img, img.name)


async def download_chapter_to_cbz(
    provider_id: str,
    manga_title: str,
    chapter_title: str,
    chapter_number: float,
    page_urls: list[str],
    library_path: Path,
    cache_path: Path,
    on_progress=None,  # async callable(downloaded, total)
) -> Path:
    """
    Download all pages of a chapter and package into a CBZ.
    Returns the path to the CBZ file.
    """
    safe_title = _safe_filename(manga_title)
    vol = "01"  # Single volume by default; extend later for vol tracking
    ch_num = f"{chapter_number:06.1f}".rstrip("0").rstrip(".")
    cbz_name = f"{safe_title} Ch.{ch_num}.cbz"
    cbz_path = library_path / safe_title / cbz_name

    if cbz_path.exists():
        return cbz_path

    tmp_dir = cache_path / "downloads" / provider_id / _safe_filename(f"{manga_title}-ch{chapter_number}")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }

    async with httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0 (compatible; manga-dl/1.0)"},
        follow_redirects=True,
        timeout=30.0,
    ) as client:
        for i, url in enumerate(page_urls, start=1):
            ext = "." + url.split("?")[0].split(".")[-1].lower()
            if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                ext = ".jpg"
            filename = f"{i:04d}{ext}"
            try:
                await download_image(client, url, tmp_dir, filename)
            except Exception:
                pass  # partial downloads are handled gracefully

            if on_progress:
                await on_progress(i, len(page_urls))

            await asyncio.sleep(0.1)  # polite delay between page downloads

    package_cbz(tmp_dir, cbz_path)

    # Clean up temp images
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    return cbz_path

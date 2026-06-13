"""
Downloads chapter images and packages them into CBZ archives.
"""
import asyncio
from curl_cffi.requests import AsyncSession
import zipfile
import os
import re
from pathlib import Path
import logging
from io import BytesIO
from PIL import Image

log = logging.getLogger(__name__)


async def download_image(client: AsyncSession, url: str, dest: Path, filename: str):
    """Download a single image to dest/filename."""
    dest.mkdir(parents=True, exist_ok=True)
    out = dest / filename
    if out.exists():
        return

    try:
        resp = await client.get(url, timeout=30.0)
        # curl_cffi uses status_code
        if resp.status_code != 200:
            log.warning("Failed to download %s: Status %s", url, resp.status_code)
            return

        out.write_bytes(resp.content)
    except Exception as exc:
        log.warning("Failed to download %s: %s", url, exc)
        raise


def _safe_filename(s: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", s).strip()


def build_comic_info_xml(
    manga_title: str = "",
    chapter_title: str = "",
    chapter_number: float = 0,
    page_count: int = 0,
) -> str:
    num_str = f"{chapter_number:g}" if chapter_number else ""
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n'
        f'  <Series>{manga_title}</Series>\n'
        f'  <Title>{chapter_title}</Title>\n'
        f'  <Number>{num_str}</Number>\n'
        f'  <PageCount>{page_count}</PageCount>\n'
        '  <Manga>Yes</Manga>\n'
        '</ComicInfo>\n'
    )


def package_cbz(
    image_dir: Path,
    output_path: Path,
    manga_title: str = "",
    chapter_title: str = "",
    chapter_number: float = 0,
):
    """
    Compress images to WebP to save space and zip them into a CBZ at output_path.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    images = sorted(
        [f for f in image_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif")],
        key=lambda f: f.name,
    )
    if not images:
        log.warning("No images found in %s, skipping CBZ packaging", image_dir)
        return

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Embed ComicInfo.xml for Kavita/Komga/Paperback compatibility
        comic_info = build_comic_info_xml(
            manga_title=manga_title,
            chapter_title=chapter_title,
            chapter_number=chapter_number,
            page_count=len(images),
        )
        zf.writestr("ComicInfo.xml", comic_info.encode("utf-8"))

        for img_path in images:
            try:
                with Image.open(img_path) as img:
                    webp_buffer = BytesIO()
                    img.save(webp_buffer, format="WEBP", quality=75, method=4)
                    new_name = img_path.stem + ".webp"
                    zf.writestr(new_name, webp_buffer.getvalue())
            except Exception as e:
                log.error("Failed to process and compress %s: %s", img_path, e)
                zf.write(img_path, img_path.name)


async def download_chapter_to_cbz(
    provider_id: str,
    manga_title: str,
    chapter_title: str,
    chapter_number: float,
    page_urls: list[str],
    library_path: Path,
    cache_path: Path,
    on_progress=None,  # async callable(downloaded, total)
) -> tuple[Path, int]:
    """
    Download all pages of a chapter, compress them, and package into a CBZ.
    Returns a tuple of (path to the CBZ file, file size in bytes).
    """
    safe_title = _safe_filename(manga_title)
    ch_num = f"{chapter_number:06.1f}".rstrip("0").rstrip(".")
    cbz_name = f"{safe_title} Ch.{ch_num}.cbz"
    cbz_path = library_path / safe_title / cbz_name

    if cbz_path.exists():
        return cbz_path, cbz_path.stat().st_size

    tmp_dir = cache_path / "downloads" / provider_id / _safe_filename(f"{manga_title}-ch{chapter_number}")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    async with AsyncSession(
        impersonate="chrome110",
        allow_redirects=True,
        timeout=60.0,
    ) as client:
        for i, url in enumerate(page_urls, start=1):
            ext = "." + url.split("?")[0].split(".")[-1].lower()
            if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                ext = ".jpg"
            filename = f"{i:04d}{ext}"
            try:
                await download_image(client, url, tmp_dir, filename)
            except Exception as exc:
                log.warning("Failed to download page %d/%d (%s): %s — skipping", i, len(page_urls), url, exc)

            if on_progress:
                await on_progress(i, len(page_urls))

            await asyncio.sleep(0.05)  # polite delay between page downloads

    # Run blocking image compression and zip packaging in a thread
    await asyncio.to_thread(package_cbz, tmp_dir, cbz_path, manga_title, chapter_title, chapter_number)

    # Clean up temp images
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    file_size = cbz_path.stat().st_size if cbz_path.exists() else 0
    return cbz_path, file_size

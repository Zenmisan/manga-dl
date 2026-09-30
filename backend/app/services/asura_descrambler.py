"""Asura Scans tile-shuffle image descrambler.

Asura stores chapter pages as a single image whose tiles have been repositioned.
The `tiles` array maps destination tile index → source tile index.
Given tileCols × tileRows tiles, each tile is tileW × tileH pixels.
We move each tile from its scrambled position back to its original position.
"""
import asyncio
import io
from PIL import Image
from curl_cffi.requests import AsyncSession
from fastapi.responses import StreamingResponse
import logging

log = logging.getLogger(__name__)

_HEADERS = {
    "Referer": "https://asurascans.com/",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


async def descramble_asura_image(url: str, tiles: list[int], tile_cols: int, tile_rows: int) -> StreamingResponse:
    async with AsyncSession(impersonate="chrome110") as session:
        resp = await session.get(url, headers=_HEADERS, timeout=30.0, allow_redirects=True)
        if resp.status_code != 200:
            from fastapi import HTTPException
            raise HTTPException(status_code=resp.status_code, detail=f"Upstream image error: {resp.status_code}")

    src = Image.open(io.BytesIO(resp.content)).convert("RGBA")
    w, h = src.size
    tile_w = w // tile_cols
    tile_h = h // tile_rows

    out = Image.new("RGBA", (tile_w * tile_cols, tile_h * tile_rows))

    for dst_idx, src_idx in enumerate(tiles):
        src_col = src_idx % tile_cols
        src_row = src_idx // tile_cols
        dst_col = dst_idx % tile_cols
        dst_row = dst_idx // tile_cols

        src_box = (src_col * tile_w, src_row * tile_h, (src_col + 1) * tile_w, (src_row + 1) * tile_h)
        dst_pos = (dst_col * tile_w, dst_row * tile_h)

        tile = src.crop(src_box)
        out.paste(tile, dst_pos)

    buf = io.BytesIO()
    out.save(buf, format="WEBP", quality=95)
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/webp", headers={
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
    })

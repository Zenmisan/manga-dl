import logging
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from curl_cffi import requests
from app.core.security import verify_api_key

log = logging.getLogger(__name__)
router = APIRouter(prefix="/sources", tags=["sources"])

KEIYOUSHI_INDEX = "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json"

@router.get("/market")
async def list_market_sources():
    """Fetch and parse Keiyoushi extension index."""
    try:
        # Use curl_cffi for robust fetching
        response = requests.get(KEIYOUSHI_INDEX, impersonate="chrome110")
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch Keiyoushi index")
        
        data = response.json()
        
        # Simplify data for frontend
        sources = []
        for ext in data:
            sources.append({
                "id": ext.get("pkg"),
                "name": ext.get("name"),
                "version": ext.get("version"),
                "lang": ext.get("lang"),
                "icon": f"https://raw.githubusercontent.com/keiyoushi/extensions/repo/icon/{ext.get('pkg')}.png",
                "nsfw": ext.get("nsfw", 0) == 1,
            })
            
        return sources
    except Exception as e:
        log.error(f"Market fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/install/{source_id}")
async def install_source(source_id: str):
    """
    Placeholder for installing a source.
    In Manga OS, this will eventually download a JS plugin.
    """
    return {"status": "success", "message": f"Source {source_id} ready for JS engine transition"}

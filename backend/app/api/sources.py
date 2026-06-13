import re
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from curl_cffi import requests
from app.providers import get_provider
from app.providers.komga import KomgaProvider
from app.providers.suwayomi import SuwayomiProvider

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
                "name": re.sub(r'^Tachiyomi:?\s*', '', ext.get("name", "")),
                "version": ext.get("version"),
                "lang": ext.get("lang"),
                "icon": f"https://raw.githubusercontent.com/keiyoushi/extensions/repo/icon/{ext.get('pkg')}.png",
                "nsfw": ext.get("nsfw", 0) == 1,
            })
            
        return sources
    except Exception as e:
        log.error(f"Market fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class KomgaConfig(BaseModel):
    base_url: str
    username: str = ""
    password: str = ""

class SuwayomiConfig(BaseModel):
    base_url: str

@router.post("/configure/komga")
async def configure_komga(config: KomgaConfig):
    """Configure Komga provider with server URL + credentials."""
    provider = get_provider("komga")
    if not isinstance(provider, KomgaProvider):
        raise HTTPException(500, "Komga provider not registered")
    provider.configure(config.base_url, config.username, config.password)
    return {"status": "ok", "base_url": config.base_url}

@router.post("/configure/suwayomi")
async def configure_suwayomi(config: SuwayomiConfig):
    """Configure Suwayomi provider with server URL."""
    provider = get_provider("suwayomi")
    if not isinstance(provider, SuwayomiProvider):
        raise HTTPException(500, "Suwayomi provider not registered")
    provider.configure(config.base_url)
    return {"status": "ok", "base_url": config.base_url}

@router.get("/code/{pkg_id}")
async def get_extension_code(pkg_id: str):
    """Proxy extension JS code from community repo."""
    try:
        # Keiyoushi structure: extensions/tree/master/lib/pkg_id/src/index.js (or similar)
        # Note: In a real implementation, we'd need to map the pkg_id to the exact JS file URL.
        # For now, we'll proxy a mock-up or the known main index.
        ext_url = f"https://raw.githubusercontent.com/keiyoushi/extensions/repo/sources/{pkg_id}/index.js"
        
        response = requests.get(ext_url, impersonate="chrome110")
        if response.status_code != 200:
            # Fallback for some extensions that might have different paths
            raise HTTPException(status_code=404, detail="Extension code not found")
            
        return {"code": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
MAL (MyAnimeList) OAuth2 PKCE integration.
The frontend generates the code_verifier/challenge and initiates the OAuth redirect.
After MAL redirects back with ?code=..., the frontend sends the code + verifier here
for the actual token exchange (avoids CORS restriction on MAL's token endpoint).
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from curl_cffi.requests import AsyncSession

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token"
MAL_API_BASE = "https://api.myanimelist.net/v2"


class MALTokenRequest(BaseModel):
    client_id: str
    code: str
    code_verifier: str
    redirect_uri: str


class MALTrackRequest(BaseModel):
    access_token: str
    manga_id: int
    status: str = "reading"  # reading | completed | on_hold | dropped | plan_to_read
    chapters_read: int = 0
    score: int = 0  # 0–10
    start_date: str | None = None   # YYYY-MM-DD
    finish_date: str | None = None  # YYYY-MM-DD


class MALSearchRequest(BaseModel):
    access_token: str
    query: str


@router.post("/mal/token")
async def exchange_mal_token(req: MALTokenRequest):
    """Exchange MAL authorization code for access token."""
    async with AsyncSession() as client:
        try:
            resp = await client.post(
                MAL_TOKEN_URL,
                data={
                    "client_id": req.client_id,
                    "code": req.code,
                    "code_verifier": req.code_verifier,
                    "grant_type": "authorization_code",
                    "redirect_uri": req.redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15.0,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"MAL token error: {resp.text}")
            data = resp.json()

            # Fetch user info with the new token
            me_resp = await client.get(
                f"{MAL_API_BASE}/users/@me",
                headers={"Authorization": f"Bearer {data['access_token']}"},
                timeout=10.0,
            )
            username = me_resp.json().get("name", "Unknown") if me_resp.status_code == 200 else "Unknown"

            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in"),
                "username": username,
            }
        except HTTPException:
            raise
        except Exception as e:
            log.error("MAL token exchange failed: %s", e)
            raise HTTPException(status_code=502, detail=f"MAL request failed: {e}")


@router.post("/mal/search")
async def search_mal_manga(req: MALSearchRequest):
    """Search MAL manga to find the MAL ID for a given title."""
    async with AsyncSession() as client:
        try:
            resp = await client.get(
                f"{MAL_API_BASE}/manga",
                params={"q": req.query, "limit": 5, "fields": "id,title,main_picture,num_chapters"},
                headers={"Authorization": f"Bearer {req.access_token}"},
                timeout=10.0,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"MAL search failed: {resp.text}")
            data = resp.json()
            return {
                "results": [
                    {
                        "id": item["node"]["id"],
                        "title": item["node"]["title"],
                        "cover": item["node"].get("main_picture", {}).get("medium"),
                        "chapters": item["node"].get("num_chapters", 0),
                    }
                    for item in data.get("data", [])
                ]
            }
        except HTTPException:
            raise
        except Exception as e:
            log.error("MAL search failed: %s", e)
            raise HTTPException(status_code=502, detail=str(e))


@router.post("/mal/track")
async def update_mal_status(req: MALTrackRequest):
    """Update manga reading status on MAL."""
    async with AsyncSession() as client:
        try:
            resp = await client.patch(
                f"{MAL_API_BASE}/manga/{req.manga_id}/my_list_status",
                data={
                    k: v for k, v in {
                        "status": req.status,
                        "num_chapters_read": req.chapters_read,
                        "score": req.score if req.score else None,
                        "start_date": req.start_date,
                        "finish_date": req.finish_date,
                    }.items() if v is not None
                },
                headers={
                    "Authorization": f"Bearer {req.access_token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout=10.0,
            )
            if resp.status_code not in (200, 201):
                raise HTTPException(status_code=502, detail=f"MAL update failed: {resp.text}")
            return {"status": "ok", "data": resp.json()}
        except HTTPException:
            raise
        except Exception as e:
            log.error("MAL track failed: %s", e)
            raise HTTPException(status_code=502, detail=str(e))

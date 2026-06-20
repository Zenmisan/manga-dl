"""
Validate Supabase JWT tokens sent as Bearer in Authorization header.
Used by the users/devices API to identify the current user.
"""
import logging
import jwt as pyjwt
from fastapi import HTTPException, Request
from app.config import get_settings

log = logging.getLogger(__name__)

async def get_current_user(request: Request) -> str:
    """Extract and verify Supabase JWT, return user_id (sub claim)."""
    settings = get_settings()
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    token = auth[len("Bearer "):]

    if not settings.SUPABASE_JWT_SECRET:
        # Dev mode: decode without verification (never in production)
        try:
            payload = pyjwt.decode(token, options={"verify_signature": False})
            return payload["sub"]
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token.")

    try:
        payload = pyjwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload["sub"]
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except Exception as e:
        log.warning("JWT validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token.")


async def get_current_user_email(request: Request) -> str | None:
    """Extract and verify Supabase JWT, returning user's email if present."""
    settings = get_settings()
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None

    token = auth[len("Bearer "):]

    try:
        if not settings.SUPABASE_JWT_SECRET:
            payload = pyjwt.decode(token, options={"verify_signature": False})
        else:
            payload = pyjwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload.get("email")
    except Exception as e:
        log.warning("JWT email extraction failed: %s", e)
        return None


"""
Validate Supabase JWT tokens sent as Bearer in Authorization header.
Used by the users/devices API to identify the current user.
"""
import logging
import os
import jwt as pyjwt
from fastapi import HTTPException, Request

log = logging.getLogger(__name__)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


async def get_current_user(request: Request) -> str:
    """Extract and verify Supabase JWT, return user_id (sub claim)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    token = auth[len("Bearer "):]

    if not SUPABASE_JWT_SECRET:
        # Dev mode: decode without verification (never in production)
        try:
            payload = pyjwt.decode(token, options={"verify_signature": False})
            return payload["sub"]
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token.")

    try:
        payload = pyjwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload["sub"]
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except Exception as e:
        log.warning("JWT validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token.")

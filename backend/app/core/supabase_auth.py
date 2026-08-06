"""
Validate Supabase JWT tokens sent as Bearer in Authorization header.
Used by the users/devices API to identify the current user.
"""
import base64
import logging
import jwt as pyjwt
from fastapi import HTTPException, Request
from app.config import get_settings

log = logging.getLogger(__name__)

VALID_ALGORITHMS = ["HS256", "HS384", "HS512"]

# Decode the JWT secret once — Supabase dashboard shows it base64-encoded
def _resolve_secret(raw: str) -> bytes | str:
    try:
        return base64.b64decode(raw)
    except Exception:
        return raw


def _decode_unverified(token: str) -> dict:
    return pyjwt.decode(token, options={"verify_signature": False, "verify_aud": False})


async def get_current_user(request: Request) -> str:
    """Return user_id from Supabase JWT or fall back to API-key user.

    Priority:
      1. Valid Supabase JWT Bearer → real user UUID (sub claim)
      2. Valid API key (with or without Bearer) → "local-api-key-user"
      3. 401
    """
    settings = get_settings()
    api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    has_valid_api_key = bool(settings.API_KEY and api_key == settings.API_KEY)

    auth = request.headers.get("Authorization", "")

    # No Bearer token at all — use API key or reject
    if not auth.startswith("Bearer "):
        if has_valid_api_key:
            return "local-api-key-user"
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    token = auth[len("Bearer "):]

    # No JWT secret configured (dev mode) — decode without verification
    if not settings.SUPABASE_JWT_SECRET:
        try:
            payload = _decode_unverified(token)
            return payload["sub"]
        except Exception:
            if has_valid_api_key:
                return "local-api-key-user"
            raise HTTPException(status_code=401, detail="Invalid token.")

    # Verify JWT signature
    secret = _resolve_secret(settings.SUPABASE_JWT_SECRET)
    try:
        payload = pyjwt.decode(token, secret, algorithms=VALID_ALGORITHMS, audience="authenticated")
        return payload["sub"]
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except Exception as e:
        log.warning("JWT verification failed (%s) — trying API key fallback", e)
        # JWT failed but API key is valid → local user (e.g. dev without Supabase)
        if has_valid_api_key:
            return "local-api-key-user"
        raise HTTPException(status_code=401, detail="Invalid token.")


async def get_current_user_email(request: Request) -> str | None:
    """Extract email from Supabase JWT, returns None on any failure."""
    settings = get_settings()
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None

    token = auth[len("Bearer "):]
    try:
        if not settings.SUPABASE_JWT_SECRET:
            payload = _decode_unverified(token)
        else:
            secret = _resolve_secret(settings.SUPABASE_JWT_SECRET)
            try:
                payload = pyjwt.decode(token, secret, algorithms=VALID_ALGORITHMS, audience="authenticated")
            except Exception:
                return None
        return payload.get("email")
    except Exception as e:
        log.warning("JWT email extraction failed: %s", e)
        return None

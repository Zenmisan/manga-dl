"""
Validate Supabase JWT tokens sent as Bearer in Authorization header.
Used by the users/devices API to identify the current user.
"""
import logging
import jwt as pyjwt
from fastapi import HTTPException, Request
from app.config import get_settings

log = logging.getLogger(__name__)

VALID_ALGORITHMS = ["HS256", "HS384", "HS512", "RS256", "ES256"]


def _decode_unverified(token: str) -> dict:
    return pyjwt.decode(token, options={"verify_signature": False, "verify_aud": False})


async def get_current_user(request: Request) -> str:
    """Extract and verify Supabase JWT, return user_id (sub claim).
    Falls back to a stable local user ID when API key auth is used (no JWT)."""
    settings = get_settings()
    api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        if settings.API_KEY and api_key == settings.API_KEY:
            return "local-api-key-user"
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    token = auth[len("Bearer "):]

    if not settings.SUPABASE_JWT_SECRET:
        # Dev mode — no secret configured, skip verification
        try:
            payload = _decode_unverified(token)
            return payload["sub"]
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token.")

    # Secret is set — verify signature; never fall back to unverified
    try:
        payload = pyjwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=VALID_ALGORITHMS,
            audience="authenticated",
        )
        return payload["sub"]
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except pyjwt.InvalidAlgorithmError as e:
        log.error("JWT algorithm rejected (check SUPABASE_JWT_SECRET format): %s", e)
        raise HTTPException(status_code=401, detail="Invalid token algorithm.")
    except Exception as e:
        log.error("JWT verification failed: %s", e)
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
            payload = _decode_unverified(token)
        else:
            try:
                payload = pyjwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=VALID_ALGORITHMS,
                    audience="authenticated",
                )
            except Exception:
                return None
        return payload.get("email")
    except Exception as e:
        log.warning("JWT email extraction failed: %s", e)
        return None

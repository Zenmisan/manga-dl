from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.config import get_settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(api_key_header: str = Security(api_key_header)):
    settings = get_settings()
    if settings.API_KEY is None:
        return True # Auth disabled
    if api_key_header == settings.API_KEY:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Could not validate credentials"
    )

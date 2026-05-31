from fastapi import Security, HTTPException, status, Query
from fastapi.security import APIKeyHeader
from app.config import get_settings
from typing import Annotated

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(
    api_key_header: str = Security(api_key_header),
    api_key_query: Annotated[str | None, Query(alias="api_key")] = None
):
    settings = get_settings()
    if settings.API_KEY is None:
        return True # Auth disabled
        
    # Check header first, then query param
    key = api_key_header or api_key_query
    
    if key == settings.API_KEY:
        return True
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Could not validate credentials"
    )

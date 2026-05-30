from pydantic_settings import BaseSettings
from pathlib import Path
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./manga_dl.db"
    LIBRARY_PATH: str = str(Path.home() / "manga-library")
    CACHE_PATH: str = str(Path.home() / ".manga-dl-cache")
    MAX_CONCURRENT_DOWNLOADS: int = 3
    REQUEST_DELAY: float = 1.0  # seconds between requests to same host
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    API_KEY: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

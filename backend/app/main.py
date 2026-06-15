from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging
import asyncio

from app.config import get_settings
from app.database import init_db
from app.core.queue import download_queue
from app.core.tasks import start_sync_task, stop_sync_task
from app.api import manga, downloads, settings as settings_router, library, sources, auth, users, backup
from app.providers import list_providers
from app.core.security import verify_api_key

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)
_settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await download_queue.start()

    # Run provider validation at startup (non-blocking)
    async def validate_all():
        for p in list_providers():
            try:
                report = await p.validate()
                log.info("Provider %s health: %s", p.id, report.status.value)
            except Exception as exc:
                log.warning("Provider %s validation error: %s", p.id, exc)

    asyncio.create_task(validate_all())
    start_sync_task()

    # Ensure Supabase storage bucket exists (no-op if credentials not set)
    from app.core.storage import ensure_bucket_exists
    asyncio.create_task(ensure_bucket_exists())

    yield

    # Shutdown
    stop_sync_task()
    await download_queue.stop()
    for p in list_providers():
        await p.close()


app = FastAPI(
    title="manga-dl",
    description="A self-hostable manga downloader with support for multiple sources",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "manga-dl API is running",
        "docs": "/docs"
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_deps = [Depends(verify_api_key)]
app.include_router(manga.router, prefix="/api", dependencies=api_deps)
app.include_router(downloads.router, prefix="/api", dependencies=api_deps)
app.include_router(settings_router.router, prefix="/api", dependencies=api_deps)
app.include_router(library.router, prefix="/api", dependencies=api_deps)
app.include_router(sources.router, prefix="/api", dependencies=api_deps)
app.include_router(auth.router, prefix="/api", dependencies=api_deps)
app.include_router(users.router, prefix="/api")  # Uses Supabase JWT auth, not API key
app.include_router(backup.router, prefix="/api")

# Serve built frontend in production
_frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")

import logging
from pathlib import Path
from typing import Optional
from supabase import create_client, Client
from app.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.download import DownloadRecord

log = logging.getLogger(__name__)
settings = get_settings()

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_KEY
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to use cloud storage")
        _supabase_client = create_client(url, key)
    return _supabase_client

async def ensure_bucket_exists():
    """Ensure the target bucket exists on Supabase."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        log.warning("Supabase credentials not configured. Skipping bucket check.")
        return

    client = get_supabase_client()
    try:
        buckets = client.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if settings.SUPABASE_BUCKET not in bucket_names:
            log.info(f"Creating bucket: {settings.SUPABASE_BUCKET}")
            # Create a public bucket so frontend can theoretically stream directly if needed
            client.storage.create_bucket(settings.SUPABASE_BUCKET, options={"public": True})
    except Exception as e:
        log.warning(f"Supabase storage bucket check skipped (connection unavailable): {e}")

async def upload_file(local_path: Path, remote_path: str) -> str:
    """Upload a file to Supabase storage and return its public URL."""
    client = get_supabase_client()
    with open(local_path, "rb") as f:
        # Overwrite if exists
        client.storage.from_(settings.SUPABASE_BUCKET).upload(
            file=f,
            path=remote_path,
            file_options={"cache-control": "3600", "upsert": "true"}
        )
    return client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(remote_path)

async def check_and_evict(db: AsyncSession, new_file_size_bytes: int):
    """
    Check if uploading the new file will exceed the MAX_STORAGE_MB threshold.
    If so, delete the oldest unpinned chapters until there is enough space.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return

    max_bytes = settings.MAX_STORAGE_MB * 1024 * 1024

    # Get current total size of all successfully uploaded files
    result = await db.execute(
        select(func.sum(DownloadRecord.file_size_bytes))
        .where(DownloadRecord.status == "done")
        .where(DownloadRecord.output_path.isnot(None))
    )
    current_size = result.scalar() or 0

    if current_size + new_file_size_bytes <= max_bytes:
        return  # We have enough space

    log.info(f"Storage limit reached ({current_size/1024/1024:.2f}MB). Evicting old chapters...")
    client = get_supabase_client()

    # Find oldest unpinned chapters
    result = await db.execute(
        select(DownloadRecord)
        .where(DownloadRecord.status == "done")
        .where(DownloadRecord.pinned == False)
        .order_by(DownloadRecord.completed_at.asc())
    )
    records_to_evict = result.scalars().all()

    freed_space = 0
    for record in records_to_evict:
        if current_size - freed_space + new_file_size_bytes <= max_bytes:
            break  # We freed enough space

        if record.output_path:
            # Assuming output_path stores the remote path relative to bucket
            try:
                client.storage.from_(settings.SUPABASE_BUCKET).remove([record.output_path])
                freed_space += record.file_size_bytes
                
                # Update DB record to mark it as evicted (status='evicted' or clear path)
                record.status = "evicted"
                record.output_path = None
                log.info(f"Evicted chapter: {record.manga_title} - {record.chapter_title}")
            except Exception as e:
                log.error(f"Failed to delete {record.output_path} from Supabase: {e}")
    
    await db.commit()

async def download_file_to_cache(remote_path: str, local_cache_path: Path):
    """Download a file from Supabase to local ephemeral storage (for reading)."""
    if local_cache_path.exists():
        return  # Already cached

    local_cache_path.parent.mkdir(parents=True, exist_ok=True)
    client = get_supabase_client()
    
    with open(local_cache_path, "wb") as f:
        res = client.storage.from_(settings.SUPABASE_BUCKET).download(remote_path)
        f.write(res)

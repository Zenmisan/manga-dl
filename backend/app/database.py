from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings
import socket

settings = get_settings()

# Render Free Tier doesn't support IPv6, but Supabase resolves to it by default.
# We force IPv4 (AF_INET) for Supabase hosts to avoid "Network is unreachable" errors.
connect_args = {}
if "supabase.co" in settings.DATABASE_URL or "pooler.supabase.com" in settings.DATABASE_URL:
    connect_args["family"] = socket.AF_INET

engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

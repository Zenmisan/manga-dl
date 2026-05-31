from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings
import socket

settings = get_settings()

# Render Free Tier doesn't support IPv6, but Supabase resolves to it by default.
# The Transaction Pooler URL (port 6543) should resolve to IPv4 automatically.
# We set statement_cache_size=0 in connect_args because PgBouncer 
# (used by Supabase Pooler) does not support prepared statements in transaction mode.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"statement_cache_size": 0}
)
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

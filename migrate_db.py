import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    print("Starting migration...")
    async with engine.begin() as conn:
        # Add file_size_bytes
        try:
            await conn.execute(text("ALTER TABLE downloads ADD COLUMN file_size_bytes INTEGER DEFAULT 0"))
            print("Added column: file_size_bytes")
        except Exception as e:
            print(f"Skipping file_size_bytes: {e}")

        # Add pinned
        try:
            await conn.execute(text("ALTER TABLE downloads ADD COLUMN pinned BOOLEAN DEFAULT FALSE"))
            print("Added column: pinned")
        except Exception as e:
            print(f"Skipping pinned: {e}")

        # Add last_page_read
        try:
            await conn.execute(text("ALTER TABLE downloads ADD COLUMN last_page_read INTEGER DEFAULT 0"))
            print("Added column: last_page_read")
        except Exception as e:
            print(f"Skipping last_page_read: {e}")

    print("Migration finished!")

if __name__ == "__main__":
    asyncio.run(migrate())

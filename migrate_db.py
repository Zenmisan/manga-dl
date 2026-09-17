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

        # Add display_name to profiles
        try:
            await conn.execute(text("ALTER TABLE profiles ADD COLUMN display_name VARCHAR"))
            print("Added column: profiles.display_name")
        except Exception as e:
            print(f"Skipping profiles.display_name: {e}")

        # Add liked_comments to profiles
        try:
            await conn.execute(text("ALTER TABLE profiles ADD COLUMN liked_comments JSON DEFAULT '[]'"))
            print("Added column: profiles.liked_comments")
        except Exception as e:
            print(f"Skipping profiles.liked_comments: {e}")

        # Create support_tickets table (SQLAlchemy create_all also handles this at startup)
        for ddl in [
            """CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                name VARCHAR,
                email VARCHAR,
                category VARCHAR NOT NULL DEFAULT 'general',
                message TEXT NOT NULL,
                user_id VARCHAR,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR NOT NULL DEFAULT 'open'
            )""",
        ]:
            try:
                await conn.execute(text(ddl))
                print("Created table: support_tickets")
            except Exception as e:
                print(f"Skipping support_tickets: {e}")

        # Create comments table
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS comments (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL,
                    username VARCHAR NOT NULL,
                    display_name VARCHAR,
                    provider VARCHAR NOT NULL,
                    manga_id VARCHAR NOT NULL,
                    chapter_id VARCHAR,
                    parent_id VARCHAR,
                    body TEXT NOT NULL,
                    likes INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))
            print("Created table: comments")
        except Exception as e:
            print(f"Skipping comments table: {e}")

        # Indexes for comments
        for idx_sql, idx_name in [
            ("CREATE INDEX IF NOT EXISTS ix_comments_user_id ON comments (user_id)", "ix_comments_user_id"),
            ("CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON comments (parent_id)", "ix_comments_parent_id"),
            ("CREATE INDEX IF NOT EXISTS ix_comments_target ON comments (provider, manga_id, chapter_id)", "ix_comments_target"),
        ]:
            try:
                await conn.execute(text(idx_sql))
                print(f"Created index: {idx_name}")
            except Exception as e:
                print(f"Skipping {idx_name}: {e}")

    print("Migration finished!")

if __name__ == "__main__":
    asyncio.run(migrate())

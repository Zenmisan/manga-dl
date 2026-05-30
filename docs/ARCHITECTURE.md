# manga-dl Architecture
**Version 1.0.0** · 2026-05-30 · HADS 1.0.0

---

## AI READING INSTRUCTION
Read `[SPEC]` and `[BUG]` blocks for authoritative facts.
Read `[NOTE]` only if additional context is needed.
`[?]` blocks are unverified.

---

## 1. System Overview
**[SPEC]**
- **Architecture**: Decoupled Client-Server model.
  - **Frontend**: React (TS) SPA served via Vite. Purely stateless; persists auth in LocalStorage.
  - **Backend**: FastAPI (Python) handles business logic, scrapers, and persistent state.
- **Async Core**: Full asynchronous implementation using `asyncio` and `aiosqlite`.
- **Concurrency Control**: Semaphore-based download management to prevent IP bans.
- **Anti-Bot Strategy**: Integrated `curl_cffi` for TLS fingerprinting + CSS fingerprint validation.

**[NOTE]**
Designed for self-hosting. User runs both components locally or via Docker. Backend acts as an orchestration layer between various manga sources and a structured local library.

## 2. Provider System
**[SPEC]**
- **Base Architecture**: All scrapers inherit from `Provider` abstract base class.
- **Provider Types**:
  | Type | Mechanism | Example |
  |------|-----------|---------|
  | **API-Based** | Direct JSON endpoints | MangaDex |
  | **HTML-Based** | BeautifulSoup4 Scraping | Asura, MangaKatana |
- **Anti-Detection**: Uses `curl_cffi` for "Chrome" TLS impersonation to bypass Cloudflare/WAF.
- **Health System**:
  - **Fingerprints**: List of `ScraperFingerprint` objects (CSS selectors).
  - **Validation**: `validate()` runs at startup. If critical selectors are missing, status = `BROKEN`.
- **Session Life**: Singleton `AsyncSession` per provider to maintain persistent connections.

**[NOTE]**
The fingerprint system allows the backend to notify the UI exactly *which* part of a site changed (e.g., "Search results grid missing"). This transforms "it doesn't work" into actionable bug reports. HTML providers often fallback to `__NEXT_DATA__` JSON blocks when DOM parsing fails.

## 3. Download Queue & Concurrency
**[SPEC]**
- **Orchestration**: `asyncio.Queue` (FIFO) coupled with a dedicated background consumer task.
- **Concurrency Limit**: `MAX_CONCURRENT_DOWNLOADS` (Default: 3). Enforced by an asynchronous semaphore.
- **Job States**: `queued` -> `downloading` -> `done` | `failed`.
- **Atomic Operations**:
  - Chapter pages downloaded to `CACHE_PATH/downloads/{id}`.
  - Verification: Archive creation (.cbz) triggered only when page count matches remote provider metadata.
  - Cleanup: Temp directories purged immediately after successful zip.
- **State Sync**: WebSocket broadcast is the authoritative source for real-time UI updates.

**[NOTE]**
Architecture supports granular **Pause/Play** control via task-interruption flags in the active registry. Failed jobs persist their metadata in the DB to allow for retry logic without losing progress on partially downloaded assets.

## 4. Sync Engine
**[SPEC]**
- **Task Lifecycle**: Background process managed by `asyncio.create_task` during application lifespan.
- **Subscription Logic**: Scans `MangaRecord` entries where `subscribed == True`.
- **Delta Detection**: Compares remote chapter lists against existing `DownloadRecord` entries.
- **Error Handling**: Provider failures (403, 502, BROKEN status) trigger an immediate log error; the engine skips to the next subscription to prevent loop hanging.
- **State Update**: Updates the `last_synced` timestamp and `chapters_json` delta in the DB.

**[NOTE]**
The sync interval is not a hard constant and can be triggered on-demand. Instead of forced auto-downloads, the engine is designed to discover new content and present the user with a download option in the dashboard, maintaining manual control over storage usage.

## 5. Storage Strategy
**[SPEC]**
- **Primary Format**: `.cbz` (Standard ZIP container of images). No other formats supported.
- **Hierarchy**:
  ```text
  LIBRARY_PATH/
  └── {Manga_Title}/
      ├── {Manga_Title} Ch.{X}.cbz
      └── {Manga_Title} Ch.{Y}.cbz
  ```
- **Path Sanitation**: Strict regex-based stripping of `[<>:"/\\|?*]` from titles and chapter names for Windows/Linux interoperability.
- **Cache Management**: `CACHE_PATH` used for ephemeral page storage. Individual page files are purged immediately upon successful archive creation.
- **Deduplication Logic**: Filesystem-first check. If a destination file exists, the download is skipped to avoid redundant I/O.
- **Ground Truth**: The local filesystem is the authoritative source for "available" content. The `library/` API scans directories dynamically.

**[NOTE]**
The system prioritizes filesystem integrity over database state. If a file is deleted manually from the disk, the UI will reflect this change on the next library scan, regardless of previous `DownloadRecord` history.

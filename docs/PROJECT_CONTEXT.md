# manga-dl — Full Project Context

Load this file at the start of any new conversation to resume work with full context.
Last updated: 2026-10-08

---

## Ecosystem Overview

manga-dl is a cross-platform manga and light novel reading ecosystem comprising a core web/backend repository and dedicated native client applications:

- **Web Client & Backend Core:** [manga-dl](https://github.com/zenmisan/manga-dl) — React 19 PWA hosted on Firebase (`manga-dl.web.app`) paired with a FastAPI backend on Render. Holds shared JavaScript extensions, sync APIs, and database migrations.
- **Android Native Application:** [manga-dl-android](https://github.com/zenmisan/manga-dl-android) — Native Kotlin and Jetpack Compose mobile app with Room SQLite, OkHttp direct networking, on-device QuickJS scraper execution, and Firebase DataConnect synchronization. (In finishing phases)
- **Windows Native Application:** [manga-dl-windows](https://github.com/zenmisan/manga-dl-windows) — Native WinUI 3 and Windows App SDK desktop app on .NET 10 with a C++20 dynamic library (`MangaDl.Native`) for Direct2D hardware-accelerated image decoding and border cropping. (In finishing phases)
- **Linux Native Application:** [manga-dl-linux](https://github.com/zenmisan/manga-dl-linux) — Native GTK4, libadwaita, and Vala / C client tailored to the GNOME desktop environment with embedded QuickJS and libsoup3.
- **Self-Hosting Stack:** [manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost) — Containerized Docker Compose environment for running the complete backend and web application on personal servers.

*Note on Legacy Hybrid Shells:* Early versions of manga-dl explored hybrid wrappers (Tauri v2 for desktop and Capacitor for Android) within the `frontend` directory. These have been retired in favor of the dedicated native repositories above.

---

## Shared JavaScript Extension Architecture

All manga and novel source scrapers are written in JavaScript and stored in [backend/app/services/extensions/](file:///home/zenmi/Projects/manga-dl/backend/app/services/extensions). These files are executed across all platforms:

1. **Web Platform:** Runs extensions inside sandboxed Web Workers (`frontend/src/lib/extensions.ts`). Because web browsers enforce CORS, outbound network calls are relayed through backend proxy endpoints:
   - `GET /api/manga/proxy/html?url=` — fetch and return raw HTML
   - `GET /api/manga/proxy/json?url=` — fetch and return parsed JSON
   - `GET /api/manga/image-proxy?url=` — stream images with TLS/Referer spoofing
2. **Native Platforms (Android, Windows, Linux):** Run extensions inside embedded JavaScript runtimes (QuickJS on Android/Linux, ChakraCore on Windows). The native host injects the `apiFetch(url, options)` bridge function, which executes directly through native HTTP clients (OkHttp, HttpClient, libsoup3). This completely eliminates CORS restrictions and backend proxy bottlenecks, routing scraper requests through the user's native IP.

### Supported Extension Sources (50 total)
- **Manga:** MangaDex, Asura Scans, MangaKatana, Omega Scans, Bato.to, MangaKakalot, MangaPill, TCB Scans, MangaHere, Webtoons, Azuki, Comix.to, FlameComics, MangaPlus, plus Madara/WordPress templates (ManhuaHot, ManhwaTop, ZinManga, etc.).
- **Light & Web Novels:** Royal Road, Scribble Hub, LightNovelWorld, WuxiaWorld, NovelBin, NovelFire, NovelFull, FreeWebNovel, AllNovel, NovelPhoenix, ReadNovelFull, Libread, BrightNovel, ChrysanthemumGarden, ComradeMao, and others.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Core Web Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query v5, Zustand (persist) |
| Core Backend | FastAPI, Python 3.14, SQLAlchemy async, SQLite locally, Supabase PostgreSQL in production, curl_cffi |
| Shared Scrapers | JavaScript (ES2022) with unified `apiFetch` contract |
| Android Native | Kotlin, Jetpack Compose, Material 3, Room SQLite, OkHttp, QuickJS, Firebase DataConnect |
| Windows Native | C#, .NET 10, WinUI 3, Windows App SDK, C++20 (`MangaDl.Native`), SQLite-net |
| Linux Native | GTK4, libadwaita, Vala / C, SQLite3, libsoup3 |
| Cloud Infrastructure | Firebase (Hosting, Auth, DataConnect), Supabase (PostgreSQL, Storage, Auth), Render |
| Package Management | Bun exclusively for JavaScript |

---

## Core Repository Structure ([manga-dl](file:///home/zenmi/Projects/manga-dl))

```
manga-dl/
├── frontend/
│   ├── src/
│   │   ├── pages/          # React route components (Dashboard, MangaDetail, Reader, etc.)
│   │   ├── hooks/          # Domain hooks (useDashboardData, useMangaDetail, useReaderData, etc.)
│   │   ├── components/     # UI components (dashboard, reader, layout, modals)
│   │   ├── lib/
│   │   │   ├── store.ts           # Zustand store for UI preferences and reading settings
│   │   │   ├── queries.ts         # Central TanStack Query v5 hooks and cache keys
│   │   │   ├── api.ts             # Axios API client
│   │   │   ├── supabase.ts        # Supabase client instance
│   │   │   ├── firebase.ts        # Firebase Auth and client instance
│   │   │   ├── extensions.ts      # ExtensionManager for loading JS scrapers in Web Workers
│   │   │   ├── readTracking.ts    # Chapter read state with Supabase sync
│   │   │   ├── categories.ts      # Category assignments with Supabase sync
│   │   │   └── localLibrary.ts    # IndexedDB persistence for offline files
│   │   └── App.tsx                # Routing, authentication, and session gates
│   ├── public/                    # Static assets, sitemap.xml, robots.txt
│   └── package.json               # Bun project definition
├── backend/
│   └── app/
│       ├── api/            # Lightweight FastAPI routers (library, manga, sources, users)
│       ├── services/       # Domain business logic (archive_converter, proxy_service, etc.)
│       │   └── extensions/ # Standalone JavaScript source extension definitions
│       ├── models/         # SQLAlchemy ORM models
│       ├── database.py     # Database session management
│       └── main.py         # Application entry point, lifespan, and CORS configuration
└── docs/                   # Architectural guides, specifications, and platform matrices
```

---

## State Management and Synchronization

### Local vs Cloud State
1. **Reading Progress:** Saved per chapter in local storage/IndexedDB immediately, and debounced to Supabase `reading_progress` table.
2. **Read Tracking:** Set of completed chapter IDs saved locally and synchronized with Supabase `read_tracking` table.
3. **Categories:** User categories and manga assignments persisted locally and synchronized with Supabase `user_categories` table.
4. **Metadata Overrides:** Custom user-defined titles, covers, and descriptions persisted locally and synchronized with Supabase `manga_overrides` table.

### Multi-Device Rules
- Backend enforces an optional device limit via `UserDevice` records.
- User accounts support Supabase JWT and Firebase Auth tokens.
- Native clients operate autonomously with offline-first local SQLite databases, synchronizing in the background when network connectivity is available.

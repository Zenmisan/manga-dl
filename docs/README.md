# Manga OS (manga-dl)

A modern manga and web novel reading ecosystem spanning Web, native Android, and native Windows.

> Built as an open-source alternative to Tachiyomi with a glassmorphic UI, on-device scraping, and cloud synchronization.

---

## Features

- **500+ sources** — Tachiyomi-compatible extension engine; install/uninstall/enable/disable/update extensions from Keiyoushi index; built-in MangaDex, MangaKatana, Asura Scans, Bato.to, NovelBin, and 50+ manga and web novel scrapers
- **4 reading modes** — LTR pager, RTL pager, webtoon scroll, vertical pager; dual-page spread, tap zones, crop borders, webtoon padding, filters (brightness/contrast/grayscale/invert/sepia)
- **Download queue** — real-time WebSocket progress, CBZ with ComicInfo.xml and EPUB for novels, pause/resume/cancel/retry
- **Local library** — CBZ, ZIP, EPUB import; batch select with download/delete/move-to-category; dynamic grid columns; 8 filter modes; categories
- **Tracking** — AniList, MAL, Kitsu, MangaUpdates, Shikimori, Bangumi; sync status/score/chapters/dates
- **History** — full reading history with date filters (today/week/month); cloud-synced progress
- **Stats** — reading time, pace, per-category breakdown, 52-week heatmap, reading goals
- **Backup** — JSON export/import, Tachiyomi .tachibk + JSON import, cloud backup (Supabase), auto-backup schedule
- **Source migration** — move a manga from one source to another, preserving library entry
- **Cloud sync** — Supabase backend for subscriptions, reading progress, and profiles across devices
- **Onboarding** — triggers dynamically on first-time reader open, preserving API/backend setup state on the local device across different account logins
- **Platform Ecosystem**:
  - **Web ([`manga-dl`](https://github.com/zenmisan/manga-dl))** — PWA on Firebase Hosting with FastAPI backend for CORS proxying and novel text delivery.
  - **Android Native ([`manga-dl-android`](https://github.com/zenmisan/manga-dl-android))** — 100% native Kotlin + Jetpack Compose app with on-device scraping, Room SQLite database, and hardware volume key navigation.
  - **Windows Native ([`manga-dl-windows`](https://github.com/zenmisan/manga-dl-windows))** — 100% native WinUI 3 / Windows App SDK (.NET 10 / C#) application with C++20 image processing DLL (`MangaDl.Native`).
  - **Linux Native ([`manga-dl-linux`](https://github.com/zenmisan/manga-dl-linux))** — Native GTK4 + libadwaita Linux desktop app.
  - **Self-Host ([`manga-dl-selfhost`](https://github.com/zenmisan/manga-dl-selfhost))** — Containerized Docker Compose backend environment.
- **Glassmorphic UI** — Tailwind + Framer Motion, dynamic ambilight colour theming from cover art

---

## Architecture

```
manga-dl Ecosystem
        │
        ├── Web App (manga-dl)           → Firebase Hosting → FastAPI backend → Supabase
        ├── Android App (manga-dl-android) → Native Kotlin + Compose → Local Room DB + On-Device Scraper
        ├── Windows App (manga-dl-windows) → Native WinUI 3 + C# / C++ → Local SQLite + On-Device Scraper
        └── Linux App (manga-dl-linux)   → Native GTK4 + libadwaita  → Local SQLite + On-Device Scraper
```

**Web users** rely on the FastAPI backend for scraping (browser CORS limits).  
**Native users** scrape directly on-device with native HTTP clients (OkHttp / HttpClient / libsoup); the backend is used solely for optional cross-device synchronization.

---

## Stack

| Platform / Layer | Technology | Repository |
|------------------|------------|------------|
| Web Frontend     | React 19, Vite, TypeScript, Tailwind v4, Framer Motion, Zustand | `manga-dl/frontend` |
| Backend & Scrapers | FastAPI, Python 3.14, SQLAlchemy 2, curl_cffi, Pillow, JS Extensions | `manga-dl/backend` |
| Android Native   | Kotlin, Jetpack Compose, Room SQLite, OkHttp | `manga-dl-android` |
| Windows Native   | WinUI 3, Windows App SDK, .NET 10, C#, C++20 DLL | `manga-dl-windows` |
| Linux Native     | GTK4, libadwaita, Vala / C, SQLite3 | `manga-dl-linux` |
| Database & Sync  | Supabase PostgreSQL, Local SQLite | Multi-platform |
| Storage & Cloud  | Firebase Hosting (Web), Render / Docker (Backend) | `manga-dl-selfhost` |

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) — JS package manager
- Python 3.14+
- Rust toolchain (desktop only)
- JDK 17 + Android Studio (Android only)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy and edit env
cp .env.example .env

uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Interactive docs at `/docs`.

**Environment variables:**

| Variable              | Default                          | Description                              |
|-----------------------|----------------------------------|------------------------------------------|
| `DATABASE_URL`        | `sqlite+aiosqlite:///./manga_dl.db` | SQLite or PostgreSQL URI              |
| `LIBRARY_PATH`        | `~/manga-library`                | Where downloaded CBZ files are stored    |
| `CACHE_PATH`          | `~/.manga-dl-cache`              | Temp image cache                         |
| `API_KEY`             | _(none)_                         | Optional — lock API behind a secret key  |
| `CORS_ORIGINS`        | `http://localhost:5173`          | Comma-separated or JSON array of origins |
| `SUPABASE_URL`        | _(none)_                         | Supabase project URL                     |
| `SUPABASE_SERVICE_KEY`| _(none)_                         | Supabase service role key                |
| `MAX_STORAGE_MB`      | `900`                            | Storage cap before smart eviction kicks in |

### Frontend (Web)

```bash
cd frontend
bun install
bun run dev   # http://localhost:5173
```

### Native Platforms

The native mobile and desktop applications live in their own dedicated repositories:

#### Android Native ([`manga-dl-android`](https://github.com/zenmisan/manga-dl-android))
Built with Kotlin and Jetpack Compose.
```bash
git clone https://github.com/zenmisan/manga-dl-android.git
cd manga-dl-android
./gradlew assembleDebug
```
Open in Android Studio to deploy to an emulator or physical device.

#### Windows Native ([`manga-dl-windows`](https://github.com/zenmisan/manga-dl-windows))
Built with WinUI 3, Windows App SDK, and .NET 10.
1. Clone `https://github.com/zenmisan/manga-dl-windows.git` and open `MangaDl.sln` in Visual Studio 2022 (17.12+) or VS 2026.
2. Select target architecture (`x64` or `ARM64`).
3. Set **MangaDl.App** as the startup project and press F5.

#### Linux Native ([`manga-dl-linux`](https://github.com/zenmisan/manga-dl-linux))
Built with GTK4 and libadwaita. See [`DESKTOP-LINUX.md`](https://github.com/zenmisan/manga-dl-linux/blob/main/DESKTOP-LINUX.md) for build instructions.

---

## Deployment (Free Tier)

### 1. Database — Supabase (free PostgreSQL)

1. Create project at [supabase.com](https://supabase.com)
2. Copy the **Transaction Pooler** connection string (Settings > Database)
3. Set prefix to `postgresql+psycopg://` and append `?sslmode=require`

### 2. Backend — Render (Docker)

1. Push repo to GitHub
2. Create a new **Web Service** on Render, select Docker runtime
3. Set environment variables (see table above), plus:
   - `DATABASE_URL` — your Supabase pooler URI
   - `CORS_ORIGINS` — your Firebase app URL

> Render free tier sleeps after 15 min of inactivity. First request after sleep may take ~60s.

### 3. Frontend — Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
cd frontend
bun run build
firebase deploy --only hosting
```

Update `frontend/src/lib/api.ts` `baseURL` to point at your Render backend URL before building.

---

## API Overview

All `/api` routes require `X-API-Key` header if `API_KEY` is set in backend config.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/manga/providers` | List all sources and health status |
| `GET` | `/api/manga/search?q=&provider=&page=` | Search across sources |
| `GET` | `/api/manga/{provider}/{manga_id}` | Manga detail + chapter list |
| `POST` | `/api/downloads/queue` | Enqueue chapter download |
| `GET` | `/api/downloads/active` | Current download queue state |
| `GET` | `/api/downloads/history` | Last 100 completed/failed jobs |
| `WS` | `/api/downloads/ws` | Real-time download progress stream |
| `GET` | `/api/library` | Scan and return local CBZ library |

Full spec: [`docs/API_SPEC.md`](docs/API_SPEC.md)

---

## Project Structure

```
manga-dl/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (manga, downloads, library, auth, users)
│   │   ├── core/         # Queue, downloader, storage, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── providers/    # Source scrapers (MangaDex, AsuraScans, etc.)
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/              # React 19 web app (Firebase Hosting)
│   └── package.json
├── docs/                 # All project documentation and research reports
└── Sibling Native Repositories:
    ├── manga-dl-android/ # Pure native Kotlin + Jetpack Compose Android app
    ├── manga-dl-windows/ # Pure native WinUI 3 + .NET 10 C# app + C++ DLL
    ├── manga-dl-linux/   # Pure native GTK4 + libadwaita Linux desktop app
    └── manga-dl-selfhost/# Docker Compose self-host container configuration
```

---

## Docs

All markdown documentation and analysis files are stored in the [docs/](docs/) folder:
- [Architecture](docs/ARCHITECTURE.md)
- [API Specification](docs/API_SPEC.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing / Build Guide](docs/CONTRIBUTING.md)
- [Implementation Plan](docs/implementation_plan.md) (approved strategy and checklists)
- [Keiyoushi Source Analysis](docs/keiyoushi_source_analysis.md) (Tachiyomi-compatible extension engine details)
- [Comprehensive Analytical Report](docs/manga_dl_comprehensive_analysis.md) (SWOT, Gap, User/UX, Feature, Heuristic, Cost-Benefit, Risk, and SCAMPER)
- [Master Plan](docs/MASTER_PLAN.md) (overall roadmap)
- [Project Status](docs/PROJECT_STATUS.md) (current release checklist)
- [Features Specification](docs/FEATURES.md)
- [Known Issues & Limitations](docs/KNOWN_ISSUES.md)
- [Suwayomi Analysis](docs/suwayomi_analysis.md) (architecture comparison and desktop native opportunities)

# manga-dl

[![Web App](https://img.shields.io/badge/Web_App-manga--dl.web.app-3b82f6?style=for-the-badge&logo=google-chrome&logoColor=white)](https://manga-dl.web.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android%20%7C%20Windows%20%7C%20Linux-emerald?style=for-the-badge)](https://manga-dl.web.app)

> **Live Web App & PWA**: [**https://manga-dl.web.app**](https://manga-dl.web.app)
> 
> A modern manga, manhwa, and web novel reading ecosystem spanning Web (PWA), native Android, native Windows, and native Linux. Free, open-source alternative to Tachiyomi / Mihon with 50+ built-in scrapers, ad-free offline CBZ/EPUB downloads, and multi-tracker synchronization.

---

## Features

- **500+ sources:** Tachiyomi-compatible extension engine. Install, update, or disable extensions from the Keiyoushi index. Built-in providers include MangaDex, MangaKatana, Asura Scans, Bato.to, NovelBin, and 50+ manga and web novel scrapers.
- **4 reading modes:** LTR pager, RTL pager, webtoon scroll, vertical pager. Dual-page spread, tap zones, crop borders, webtoon padding, and image filters (brightness, contrast, grayscale, invert, sepia).
- **Download queue:** Real-time WebSocket progress. Outputs CBZ with ComicInfo.xml and EPUB for novels. Full pause, resume, cancel, and retry support.
- **Local library:** CBZ, ZIP, and EPUB import. Batch select with download, delete, and move-to-category. Dynamic grid columns, 8 filter modes, custom categories.
- **Tracking:** AniList, MAL, Kitsu, MangaUpdates, Shikimori, Bangumi. Syncs status, score, chapters read, and dates.
- **History:** Cloud-synced reading history with date filters (today, week, month).
- **Stats:** Reading time, pace, per-category breakdown, 52-week heatmap, reading goals.
- **Backup:** JSON export and import, Tachiyomi `.tachibk` and JSON import, cloud backup via Supabase, auto-backup schedule.
- **Source migration:** Move a manga from one source to another while preserving the library entry.
- **Cloud sync:** Supabase backend for subscriptions, reading progress, and profiles across devices.
- **Onboarding:** Guides the user through API key and backend URL setup, persisting config in localStorage across logins.
- **Glassmorphic UI:** Tailwind v4, Framer Motion, dynamic ambilight colour theming from cover art.

### Platform Ecosystem

The manga-dl ecosystem consists of specialized native repositories sharing design tokens, scraping logic, and synchronization contracts:

- **Web Core / Reference ([`manga-dl`](https://github.com/zenmisan/manga-dl))**: React 19 + TypeScript + Vite progressive web app deployed on Firebase Hosting, with FastAPI Python backend for CORS proxying, novel text delivery, and optional sync.
- **Android Native ([`manga-dl-android`](https://github.com/zenmisan/manga-dl-android))**: Pure native Kotlin + Jetpack Compose application with on-device scraping, Room SQLite database, and native hardware key integrations.
- **Windows Native ([`manga-dl-windows`](https://github.com/zenmisan/manga-dl-windows))**: Pure native Windows application built with WinUI 3, Windows App SDK, .NET 10, C#, and a high-performance C++20 DLL (`MangaDl.Native`) for image processing and archive decompression.
- **Linux Native ([`manga-dl-linux`](https://github.com/zenmisan/manga-dl-linux))**: Native Linux desktop application built with GTK4 and libadwaita.
- **Self-Host ([`manga-dl-selfhost`](https://github.com/zenmisan/manga-dl-selfhost))**: Docker Compose packaging for self-hosted backend, cache, and database services.

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

- **Web users** rely on the FastAPI backend for scraping due to browser CORS constraints.
- **Native applications** execute scrapers directly on-device with native HTTP clients (OkHttp / HttpClient / libsoup) without proxy overhead, utilizing Supabase solely for optional cross-device synchronization.

---

## Stack

| Platform / Layer | Technology | Repository |
|------------------|------------|------------|
| Web Frontend     | React 19, Vite, TypeScript, Tailwind v4, Framer Motion, Zustand | [`manga-dl/frontend`](https://github.com/zenmisan/manga-dl) |
| Backend & Scrapers | FastAPI, Python 3.14, SQLAlchemy 2, curl_cffi, Pillow, JS Extensions | [`manga-dl/backend`](https://github.com/zenmisan/manga-dl) |
| Android Native   | Kotlin, Jetpack Compose, Room SQLite, OkHttp | [`manga-dl-android`](https://github.com/zenmisan/manga-dl-android) |
| Windows Native   | WinUI 3, Windows App SDK, .NET 10, C#, C++20 DLL | [`manga-dl-windows`](https://github.com/zenmisan/manga-dl-windows) |
| Linux Native     | GTK4, libadwaita, Vala / C, SQLite3 | [`manga-dl-linux`](https://github.com/zenmisan/manga-dl-linux) |
| Database & Sync  | Supabase PostgreSQL, Local SQLite | Multi-platform |
| Deployment       | Firebase Hosting (Web), Render / Docker (Backend) | [`manga-dl-selfhost`](https://github.com/zenmisan/manga-dl-selfhost) |

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh): JS package manager (used throughout, not npm)
- Python 3.14+
- Rust toolchain (desktop builds only)
- JDK 17 + Android Studio (Android builds only)

#### Quick Windows Setup (One-Command)

If you are on Windows, you can set up the entire project (root packages, frontend packages, backend virtual environment, and path redirection) in a single command:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

#### Manual Setup (Linux / macOS)

**1. Backend Setup**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # edit as needed

uvicorn app.main:app --reload
```

Runs at `http://localhost:8000`. Interactive docs at `/docs`.

**Environment Variables**

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./manga_dl.db` | SQLite or PostgreSQL URI |
| `LIBRARY_PATH` | `~/manga-library` | Where downloaded CBZ files are stored |
| `CACHE_PATH` | `~/.manga-dl-cache` | Temp image cache |
| `API_KEY` | _(none)_ | Lock API behind a secret key |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated or JSON array of allowed origins for the web client |
| `SUPABASE_URL` | _(none)_ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | _(none)_ | Supabase service role key |
| `MAX_STORAGE_MB` | `900` | Storage cap before smart eviction |

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
Open in Android Studio to deploy to a physical device or emulator.

#### Windows Native ([`manga-dl-windows`](https://github.com/zenmisan/manga-dl-windows))
Built with WinUI 3, Windows App SDK, and .NET 10.
1. Clone `https://github.com/zenmisan/manga-dl-windows.git` and open `MangaDl.sln` in Visual Studio 2022 (17.12+) or VS 2026.
2. Select target architecture (`x64` or `ARM64`).
3. Set **MangaDl.App** as the startup project and press F5.

#### Linux Native ([`manga-dl-linux`](https://github.com/zenmisan/manga-dl-linux))
Built with GTK4 and libadwaita. See [`DESKTOP-LINUX.md`](https://github.com/zenmisan/manga-dl-linux/blob/main/DESKTOP-LINUX.md) for build instructions.

---

## Deployment (Free Tier)

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the Transaction Pooler connection string from Settings > Database
3. Set the prefix to `postgresql+psycopg://` and append `?sslmode=require`

### 2. Backend (Render)

1. Push repo to GitHub
2. Create a Web Service on Render using Docker runtime
3. Set environment variables from the table above, plus:
   - `DATABASE_URL`: your Supabase pooler URI
   - `CORS_ORIGINS`: your Firebase app URL

> Render free tier sleeps after 15 minutes of inactivity. The first request after sleep may take up to 60 seconds. The web app retries automatically.

### 3. Frontend (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login

cd frontend
bun run build
firebase deploy --only hosting
```

Deploy must run from the `frontend/` directory. Update `src/lib/api.ts` with your Render backend URL before building.

---

## API Overview

All `/api` routes accept an `X-API-Key` header when `API_KEY` is set in backend config.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/manga/providers` | List all sources and health status |
| `GET` | `/api/manga/search?q=&provider=&page=` | Search across sources |
| `GET` | `/api/manga/{provider}/{manga_id}` | Manga detail and chapter list |
| `POST` | `/api/downloads/queue` | Enqueue a chapter download |
| `GET` | `/api/downloads/active` | Current download queue state |
| `GET` | `/api/downloads/history` | Last 100 completed and failed jobs |
| `WS` | `/api/downloads/ws` | Real-time download progress stream |
| `GET` | `/api/library` | Scan and return local CBZ library |

Full spec: [`docs/API_SPEC.md`](docs/API_SPEC.md)

---

## Project Structure

```
manga-dl/ (Web & Backend Core)
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (manga, downloads, library, auth, users)
│   │   ├── core/         # Queue, downloader, storage, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── providers/    # Source scrapers
│   │   ├── services/     # Scrapers & extensions loader, proxy, sync
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/              # React 19 web app (Firebase Hosting)
│   └── package.json
└── docs/                 # Architecture, API spec, deployment, contributing, plans

Sibling Native Repositories:
├── [manga-dl-android](https://github.com/zenmisan/manga-dl-android)   # Pure native Kotlin + Jetpack Compose Android app
├── [manga-dl-windows](https://github.com/zenmisan/manga-dl-windows)   # Pure native WinUI 3 + .NET 10 C# app + C++ DLL
├── [manga-dl-linux](https://github.com/zenmisan/manga-dl-linux)       # Pure native GTK4 + libadwaita Linux desktop app
└── [manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost)  # Docker Compose self-host container configuration
```

---

## Docs

All documentation is in [`docs/`](docs/):

- [Architecture](docs/ARCHITECTURE.md)
- [API Specification](docs/API_SPEC.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing / Build Guide](docs/CONTRIBUTING.md)
- [Implementation Plan](docs/implementation_plan.md)
- [Master Plan](docs/MASTER_PLAN.md)
- [Project Status](docs/PROJECT_STATUS.md)
- [Features Specification](docs/FEATURES.md)
- [Known Issues](docs/KNOWN_ISSUES.md)
- [Keiyoushi Source Analysis](docs/keiyoushi_source_analysis.md)
- [Comprehensive Analysis](docs/manga_dl_comprehensive_analysis.md)

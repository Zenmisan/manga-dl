# manga-dl

A self-hostable, tri-platform manga reader. Web app, native desktop (Windows/macOS/Linux via Tauri), and Android (via Capacitor), all from one React codebase.

Built as a modern open-source alternative to Tachiyomi with a glassmorphic UI and cloud sync.

---

## Features

- **500+ sources:** Tachiyomi-compatible extension engine. Install, update, or disable extensions from the Keiyoushi index. Built-in providers include MangaDex, MangaKatana, Komga, and Suwayomi.
- **4 reading modes:** LTR pager, RTL pager, webtoon scroll, vertical pager. Dual-page spread, tap zones, crop borders, webtoon padding, and image filters (brightness, contrast, grayscale, invert, sepia).
- **Download queue:** Real-time WebSocket progress. Outputs CBZ with ComicInfo.xml. Full pause, resume, cancel, and retry support.
- **Local library:** CBZ, ZIP, and EPUB import. Batch select with download, delete, and move-to-category. Dynamic grid columns, 8 filter modes, custom categories.
- **Tracking:** AniList, MAL, Kitsu, MangaUpdates, Shikimori, Bangumi. Syncs status, score, chapters read, and dates.
- **History:** Cloud-synced reading history with date filters (today, week, month).
- **Stats:** Reading time, pace, per-category breakdown, 52-week heatmap, reading goals.
- **Backup:** JSON export and import, Tachiyomi `.tachibk` and JSON import, cloud backup via Supabase, auto-backup schedule.
- **Source migration:** Move a manga from one source to another while preserving the library entry.
- **Cloud sync:** Optional Supabase backend for reading progress, library, and backups across devices. Write actions are admin-gated to reduce load on the public instance.
- **Onboarding:** Triggers on first visit to any app route. Guides the user through API key and backend URL setup, persisting config in localStorage across logins.
- **Glassmorphic UI:** Tailwind v4, Framer Motion, dynamic ambilight colour theming from cover art.

### Platform Details

**Web (PWA)**
Offline-capable progressive web app deployed on Firebase Hosting. Auto-syncs subscribed manga every 30 minutes.

**Desktop (Tauri v2)**
Windows, macOS, Linux. Background chapter sync, OS notifications, auto-launch, in-place updater, drag-and-drop import, custom download path, Discord Rich Presence. Bypasses the marketing page for logged-in sessions or native shells.

**Android (Capacitor)**
Hardware volume key control, hardware back button, screen keep-on, haptics, status bar ambilight, save to device, download notifications. APK distributed via Supabase Storage.

---

## Architecture

```
React 19 + Vite + TypeScript
        │
        ├── Web      → Firebase Hosting → FastAPI backend → Supabase
        ├── Desktop  → Tauri (Rust) shell → local FS + optional Supabase sync
        └── Android  → Capacitor shell → SQLite + optional Supabase sync
```

Web users rely on the FastAPI backend for scraping (browser CORS limits).
Native users can scrape on-device; the backend handles sync only.

---

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19, Vite, TypeScript, Tailwind v4, Framer Motion, Zustand |
| Backend  | FastAPI, SQLAlchemy 2, aiosqlite, curl_cffi, Pillow |
| Desktop  | Tauri v2 (Rust) |
| Mobile   | Capacitor v8, Android |
| Database | SQLite (local) or PostgreSQL via Supabase |
| Storage  | Local filesystem or Supabase Storage |

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh): JS package manager (used throughout, not npm)
- Python 3.14+
- Rust toolchain (desktop builds only)
- JDK 17 + Android Studio (Android builds only)

### Backend

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
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated or JSON array of origins |
| `SUPABASE_URL` | _(none)_ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | _(none)_ | Supabase service role key |
| `MAX_STORAGE_MB` | `900` | Storage cap before smart eviction |

### Frontend (Web)

```bash
cd frontend
bun install
bun run dev   # http://localhost:5173
```

### Desktop (Tauri)

```bash
# Arch Linux
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file xdotool openssl libappindicator-gtk3 librsvg

# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

cd frontend
bun run tauri dev        # dev mode with hot-reload
bun run tauri build      # release binary → src-tauri/target/release/bundle/
```

### Android (Capacitor)

Requires JDK 17 (exactly 17, not a later version) and Android Studio.

```bash
cd frontend
bun run build          # build React assets first
bun run android:sync   # sync assets into android/
bun run android:open   # open in Android Studio
```

Run on emulator or device via Android Studio, or build APK via Build > Build APK(s).

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
manga-dl/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (manga, downloads, library, auth, users)
│   │   ├── core/         # Queue, downloader, storage, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── providers/    # Source scrapers
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/              # React app
│   ├── src-tauri/        # Tauri Rust shell
│   ├── android/          # Capacitor Android project
│   └── package.json
└── docs/                 # Architecture, API spec, deployment, contributing, plans
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

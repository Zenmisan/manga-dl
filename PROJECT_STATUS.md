# manga-dl — Project Status

A tri-platform manga reader and downloader.  
**Web:** Firebase Hosting (`manga-dl.web.app`)  
**Desktop:** Tauri v2 — AppImage / .deb / .exe / .dmg  
**Mobile:** Capacitor Android APK  
**Backend:** FastAPI + SQLite (local) / Supabase PostgreSQL (prod) on Render

---

## What Works ✅

### Core Reading & Library
- Search manga across providers (MangaKatana, etc.)
- View manga detail + chapter list with cover images (proxied)
- Download chapters as CBZ → local library or Supabase cloud storage
- Download queue with real-time WebSocket progress
- Pause / resume / cancel individual or all downloads
- Library shows both downloaded chapters AND subscribed series
- Subscribe / unsubscribe (auto-downloads new chapters via background sync)
- Manual sync trigger from Settings
- CBZ reader — webtoon scroll, manga LTR, manga RTL modes
- Ambilight ambient colour effect in reader
- Export chapter as PDF or EPUB3
- Reading progress saved per chapter (local/downloaded)
- MAL auto-track on chapter complete (fires on last page, silent)
- AniList OAuth + reading sync
- MAL OAuth (PKCE) + reading sync
- Browser push notifications for new chapter queues
- Reading stats page (chapters, pages, streaks, provider breakdown)

### Online Reading
- Stream chapter pages without downloading ("Read Online" button)
- Image proxy via curl_cffi with Chrome impersonation + correct Referer
- Cloud reading progress sync (saves page, resumes on next open) — requires login

### Local Upload (Web / Desktop)
- Upload CBZ/ZIP from disk
- Persisted in IndexedDB — survives page refresh
- Read locally without re-uploading
- Upload to Supabase cloud from reader

### Extensions
- Browse 500+ sources from Keiyoushi index
- Tachiyomi prefix stripped from names
- Extensions sandboxed in Web Workers
- Per-user extension storage (keyed by Supabase user ID)

### Account System
- Register / login with email+password (Supabase Auth)
- Terms & Conditions page with device limit policy
- 3-device limit enforced in backend (30-day forfeit lock)
- Account section in Settings (sign in / sign out / show email)
- Login `/login`, Register `/register`, Terms `/terms`

### Desktop (Tauri)
- Auto-starts FastAPI backend on launch
- System tray — hide to tray on close, show/quit menu
- Reveal downloaded file in system file manager
- Builds: Linux AppImage/.deb, Windows .exe, macOS .dmg

### Mobile (Capacitor Android)
- APK builds and installs
- Points to Render backend by default (overrideable in Settings)
- Network security config allows HTTP to LAN IPs for self-hosting

### UX
- Icon legend / help page at `/help` (sidebar Help button)
- Hover tooltips on all major buttons
- Dark glassmorphism design

---

## Known Broken ❌

### Android APK — Blank Screen
**Cause:** Render free tier sleeps after 15 min inactivity. Cold start takes 30–60s with no feedback shown.  
**Also:** No onboarding — user must know to set API key (`mgdl-creator`) in Settings.  
**Fix needed:** Show a loading/setup screen on first launch; pre-fill the API key.

### Tauri Desktop — Blank Screen  
**Cause:** Backend auto-start needs `python`/`python3` + `uvicorn` in `$PATH`. Most users don't have this.  
**Fix needed:** Bundle a compiled backend binary, or show a "Backend not found — install Python" setup screen.

### Extensions — Always Fail
**Cause:** Keiyoushi index provides Android APK metadata — no JS source files exist.  
**Fix needed:** Write JS shims for built-in providers (MangaKatana, etc.) that delegate to the backend API.

### Supabase Production DB — Missing Columns
Run these SQL migrations in Supabase SQL Editor:
```sql
-- downloads table
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER DEFAULT 0;
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS last_page_read INTEGER DEFAULT 0;

-- reading progress (cloud sync)
CREATE TABLE IF NOT EXISTS reading_progress (
  user_id    VARCHAR NOT NULL,
  provider   VARCHAR NOT NULL,
  manga_id   VARCHAR NOT NULL,
  chapter_id VARCHAR NOT NULL,
  last_page  INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, provider, manga_id, chapter_id)
);
```

---

## Not Yet Implemented 🔲

| Feature | Priority | Notes |
|---------|----------|-------|
| Reading history page | Medium | Track what was read and when. DB columns exist, no UI. |
| Device forfeit dialog | High | Backend endpoint exists. Frontend shows no dialog at 3-device limit — just an error. |
| Download retry button | Medium | Failed downloads stay failed forever. No retry. |
| Offline mode / service worker | Low | App unusable if Render backend is down. |
| Search filters | Low | No genre/status/year filter on search. |
| Bulk chapter management | Low | No "delete series", "re-download all failed", "mark all read". |
| iOS build | Low | Capacitor iOS config not tested. |
| Test coverage | Low | Zero automated tests backend or frontend. |
| Rate limiting | Medium | No per-IP/user limits on API endpoints. |
| Onboarding flow | High | New users get a blank screen with no setup guidance. |

---

## Architecture

```
Frontend (React 19 + TypeScript + Vite + Tailwind)
  ├── Web        → Firebase Hosting (manga-dl.web.app)
  ├── Desktop    → Tauri v2 shell (auto-starts Python backend)
  └── Android    → Capacitor shell (calls Render backend by default)

Backend (FastAPI + SQLAlchemy + aiosqlite)
  ├── Local dev  → SQLite (manga_dl.db)
  ├── Production → Supabase PostgreSQL (via DATABASE_URL env var)
  └── Storage    → Supabase Storage bucket "manga-library"

Auth
  ├── API key    → X-API-Key header (all endpoints except /api/users/*)
  └── Supabase   → JWT Bearer token (/api/users/* — reading progress, devices)
```

## Environment Variables

### Backend (set on Render dashboard)
| Var | Value |
|-----|-------|
| `API_KEY` | `mgdl-creator` — change in prod |
| `SUPABASE_URL` | `https://gyivwfweldwvzccbpgoz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key — Supabase → Settings → API |
| `SUPABASE_JWT_SECRET` | JWT secret — Supabase → Settings → API |
| `CORS_ORIGINS` | `https://manga-dl.web.app,https://manga-dl.firebaseapp.com,...` |

### Frontend (GitHub Actions secrets → baked into bundle at build)
| Var | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Same as backend `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Anon/public key — Supabase → Settings → API |

# manga-dl — Project Status

Last updated: 2026-06-15

A tri-platform manga reader and downloader.  
**Web:** PWA · **Desktop:** Tauri v2 · **Mobile:** Capacitor Android · **Backend:** FastAPI (infra-only — see Phase 10)

---

## Implementation Phases

### Phase 1–6 ✅ Core + Power + Polish + Tracker depth + Reader power + Web QoL
All foundational features shipped: library, reader, downloads, history, stats, tracking (AniList/MAL/Kitsu/MangaUpdates/Shikimori/Bangumi), backup, categories, bookmarks, Discord RPC, PWA, ComicInfo.xml, all 4 reading modes, dual-page spread, tap zones, themes (dark/light/system/AMOLED).

### Phase 7 ✅ Desktop Native (Tauri v2)
Background sync, OS notifications, auto-launch, update checker, custom download location, drag-drop CBZ import, folder picker.

### Phase 8 ✅ Android Native (Capacitor)
Volume keys (Kotlin plugin), back button handlers, KeepAwake, StatusBar ambilight, haptics, save to device storage, download completion notifications.

### Phase 9 ✅ Remaining Features (latest session)
- **Library**: batch select (checkbox overlay + action bar: download/delete/move-to-category), dynamic grid columns (2–6)
- **Settings**: grid column slider, webtoon padding slider, crop borders webtoon toggle, auto-backup (daily/weekly schedule)
- **Extensions**: uninstall, enable/disable toggle, update checking, installed/available split view
- **MangaDetail**: per-manga notification mute, metadata edit modal (title/cover/description), tracker sync modal (status/score/chapters/start+end dates)
- **History**: date filter (Today/Week/Month/All) + search
- **Stats**: reading time estimate, reading pace (ch/week), per-category breakdown
- **Reader**: webtoon side padding, webtoon crop borders
- **Downloads**: Android completion notification (@capacitor/local-notifications)
- **App**: web/Android auto-sync every 30min (Tauri uses Rust task)
- **Backend**: POST /manga/migrate endpoint
- **Settings**: Source Migration UI (2-step wizard)
- **Library**: EPUB support (.epub → JSZip + OPF spine → images displayed as pages)

### Phase 10 ✅ Extension-first architecture (2026-06-15)
- **Removed** all Python scraper providers (MangaDex, AsuraScans, OmegaScans, MangaKatana) — backend is now infra-only (proxy + DB + downloads), no scraping.
- Manga sources are JS extensions running in Web Workers (Tachiyomi-style), managed client-side via `ExtensionManager`.
- New backend proxy endpoints so sandboxed extensions can bypass CORS: `/manga/proxy/html`, `/manga/proxy/json`, `/manga/image-proxy`.
- Fixed AsuraScans (`__NEXT_DATA__` JSON parsing for chapter pages — site is Next.js, images are client-rendered, never in static HTML) and MangaKatana (`data-src`/`data-lazy-src` cover fallback) extensions.
- Search "All" tab fans out across every loaded extension and merges results (previously called a now-deleted backend endpoint and silently did nothing).
- `Subscribe` now requires the frontend to send manga metadata in the request body — backend has no provider to fetch it from anymore.
- Community (non-built-in) Tachiyomi extensions disabled for install on web — they're Android APKs, not JS, can't run in a browser.
- Fixed CORS-breaking trailing-slash redirect bug: `FastAPI(..., redirect_slashes=False)`.
- Fixed Android Gradle build (`kotlin-android` plugin wasn't applied to `:app`, Kotlin Gradle plugin too old for `@capacitor/filesystem`'s stdlib version — bumped to 2.1.0).
- Added in-app update checker (GitHub Releases API) surfaced in More page — Android opens APK URL for native install; Tauri in-place updater not yet wired (needs Rust recompile).

### Phase 11 ✅ Landing Page + Auth Routing (2026-06-16)
- **Full Landing Page**: Implemented at `/` with SEO meta tags, OG tags, and 100dvh hero section.
- **Auth Integration**: Supabase session state wired to Sidebar and Protected Routes.
- **Route Restructure**: Moved the main app to `/r` and implemented a high-impact landing page at root.

### Phase 12 ✅ Android UI Restructure (2026-06-16)
- **Bottom Navigation**: Implemented for mobile (Library, Updates, Search, Browse, More).
- **"More" Page**: Added with Incognito mode, History, Stats, and Settings links.
- **MangaDetail V2**: Implemented hero-style blurred cover art and floating "Smart Binge" FAB.

### Phase 13 ✅ Settings Restructure (2026-06-16)
- **Settings Split**: Refactored the monolithic 1000+ line `Settings.tsx` into categorized sub-pages (`General`, `Reader`, `Library`, `Trackers`, `System`).
- **Sidebar Layout**: Implemented a modern sidebar-based settings layout for desktop/tablet and a scrollable tab-strip for mobile.
- **Nested Routing**: Updated `App.tsx` with nested routes for each settings category.
- **Improved UX**: Categorized settings make it easier to find specific configurations across all platforms.

---
### Phase 14 ✅ Metadata Cloud Sync (2026-06-16)
- **Supabase Integration**: Created a `manga_overrides` table to store user-specific metadata overrides (Title, Cover URL, Description).
- **Backend API**: Added `PUT` and `GET` endpoints to `/users/manga-overrides` for synchronizing overrides.
- **Frontend Sync**: Implemented `syncMetaOverridesFromCloud` to pull overrides into `localStorage` on login/app start, ensuring cross-device consistency.
- **UI Application**: `MangaDetail` now automatically applies synced overrides when rendering manga data.

### Phase 15 ✅ Read-Based Heatmap (2026-06-16)
- **Backend Analytics**: Created a new `/users/me/stats` endpoint that aggregates historical data directly from the `ReadingProgress` table, ensuring only active, in-app reading sessions are counted.
- **Frontend Refactor**: Updated `Stats.tsx` to prioritize reading metrics (reads per day/year) while seamlessly falling back to download metrics for offline/unauthenticated users.
- **Improved Accuracy**: The heatmap and activity charts now accurately reflect true reading engagement rather than automated download queues.

---

## What Remains 🔲

| Feature | Priority |
|---------|----------|
| Biometric / PIN lock (Android) | Medium |
| WiFi-only / charging-only gates for sync/download | Low |
| WebView fallback for Cloudflare sources | Medium |
| RAR/CBR archive support | Low |
| Local folder scan (bulk import from directory) | Low |
| Tablet multi-column reading layout | Low |
| Custom date format | Low |
| DNS-over-HTTPS, custom user agent | Low |
| Material You dynamic colours | Low |
| Auto-delete after read, split page spreads | Low |
| Background sync Android WorkManager | Low |
| Badge count on app icon (requires FCM) | Low |
| Tracker filter in library | Low |


---

## Known Setup Requirements ⚠️

### Must do before shipping
1. **Supabase SQL migrations** — run the `reading_progress` table creation (see FEATURES.md)

### Known code issues
- Settings page is a monolithic 1000+ line file (`Settings.tsx`).
- Metadata overrides (`manga-dl-meta-overrides`) are localStorage-only.
- Heatmap tracks downloads instead of reads.

---

## Architecture Summary

```
frontend/
  src/
    pages/          React page components
    lib/            Zustand store, API client, local utilities
    components/     Shared UI components
  src-tauri/        Rust Tauri shell (desktop)
  android/          Capacitor Android project

backend/
  app/
    api/            FastAPI route handlers
    models/         SQLAlchemy ORM models
    providers/      Manga source adapters
    core/           Tasks, downloader, tachibk parser
```

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand (persist)
- **Backend**: FastAPI, SQLAlchemy async, SQLite/PostgreSQL, curl_cffi (Cloudflare bypass)
- **Desktop**: Tauri v2, Rust tokio, tauri-plugin-notification/autostart/dialog/fs
- **Android**: Capacitor 6, @capacitor/haptics, @capacitor/filesystem, @capacitor/local-notifications, custom Kotlin VolumeKeys plugin
- **Auth**: Supabase Auth (JWT) + API key header
- **Storage**: Supabase Storage (CBZ cloud) + IndexedDB (local CBZ/EPUB)
</content>
</invoke>
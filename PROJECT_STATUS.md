# manga-dl — Project Status

Last updated: 2026-06-13

A tri-platform manga reader and downloader.  
**Web:** PWA · **Desktop:** Tauri v2 · **Mobile:** Capacitor Android · **Backend:** FastAPI

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
1. **Discord App ID** — replace `"1234567890123456789"` in `frontend/src-tauri/src/lib.rs`
2. **Supabase bucket** — create `manga-backups` bucket (private) in Supabase dashboard
3. **Supabase SQL migrations** — run the `reading_progress` table creation (see FEATURES.md)

### Known code issues
- `manga-dl-bookmarks` key uses `provider:provider` (bug — should be `provider:mangaId`) in one `useState` initializer in MangaDetail.tsx
- Read tracking, categories, notes, bookmarks are localStorage-only — not cross-device synced
- MAL sync sends chapter ID string instead of chapter number integer
- `|` in manga title breaks 5-part pipe-encoded `/read/online/` URLs
- ComicInfo.xml doesn't escape `&`/`<`/`>` in titles

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
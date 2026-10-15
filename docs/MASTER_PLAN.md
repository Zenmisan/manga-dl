# manga-dl — Master Implementation Plan

Last updated: 2026-10-08

---

## Phase A: Foundational Fixes & Android Build (Completed)

- [x] Fixed `MainActivity.java` — `registerPlugin` moved to `onCreate`, `getPlugin` by string name
- [x] Fixed `VolumeKeysPlugin.kt` — `JSObject()` instead of `null` in `notifyListeners`
- [x] Fixed bookmarks key `provider:provider` -> `provider:mangaId`
- [x] Fixed MAL sync chapters read (was hardcoded 0)
- [x] Fixed ComicInfo.xml `xml.sax.saxutils.escape()` on all string fields
- [x] Fixed pipe-in-title URL encoding: btoa encode in MangaDetail, atob decode in Reader
- [x] Discord App ID confirmed real (`1515346416430485785`)
- [x] Supabase `manga-backups` bucket created

---

## Phase B: Supabase Synchronization (Completed)

- [x] `readTracking.ts` — syncs to `read_tracking` table on every write, pulls on app start
- [x] `categories.ts` — syncs to `user_categories` table on every write, pulls on app start
- [x] `mangaNotes.ts` — syncs to `manga_notes` table on every write, pulls on app start
- [x] `App.tsx` — calls all 3 sync functions on mount
- [x] `docs/supabase/migrations.sql` — all 3 tables and RLS policies documented

---

## Phase C: Landing Page & Authentication Routing (Completed)

- [x] C1. Route Restructure (LandingPage at `/`, Dashboard at `/r`)
- [x] C2. Auth State Wiring (Supabase session in `App.tsx`, user profile in Sidebar)
- [x] C3. Landing Page (`Landing.tsx` with Hero, Features, Platforms)
- [x] C4. SEO (`index.html` tags, `robots.txt`, `sitemap.xml`)

---

## Phase D: Mobile-First Layout Restructure (Completed)

- [x] D1. Bottom Nav (Library, Updates, Search, Browse, More)
- [x] D2. More Page (`More.tsx` with Incognito, History, Stats, Settings)
- [x] D3. Library Improvements (Unread badges, 2-column default, Categories, Batch select)
- [x] D4. MangaDetail Improvements (Hero cover, FAB, Read indicators)
- [x] D5. Browse Page Restructure (Sources/Extensions/Migrate tabs)
- [x] D6. Settings sub-pages (General, Reader, Library, Trackers, System)

---

## Phase E: Desktop Experience Polish (Completed)

- [x] E1. Sidebar active indicator with vertical red accent bar
- [x] E2. Wide-screen two-column MangaDetail layout
- [x] E3. Reader keyboard shortcuts overlay
- [x] E4. Desktop layout responsiveness

---

## Phase F: Multi-Device Native Access Control & Direct Delivery (Completed)

- [x] Configure native wrappers and active sessions to bypass landing page on root path
- [x] Restrict administrative download/library write access strictly to authorized administrators
- [x] Enable direct downloads from Supabase Storage instead of redirecting to GitHub
- [x] Correct tablet width grid layout card overlaps in Sources.tsx
- [x] Set display font to Anton and text font to Inter globally
- [x] Refactor first-time onboarding to trigger dynamically upon reader open
- [x] Redirect signed-out users back to the landing page

---

## Phase G: Native Multi-Platform Ecosystem Transition (In Finishing Phases)

Transition from hybrid WebView/Rust wrappers to dedicated platform-native repositories:

- [x] **[manga-dl-android](https://github.com/zenmisan/manga-dl-android)**: Native Kotlin + Jetpack Compose app with Room SQLite, OkHttp, embedded QuickJS scraper engine, and Firebase DataConnect sync. (Finishing phases)
- [x] **[manga-dl-windows](https://github.com/zenmisan/manga-dl-windows)**: Native WinUI 3 + Windows App SDK app on .NET 10 with C++20 dynamic library (`MangaDl.Native`) for Direct2D hardware acceleration, image decoding, and border cropping. (Finishing phases)
- [x] **[manga-dl-linux](https://github.com/zenmisan/manga-dl-linux)**: Native GTK4 + libadwaita + Vala / C app adhering to GNOME Human Interface Guidelines.
- [x] **[manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost)**: Containerized Docker Compose environment for single-command self-hosting.
- [x] **Shared JS Extensions**: Maintain all scrapers in [backend/app/services/extensions/](file:///home/zenmi/Projects/manga-dl/backend/app/services/extensions) using the common `apiFetch` bridge contract across all platforms.

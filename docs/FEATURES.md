# manga-dl — Feature Inventory and Ecosystem Status

A cross-platform manga and light novel reader and downloader ecosystem.

- **Web:** React 19 PWA ([manga-dl](https://github.com/zenmisan/manga-dl))
- **Android:** Native Kotlin and Jetpack Compose ([manga-dl-android](https://github.com/zenmisan/manga-dl-android))
- **Windows:** Native WinUI 3, Windows App SDK, .NET 10, C# and C++20 ([manga-dl-windows](https://github.com/zenmisan/manga-dl-windows))
- **Linux:** Native GTK4, libadwaita, and Vala / C ([manga-dl-linux](https://github.com/zenmisan/manga-dl-linux))
- **Backend:** FastAPI + SQLite (local) / Supabase PostgreSQL (prod)
- **Self-Host:** Docker Compose containerized environment ([manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost))

Last updated: 2026-10-08

---

## Implemented Core Features

### Reading and Library
- Search manga and light novels across 50+ built-in sources plus community index
- View manga detail, cover art, synopsis, and chapter catalogs
- Stream chapter pages and web novel text directly online
- Download chapters as CBZ archives for offline reading
- Download queue with real-time status, pause, resume, cancel, and retry capabilities
- Integrated CBZ and EPUB reader with 4 view modes: Webtoon continuous scroll, Left-to-Right pager, Right-to-Left pager, and Vertical pager
- Ambilight ambient glow lighting effect around reader viewports
- Export chapters as PDF documents or EPUB3 books
- Reading progress tracked per chapter with local storage and cloud synchronization
- AniList and MyAnimeList auto-tracking upon chapter completion
- Reading statistics dashboard: chapters read, pages turned, reading streaks, provider distribution, reading pace, and category distribution

### Library Organization
- Grid and list view toggles with cover card thumbnails
- Configurable dynamic grid column counts (2 to 6 columns)
- Multi-criteria sorting: alphabetical, last read, most unread, most downloaded
- Filter options: Subscribed, Downloading, Failed, Has Unread, Downloaded Only, Started, Completed
- Batch selection mode: multi-select overlay with bulk download, bulk delete, and category assignment
- Custom category creation with arbitrary manga assignment
- Unread chapter count badges and download status indicators on cards
- Contextual resume buttons ("Start Reading", "Continue Ch. X", "Re-read Ch. X")

### Reader Experience
- 4 reading modes: LTR pager, RTL pager, webtoon vertical continuous scroll, and vertical pager
- Webtoon dynamic scroll tracking with continuous viewport intersection observation
- In-reader image processing filters: Brightness, contrast, grayscale, inverted colors, sepia
- Crop borders toggle for page-based and webtoon reading
- Webtoon side padding slider (0 to 80 pixels)
- Dual-page spread layout options: Auto, Always On, Off
- Configurable tap navigation zones: Default, Left-Navigation, Edge-Only, Disabled
- Image prefetching for subsequent pages (up to 3 pages ahead)
- Seamless chapter transition screens
- Incognito mode to suppress history recording

### Manga Discovery and Metadata
- Server-side discovery endpoints (`/api/discovery/popular`, `/api/discovery/latest`) with file-backed caching
- Interactive source toggles for filtering active providers
- Image proxy with TLS fingerprint impersonation and referrer headers for web CORS bypass
- URL structure for direct reading routes (`/read/:title-slug-:extCode/:chapterSlug`)
- Manual metadata editing (custom title, cover URL, synopsis override)
- Source migration workflow to switch a series to an alternate provider
- Chapter bookmarks and scanlator filters

### Performance and Caching
- TanStack Query v5 state management with fine-grained stale times
- Instant tab revisits using cached data without window focus re-fetches
- IndexedDB storage for offline Web PWA assets and local imports
- GPU-composited page transitions without layout recalculation

---

## Native Platform Capabilities

### Android Native ([manga-dl-android](https://github.com/zenmisan/manga-dl-android))
- Pure Kotlin and Jetpack Compose user interface matching Material Design 3 guidelines
- Local database storage via Android Room SQLite
- On-device scraper execution using embedded QuickJS runtime
- Direct networking via OkHttp with custom headers, bypassing backend proxies
- Hardware volume rocker interception for physical page turning
- Screen keep-awake management while reader viewport is active
- Biometric authentication via Android `BiometricPrompt`
- Status bar ambilight coloring dynamically sampled from current page art
- Background library updating via Android WorkManager
- Direct file export to standard Android storage directories

### Windows Native ([manga-dl-windows](https://github.com/zenmisan/manga-dl-windows))
- Built with Microsoft WinUI 3, Windows App SDK, and .NET 10
- High-performance C++20 dynamic library (`MangaDl.Native`) for Direct2D hardware acceleration, image decoding, and border cropping
- Windows 11 Fluent Design alignment including Mica window backdrops and custom titlebar controls
- Local database storage via SQLite-net with MVVM architecture (`CommunityToolkit.Mvvm`)
- Local filesystem chapter storage with arbitrary user-specified download paths
- System tray minimization and Windows notification toasts
- Discord Rich Presence integration via local IPC pipe

### Linux Native ([manga-dl-linux](https://github.com/zenmisan/manga-dl-linux))
- Built with GTK4, libadwaita, and Vala / C
- Adheres to GNOME Human Interface Guidelines with system theme and accent color detection
- Extremely low memory footprint and rapid startup
- Local SQLite3 persistence
- Embedded QuickJS runtime with libsoup3 direct networking

---

## Planned Enhancements

| Feature | Target | Priority | Notes |
|---------|--------|----------|-------|
| Web novel offline voice synthesis (TTS) | Android / Desktop | Medium | Native platform speech engines |
| RAR / CBR comic archive decompression | All | Medium | Native archive extraction support |
| Bulk local directory library scanning | Desktop | Medium | Scan external manga collections on disk |
| Tablet multi-column reading layout | Web / Android | Low | Adaptive layouts for large tablets |
| Windows Hello integration | Windows | Low | Native biometric unlock on PC |
| Flatpak packaging | Linux | Low | Flathub distribution |

---

## Architecture Overview

```
Shared Source Layer:
  backend/app/services/extensions/*.js  --> Reused across Web, Android, Windows, Linux

Web Platform (manga-dl):
  Frontend: React 19 + TypeScript + Vite + Tailwind CSS + Zustand
  Backend: FastAPI + SQLAlchemy async + SQLite / Supabase PostgreSQL
  Hosting: Firebase Hosting (Web PWA) + Render (Backend API)

Native Mobile Platform (manga-dl-android):
  UI: Jetpack Compose + Material 3
  Engine: Embedded QuickJS + OkHttp direct client
  Storage: Room SQLite + Android Filesystem

Native Desktop Platforms (manga-dl-windows & manga-dl-linux):
  Windows: WinUI 3 + .NET 10 + C++20 Direct2D + SQLite-net
  Linux: GTK4 + libadwaita + Vala / C + SQLite3 + Soup3
```

## Backend Environment Configuration

| Variable | Description |
|---|---|
| `API_KEY` | Secret key protecting private administrative endpoints |
| `DATABASE_URL` | SQLAlchemy connection string (SQLite locally, PostgreSQL in production) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key for cloud storage management |
| `SUPABASE_JWT_SECRET` | Secret verifying user JWT bearer tokens |
| `CORS_ORIGINS` | Comma-separated list of allowed origins |
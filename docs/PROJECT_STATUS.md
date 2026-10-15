# manga-dl — Project Status and Roadmap

Last updated: 2026-10-08

A cross-platform manga and web novel reading ecosystem:
- **Web:** React 19 PWA ([manga-dl](https://github.com/zenmisan/manga-dl))
- **Android:** Native Kotlin and Jetpack Compose ([manga-dl-android](https://github.com/zenmisan/manga-dl-android))
- **Windows:** Native WinUI 3, Windows App SDK, .NET 10, C# and C++20 ([manga-dl-windows](https://github.com/zenmisan/manga-dl-windows))
- **Linux:** Native GTK4, libadwaita, and Vala / C ([manga-dl-linux](https://github.com/zenmisan/manga-dl-linux))
- **Self-Host:** Docker Compose containerized environment ([manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost))
- **Backend:** FastAPI (Python 3.14) infrastructure, CORS proxy, and cloud synchronization

---

## Implementation History and Milestones

### Phase 1–6: Foundational Core and Web Reader
Initial development of library management, reader engine, download queues, reading history, reading statistics, tracker integrations (AniList, MAL, Kitsu, MangaUpdates, Shikimori, Bangumi), backup mechanisms, categories, bookmarks, PWA support, ComicInfo.xml metadata generation, four reading modes, dual-page spreads, tap navigation zones, and themes.

### Phase 7–8: Early Hybrid Desktop and Mobile Shells (Legacy)
Early exploratory packaging using Tauri v2 (Rust) for desktop and Capacitor (WebView) for Android. Validated volume rocker controls, filesystem saving, and local notification patterns. These wrappers have since been superseded by the standalone native repositories.

### Phase 9: UI Polish and Advanced Library Controls
Batch selection mode (overlay with bulk download, bulk delete, and category assignment), dynamic grid column count slider (2 to 6 columns), webtoon padding adjustments, crop borders toggle, scheduled auto-backups, extension enable/disable toggles, per-manga notification muting, metadata editing modal, tracker synchronization modals, history date filtering, reading pace analytics, and EPUB parsing.

### Phase 10: Extension-First Architecture
Removed Python scraper providers in favor of an extension-first architecture. Manga sources are standalone JavaScript files executed client-side. Added backend proxy endpoints for web CORS bypass (`/api/manga/proxy/html`, `/api/manga/proxy/json`, `/api/manga/image-proxy`). Modernized Asura Scans and MangaKatana source scrapers.

### Phase 11: Landing Page and Route Architecture
Created marketing landing page at `/` with SEO metadata, OpenGraph tags, and 100dvh hero layout. Supabase session state wired to protected routes, relocating the primary application dashboard to `/r`.

### Phase 12: Mobile-First Layout Restructure
Bottom navigation bar implemented for mobile viewports (Library, Updates, Search, Browse, More). Dedicated More view with Incognito toggle, History, Stats, and Settings shortcuts. Hero cover layout and smart resume actions on series details.

### Phase 13: Modular Settings Architecture
Refactored monolithic settings into categorized sub-pages: General, Reader, Library, Trackers, and System. Sidebar layout for desktop and tablet viewports, tab navigation for mobile.

### Phase 14: Cloud Metadata Overrides
Created `manga_overrides` database table to store per-user metadata modifications (custom title, cover URL, synopsis). Added backend synchronization endpoints and client synchronization logic.

### Phase 15: Read-Based Reading Engagement Metrics
Added backend `/users/me/stats` endpoint aggregating historical reading records from `ReadingProgress` instead of download timestamps. Updated activity charts and heatmaps to reflect real reading engagement.

### Phase 16: Biometric Protection and Sync Network Guards
Integrated biometric authentication session guards and conditional network/battery status synchronization checks.

### Phase 17: Multi-Device Session Guards and Direct Asset Delivery
Refactored session verification to eliminate visual flashes during authentication checks. Updated typography to Anton (display headers) and Inter (body copy). Added direct release downloads via cloud storage.

### Phase 18: Desktop Visual Polish and Keyboard Navigation
Vertical active accent indicator on navigation sidebars. Two-column sticky manga detail layout for wide displays. Reader keyboard navigation shortcuts tutorial overlay.

### Phase 19: Architecture Modularization and Performance Optimizations
Refactored `Reader.tsx` (1130 lines down to 169 lines) by extracting purpose-built hooks (`useReaderData`, `useReaderNavigation`, `useReaderKeybindings`, `useAndroidFeatures`) and components (`ReaderHeader`, `ReaderViewport`, `ShortcutOverlay`). Adopted GPU-composited tab transitions and TanStack Query v5 stale-while-revalidate caching.

### Phase 20: Backend Services Layer Extraction
Extracted business logic from routers into dedicated domain services: `archive_converter.py`, `library_service.py`, `js_extensions.py`, `proxy_service.py`, `manga_service.py`, `device_service.py`, and `user_service.py`. Extracted JavaScript source scrapers into standalone files in `backend/app/services/extensions/`.

### Phase 21: Authentication Hardening and Onboarding
Integrated Google Sign-In via Firebase Authentication. Added automated username generator (`/api/users/generate-username`). Implemented support ticket submission and transactional email receipts. Enforced strict JWT authentication on user-scoped endpoints.

### Phase 22: Discovery Engine and Source Reliability
Server-side discovery endpoints (`/api/discovery/popular`, `/api/discovery/latest`) with file-backed caching. Added `SourceToggleModal` in search. Tuned scraping selectors and User-Agent impersonation for top providers.

### Phase 23: Local Build Provisioning and Hygiene
Automated local Android SDK toolchain provisioning (`/home/zenmi/Android/Sdk`). Cleaned repository tracking for database and cache files.

### Phase 24: Real-Time Webtoon Scroll Tracking and Visual Polish
Real-time viewport intersection observer in reader view synchronizing the active page counter and progress bar. In-chapter visual reading percentage indicators on chapter cards. Contextual resume button labels. Dynamic tab titles and enriched social meta tags.

### Phase 25: Documentation Overhaul
Complete changelog generation across all versions in `CHANGELOG.md` and synchronization of project documentation.

### Phase 26: Standalone Native Platform Transition (Current)
Transitioned the multi-platform vision from hybrid wrappers (Tauri, Capacitor) to dedicated, platform-native applications across dedicated repositories:
- **[manga-dl-android](https://github.com/zenmisan/manga-dl-android):** Native Kotlin and Jetpack Compose mobile client with Room SQLite, OkHttp direct networking, on-device QuickJS scraper execution, and Firebase DataConnect synchronization. Currently in finishing phases.
- **[manga-dl-windows](https://github.com/zenmisan/manga-dl-windows):** Native WinUI 3 and Windows App SDK desktop application on .NET 10 with high-performance C++20 dynamic library (`MangaDl.Native`) for Direct2D hardware acceleration, image decoding, and border cropping. Currently in finishing phases.
- **[manga-dl-linux](https://github.com/zenmisan/manga-dl-linux):** Native GTK4, libadwaita, and Vala / C client tailored to the GNOME desktop environment with embedded QuickJS and libsoup3.
- **[manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost):** Docker Compose deployment stack for private self-hosted servers.
- **[manga-dl](https://github.com/zenmisan/manga-dl):** Remains the central source of truth for shared JavaScript extensions (`backend/app/services/extensions/`), design tokens, and the official Web PWA client.

---

## Ecosystem Architecture Summary

```
Core Web and Backend Repository (manga-dl):
  frontend/
    src/pages/          React page components
    src/hooks/          Domain hooks (useDashboardData, useMangaDetail, useReaderData, etc.)
    src/lib/            API clients, stores, caching, extension manager
  backend/
    app/api/            Lightweight FastAPI routers
    app/services/       Business domain logic services
    app/services/extensions/  Shared JavaScript scrapers (used by all platforms)

Native Android Repository (manga-dl-android):
  app/src/main/java/    Kotlin + Jetpack Compose UI, Room DB, OkHttp client, QuickJS runtime

Native Windows Repository (manga-dl-windows):
  src/MangaDl.App/      WinUI 3 XAML views, viewmodels, theme tokens
  src/MangaDl.Core/     .NET 10 models, domain interfaces, business logic
  src/MangaDl.Native/   C++20 dynamic library for Direct2D image decoding and border crop

Native Linux Repository (manga-dl-linux):
  src/                  GTK4 + libadwaita UI, Vala / C logic, QuickJS bridge

Self-Host Repository (manga-dl-selfhost):
  docker-compose.yml    FastAPI backend + Nginx web stack containerization
```

## Technology Stack by Platform

| Component | Technology |
|---|---|
| Web Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query v5, Zustand |
| Backend Sync Server | FastAPI, SQLAlchemy async, SQLite locally, Supabase PostgreSQL in prod |
| Shared Extensions | JavaScript (ES2022) running in Web Workers (Web) or embedded QuickJS / ChakraCore (Native) |
| Android Native App | Kotlin, Jetpack Compose, Material 3, Room SQLite, OkHttp |
| Windows Native App | C#, .NET 10, WinUI 3, Windows App SDK, C++20 (`MangaDl.Native`), SQLite-net |
| Linux Native App | GTK4, libadwaita, Vala / C, SQLite3, libsoup3 |
| Cloud Services | Supabase (PostgreSQL, Storage, Auth), Firebase (Hosting, Auth, DataConnect) |
# Changelog

All notable changes to **manga-dl** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **PT Serif Typography for Manga Titles:** Adopted Google Font `PT Serif` (`family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700`) across manga detail views (`MangaDetail.tsx`, `MangaInfoCard.tsx`, `LocalMangaDetail.tsx`), reader topbar (`ReaderHeader.tsx`), and all manga cards (`.manga-card-title`, `DashboardMangaCard.tsx`, `Search.tsx`, `Browse.tsx`), replacing heavy all-caps blocky sans-serif typography with an elegant editorial serif aesthetic.
- **Route-Level Code Splitting (`React.lazy`):** Converted all secondary route pages (`Reader`, `MangaDetail`, `LocalMangaDetail`, `StatsPage`, `SettingsLayout` and subtabs, `DownloadsPage`, `HistoryPage`, `SourcesPage`, `DownloadHub`, `BrowsePage`, `NotificationsPage`, `MorePage`, `SearchPage`, etc.) to dynamic imports wrapped in `<Suspense fallback={<PageLoader />}>`. Slashed initial monolithic bundle size from 1.41 MB down to 906 kB (~35% reduction), with dedicated chunks loaded on-demand.
- **Android Double-Tap Back to Exit:** Implemented `useAndroidBackButton` in `frontend/src/hooks/useAppSetup.ts` leveraging `@capacitor/app`. On the main dashboard root (`/r`) or login, pressing back displays a toast confirmation (*"Press back again to exit"*); pressing back again within 2000ms safely exits the application. On subroutes, cleanly navigates back one level.
- **Reader Native Fullscreen Mode:** Added HTML5 Fullscreen API toggle with dynamic `Maximize2` / `Minimize2` button in `ReaderHeader.tsx` and keyboard shortcut `'f'` / `'F'` in `useReaderKeybindings.ts`. Automatically tracks fullscreen changes via `fullscreenchange` events.
- **Dashboard Category Filter Persistence:** Initialized `activeCategory` in `useDashboardData.ts` from URL query parameter `?category=` with `sessionStorage` fallback. Automatically synchronizes URL search state using `window.history.replaceState` on category tab selection, so returning from manga detail or reloads preserves the active category view.
- **Per-Source Browse Page (`/browse/source/:sourceId`):** Added dedicated source catalog browsing in `Browse.tsx` and linked from `Search.tsx` swimlanes, supporting both server-side discovery cache and fallback to browser extension scrapers with Popular/Latest tabs.
- **Dynamic Page Titles:** `usePageTitle` hook in `frontend/src/lib/usePageTitle.ts` sets `document.title` on mount and resets to the default `'manga-dl | Read & Download Manga from 50+ Sources, Free'` on unmount. Applied across all 15 app routes: Dashboard, Library, Search, Downloads, History, Stats, Updates, Sources, Settings (all sub-pages), Profile, Login, Register, Terms, and the Reader.
- **Enhanced OpenGraph & Social Cards:** Updated `frontend/index.html` with absolute canonical image URL (`https://manga-dl.web.app/Manga-dl1.png`), `og:site_name`, `og:image:width`/`og:image:height`, and `twitter:card` / `twitter:image` tags. Replaced em dash separators with vertical bar (`|`) in og:title and twitter:title for broader rendering compatibility.
- **Webtoon Dynamic Scroll Tracking:** Replaced unreliable `IntersectionObserver` with a scroll listener in `Reader.tsx` that computes which page's center is closest to the 35% viewport mark on every scroll event. Fires once on a 200ms timeout after mount to set initial page. Updates the active page indicator and bottom scrubber in real time during vertical webtoon reading.
- **In-Chapter Progress Bar:** Visual blue `h-[2px]` bar along the bottom edge of each chapter row in `MangaChaptersSection.tsx`. Reads `localStorage` keys `manga-dl-pg:{provider}:{mangaId}:{chapterId}` (last page) and `manga-dl-pg-total:...` (total pages) to compute read percentage. Renders when `readPct > 0 && readPct < 100`; hides for unstarted and fully-read chapters.
- **Dynamic Chapter Resume Labels:** `useMangaChaptersFilter.ts` now returns contextual CTA text: `Start Reading` (no chapter started), `Continue Ch. X` (in progress), `Re-read Ch. X` (all read). `LocalMangaDetail.tsx` uses the same pattern. Fixed `Ch. 0` edge case — uses chapter title when number is 0.

### Changed
- **MangaDetail Adaptive Layout:** Rating stat card is conditionally hidden when `userRating === 0`, collapsing the 3-column stats grid to 2 columns automatically. Genre badges show first 3 with full contrast (`bg-white/10 border-white/20 text-zinc-200`) and remaining genres muted (`bg-white/[0.03] text-zinc-500`), capped at 8 total with a `+N more` pill. Synopsis strips raw Markdown (`**bold**`, `*italic*`, `[link](url)`, stray underscores) before rendering.
- **Chapter List Spacing:** Row padding increased to `p-5 md:p-6`. Chapter title uses `text-base md:text-lg leading-snug`. Subtitle (number/scanlator) uses `text-xs mt-2` and is omitted when `chapter.number === 0`. Row gap widened to `space-y-2.5`. Red left-border wall on unread chapters removed — only read chapters carry the `border-l-4 border-l-zinc-700` treatment. READ action buttons changed from solid to outline style (`border border-red-500/50 text-red-400 hover:bg-red-500/10`).
- **Reader Stale Closure Fix:** Added `currentPageRef` in `useReaderData.ts` (synced to `currentPage` via a separate `useEffect`). Cleanup function in the main data-loading `useEffect` now calls `saveOnlineProgress(currentPageRef.current)` instead of the stale closure value, ensuring the correct page is saved when the reader unmounts.
- **Reader Back Navigation:** Back button and error-state "Go Back" link both use `navigate(-1)` instead of constructing and pushing a new URL. Eliminates the ping-pong history issue where pressing back from `MangaDetail` would push a new `Reader` entry, requiring two taps to actually leave.
- **Total Pages Persisted:** `useReaderData.ts` saves `localStorage.setItem(\`manga-dl-pg-total:...\`, pages.length)` immediately after pages load, enabling the chapter progress bar to compute percentages without the user finishing the chapter.

### Fixed
- **Search Zero-Result Swimlane Cleanup:** In `DiscoverySwimlane.tsx`, guarded against ghost headers and empty spacing when a discovery category or source finishes loading with 0 results by returning `null` when `!loading && items.length === 0`.
- **Komga & Suwayomi Provider Shutdown Crash:** Fixed `AttributeError: 'KomgaProvider' object has no attribute '_session'` on backend reload/shutdown by calling `super().__init__()` in `KomgaProvider` and `SuwayomiProvider`. Made `Provider.close()` in `base.py` defensively verify `_session` via `getattr()`, and wrapped provider cleanup in `main.py` shutdown within a try/except block.
- **Stale Installed Extensions Auto-Pruning:** Automatically prune deprecated/defunct manga sources (`manhuaplus`, `aquamanga`, `coffeemanga`, `manhuafast`, `manhuaus`, `manhwajoy`, `sleepytranslations`, `mangakiss`, `epicmanga`, `firescans`, `kissmangain`, `mangaread`, `linkmanga`, `manhuazonghe`, `webtoonscan`, `webtoonxyz`, `whalemanga`, `woopread`, `wuxiaworldsite`, `drakescans`) across all `extensions-*` keys in `localStorage`. If any extension code returns a 404 response on `/sources/code/<id>`, `ExtensionManager` now automatically purges it from storage, permanently eliminating 404 startup noise.

### Removed
- **Redundant Metadata Edit Button:** Pencil icon button and `openMetaEdit` call removed from `MangaDetail.tsx` sidebar header. Metadata editing still accessible through dedicated settings flow.
- **Deprecated CI Workflows:** Deleted `.github/workflows/firebase-hosting-merge.yml` (auto-deployed to Firebase Hosting on every push to `main`) and `.github/workflows/firebase-hosting-pull-request.yml` (deployed PR preview channels). Hosting is now manual-only via `bunx firebase deploy --only hosting` from `frontend/`.

---

## [1.0.0] - 2026-09-01

### Added
- **Automated Local Android Toolchain:** Script-driven provisioning of Android SDK in `/home/zenmi/Android/Sdk`: `cmdline-tools`, `platforms/android-34`, `build-tools/34.0.0`, `platform-tools`. License acceptance automated. `CAPACITOR_ANDROID_STUDIO_PATH` set for Arch Linux.
- **Custom APK Naming:** Gradle `applicationVariants.all {}` block outputs `manga-dl-v1.0.apk` (release) and `manga-dl-v1.0-debug.apk` (debug) instead of `app-release.apk`.
- **Discovery Engine:** Backend endpoints `/api/discovery/popular` and `/api/discovery/latest` with file-backed JSON caching. Source-specific fetchers pull from each provider on a schedule so the browser receives catalog data without triggering live third-party requests per page load.
- **Source Toggle Modal:** `SourceToggleModal` component in `Search.tsx` lets users enable or disable individual search providers inline from the search bar without visiting the full Sources page.
- **Username Generation & Onboarding:** `/api/users/generate-username` endpoint generates available usernames from a word-pair pool. Onboarding flow triggers on first reader visit and guides the user through avatar selection and username setup.
- **Support Ticket Submission:** `/api/users/support-ticket` endpoint accepts a message and stores it in the backend database. Triggers a transactional email to the support address.
- **Transactional Email Service:** Backend email service sends welcome notification on account creation and support ticket confirmation on submission.
- **Google Sign-In:** Firebase Authentication integrated for Google OAuth. `googleSignIn()` function in `firebase.ts` creates a Supabase JWT from the Firebase credential so the same `require_jwt_user` auth path works.
- **DownloadHub Desktop Support:** `DownloadHub.tsx` detects Tauri context and surfaces native download-location folder picker; falls back to browser download for web users.

### Security
- **Strict Per-User Library Isolation:** `/api/library` and `/api/manga` endpoints switched from legacy `get_current_user` (session-based, no isolation) to `require_jwt_user` (JWT, per-user rows). Each user's library is now fully isolated.
- **Zero Hardcoded Secrets:** All client-side fallback keys (Firebase API key, Supabase URL/anon key, backend URL) removed from `firebase.ts` and `supabase.ts`. Must be provided via `.env` (`VITE_FIREBASE_*`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`).
- **Repository Hygiene:** Untracked `backend/manga_dl.db` (SQLite) and `.firebase/` cache directories from git index; enforced in `.gitignore`.
- **Firebase Hosting Binary Exclusion:** Added executable/binary ignore rules to `firebase.json` to prevent Spark plan violations when large release binaries exist in the working tree.

### Changed
- **Capacitor Config Alignment:** `appId` in `capacitor.config.ts` set to `com.zenmisan.mangadl` to match Gradle `applicationId`.
- **Unified Loading Indicators:** All loading screens migrated to `ThemedSpinner` and `ThemedLoadingScreen` components for consistent styling across web, desktop, and Android.
- **Profile State Management:** `Profile.tsx` state and loading logic reorganized. Session management extracted to custom `useAppSetup` hook.

---

## [0.9.0] - 2026-08-06

### Added
- **MangaDetail Hero Redesign:** Blurred cover art background behind the entire detail header. Floating "Smart Binge" FAB triggers sequential chapter download queue. Action buttons unified into a consistent row.
- **Custom Glass Select:** `GlassSelect` dropdown component with backdrop blur, replacing all native `<select>` elements in the reader settings panel.
- **Mobile Bottom Navigation:** 5-tab bar (Library · Updates · Search · Browse · More) implemented for Capacitor Android at `/r` root, replacing sidebar on small screens.
- **"More" Page:** Dedicated `/r/more` route for mobile with links to Incognito, History, Stats, Settings, and Info.
- **Import Guide Page:** Interactive `/r/import` tutorial page with step-by-step instructions for uploading CBZ/ZIP files.
- **Biometric App Lock:** `@aparajita/capacitor-biometric-auth` integrated in `App.tsx`. Toggle in General settings. Session unlock guard (`isUnlockedRef`) prevents infinite re-prompt loops on app resume.
- **WiFi-Only & Charging-Only Sync Gates:** `@capacitor/network` and Battery Status API check conditions before triggering auto-download sync. Configurable toggles in System settings.
- **Storage Limit Display:** Stats page shows current storage usage against quota with a visual progress bar.
- **Rounded Pill Filters:** Library, Downloads, and History filter chips redesigned as compact rounded pills with selected-state accent.
- **`SourceToggleModal` (early version):** Sources modal with enable/disable toggle per extension accessible from Search page.

### Changed
- **Theme Colors:** Splash screen animation and global color tokens updated. AMOLED dark mode uses true `#000000` background.
- **Stats & Downloads Layout:** Downloads page gains a three-tab layout (Active · Completed · Failed). Stats page layout improved with better data density.
- **Settings Simplification:** Settings sub-pages further trimmed for improved readability.

### Fixed
- **Supabase Session Persistence:** Disabled automatic session detection and persistence in `createClient` options to prevent cross-device session leakage.
- **Asset Paths:** Fixed `index.html` references to icons and web manifests (missing `/` prefix caused 404 on sub-routes).
- **MangaDex Detail 404 Fallback:** `useMangaDetail` gracefully handles missing cover image relationships; falls back to placeholder without throwing.
- **AsuraScans Slug Resolution:** Updated slug parsing to handle Asura's Astro migration URL format.

---

## [0.8.0] - 2026-07-22

### Added
- **Smart URL Routing:** Clean canonical URLs for manga details (`/r/manga/:title-slug-:extCode`) and reading sessions (`/read/:title-slug-:extCode/:chapterSlug`). URL slugs derived from sanitized manga titles for human-readable, shareable links.
- **Reader Keyboard Shortcuts Overlay:** `ShortcutOverlay.tsx` glassmorphic modal appears on first reader visit explaining keyboard controls (arrow keys, Space, Esc). State stored in `localStorage`; dismissed permanently on acknowledgement.
- **Two-Column MangaDetail Layout (Desktop):** Wide screens split the detail page into a sticky left cover panel and a scrollable right chapters panel. Maintains single-column on mobile.
- **Tauri Custom Titlebar:** Custom window chrome for desktop builds with drag region and macOS-style traffic-light minimize/maximize/close buttons via `@tauri-apps/api` dynamic import.
- **SEO & Indexing:** `public/sitemap.xml` covering all core routes and `public/robots.txt` with `Allow: /` directive. Backend `/sitemap.xml` and `/robots.txt` endpoints also serve these files.
- **Keep-Alive Workflow:** GitHub Actions cron workflow pings `/health` every 10 minutes to prevent Render's free tier from sleeping.
- **TanStack Query v5:** `QueryClient` wraps the entire app in `main.tsx`. Central query hooks in `src/lib/queries.ts` with per-endpoint stale times. All major pages (Dashboard, Stats, Updates, History, Sources) migrated to `useQuery`.
- **Tab Animation Performance:** `AnimatePresence` mode changed from `mode="wait"` (sequential ~500ms) to `mode="sync"` (overlapping) with 80ms opacity-only transitions. Eliminates layout recalcs — opacity is GPU-composited.

### Changed
- **Reader Refactor (1130 → 169 lines):** `Reader.tsx` extracted into `useReaderData.ts` (manifest fetch, MAL/AniList sync, debounced save, prefetch), `useAndroidFeatures.ts` (back button, KeepAwake, ambilight), `useReaderNavigation.ts` (tap zones, spread logic, keyboard/volume keys), `ReaderHeader.tsx`, `ReaderViewport.tsx`, `ShortcutOverlay.tsx`.
- **Backend Services Layer:** Business logic extracted from monolithic route files into `backend/app/services/`: `archive_converter.py`, `library_service.py`, `js_extensions.py`, `proxy_service.py`, `manga_service.py`, `device_service.py`, `user_service.py`.
- **Standalone JS Extension Files:** Extension JavaScript extracted from Python string literals into `backend/app/services/extensions/*.js` files. Fixed `mangadex.js` chapter title formatting, `mangakatana.js` Popular/Latest scrapers, `asurascans.js` AST fallbacks, `omegascans.js` ordering params. Added `madara.template.js` and `mangathemesia.template.js` dynamic generators.
- **Frontend Hooks Composition:** `useMangaDetail.ts` reduced from 456 to ~220 lines by extracting `useMangaTracker.ts` (AniList/MAL sync) and `useMangaChaptersFilter.ts` (search, sort, read filters). `useReaderNavigation.ts` reduced by extracting `useReaderKeybindings.ts`.
- **Public Library Access:** Removed hardcoded admin restriction from `library.py` — all authenticated users can now read and manage their own library.

### Fixed
- **Android CORS:** Added `https://localhost` and `capacitor://localhost` to `CORS_ORIGINS`. Capacitor `androidScheme: 'https'` makes the WebView origin `https://localhost`, causing all API calls to be blocked previously.
- **Android HTTP to LAN backend:** `network_security_config.xml` replaced invalid `<domain>` CIDR notation with `<base-config cleartextTrafficPermitted="true">` so self-hosted LAN backends work.
- **Backend Unreachable Banner:** Banner now auto-dismisses after 30 seconds and has a working close button. Re-appears if backend goes offline again after recovering. Dismiss state decoupled from `isError` to prevent flicker.
- **Blank Page at `/r`:** Fixed race condition where the app shell rendered before the Supabase session check completed, causing a blank page on fresh visits.
- **Android Biometric Loop:** Added `isUnlockedRef` guard in `App.tsx` preventing infinite biometric re-prompt when the app is focused or resumed.

### Removed
- **`ux-fixes-p0-p1` placeholder tracks:** Cleaned up stale `.agents` track entries from the backlog.

---

## [0.7.0] - 2026-07-05

### Added
- **Desktop Sidebar Active Indicator:** Red vertical accent bar on the left edge of the active navigation link in the desktop sidebar.
- **Reader Keyboard Shortcuts (early):** Glassmorphic shortcuts modal for first-time reader visitors.
- **Windows Setup Script:** `setup.bat` quick-start script for Windows development environment.
- **Sign-Out & Session Cleanup:** `signOut()` function in `App.tsx` clears all `localStorage` keys and Supabase session, then redirects to landing page.

### Changed
- **Onboarding Flow Refactor:** First-run onboarding moved to trigger dynamically on first reader entry rather than blocking the app startup. Session state persisted on device so re-logins don't re-trigger setup.
- **Admin Access Control:** Backend endpoints for downloads and manga management restricted to `zenmisan@gmail.com` until public release is ready.
- **Extension Evaluation:** Worker-based extension sandboxing replaced with direct main-thread `eval()` for simpler lifecycle management and faster cold start.
- **Select Component Styling:** All `<select>` elements standardized with glass morphism styling and consistent dark-theme contrast.

### Fixed
- **Viewport Issue:** API base URL resolution fixed — no longer hard-coded; reads from `VITE_BACKEND_URL` with intelligent fallback for local development.
- **Backend Unreachable:** Resolved a regression introduced in the discovery fetch that broke the local development backend connection.

---

## [0.6.0] - 2026-06-15

### Added
- **Extension-First Architecture:** All Python scraper providers removed from backend. MangaDex, MangaKatana, AsuraScans, OmegaScans Python code deleted. Backend is now infra-only (proxy + DB + downloads).
- **Built-In JS Extensions:** MangaDex, AsuraScans, OmegaScans, MangaKatana defined as JavaScript extensions in `backend/app/services/js_extensions.py`. Each extension runs in a Web Worker managed by `ExtensionManager`.
- **CORS Proxy Endpoints:** `/manga/proxy/html`, `/manga/proxy/json`, `/manga/image-proxy` so browser-side extensions bypass CORS when scraping third-party sources.
- **Community Extension Marketplace:** Source toggle UI lists Keiyoushi index extensions (500+) with language filter, search, install/uninstall, enable/disable, and update checking. Note: community extensions (Android APKs) are disabled for browser install; only built-in JS extensions run on web.
- **Search "All" Tab Fan-Out:** Parallel extension fan-out replaces the deleted backend `/search` aggregate endpoint. Results merged and de-duplicated by source.
- **Full Landing Page:** Root `/` route gets a dedicated marketing page with hero section, feature highlights, platform download links, and OG meta tags. App shell moved to `/r`.
- **Auth-Aware Routing:** Supabase session state wired to route guards. Logged-in users skip landing page and go straight to `/r`. Logging out redirects back to `/`.
- **Mobile Bottom Navigation (initial):** 5-tab bottom bar for Android at `/r`.
- **Settings Restructure:** Monolithic `Settings.tsx` (~1000 lines) split into categorized sub-pages: General, Reader, Library, Trackers, System. Sidebar layout on desktop, tab-strip on mobile.
- **Metadata Cloud Sync:** `manga_overrides` Supabase table stores per-user title/cover/description overrides. `PUT /users/manga-overrides` and `GET /users/manga-overrides` endpoints. `syncMetaOverridesFromCloud()` pulls overrides into `localStorage` on login.
- **Read-Based Heatmap:** `/users/me/stats` endpoint aggregates reads from `ReadingProgress` table instead of downloads. Frontend Stats page prioritizes read-based metrics; falls back to download counts for offline users.
- **Tracker Settings Panel:** `TrackerSettings` component in Settings → Trackers for managing AniList, MAL, Kitsu, MangaUpdates, Shikimori, and Bangumi integrations from one place.
- **In-App Update Checker:** More page surfaces GitHub Releases API check. Android opens APK URL for native install.
- **Email Redirect on Registration:** Registration flow sends email verification link that redirects user back into the app.

### Changed
- **Subscribe Payload:** Frontend must send manga metadata in the subscribe request body — backend has no provider to fetch it from after scraper removal.
- **FastAPI Trailing-Slash Fix:** `FastAPI(..., redirect_slashes=False)` prevents CORS-breaking 307 redirects on routes with trailing slashes.

### Fixed
- **Android Gradle Build:** `kotlin-android` plugin added to `:app` module. Kotlin Gradle plugin bumped to 2.1.0 to satisfy `@capacitor/filesystem` stdlib version requirement.
- **Broken Cover Images:** Error boundary in `DashboardMangaCard` and `MangaInfoCard` handles missing or 403 cover art without breaking the layout.
- **Search Not Working:** Fixed extension fan-out race condition where results from slow extensions were silently dropped.
- **MangaKatana Extension (web):** Updated extension for web deployment — title selector and image array parser repaired.

---

## [0.5.0] - 2026-06-13

### Added
- **Read Tracking & Bookmarks:** MangaDetail gains a "Mark Read" toggle per chapter. Dashboard shows read-count badges. `ReadingProgress` table and database migration added to backend.
- **Categories System:** User-defined library categories. Manga can be assigned to multiple categories. Dashboard filters by category. Database migration adds `user_categories` and `manga_notes` tables.
- **Reading Goals:** Monthly chapter target and yearly manga target with progress bars. Stored in `localStorage`.
- **AniList + MAL Auto-Sync (Expanded):** Chapter completion in Reader automatically updates AniList progress (chapters_read) and MAL status (via PKCE OAuth) without requiring manual confirmation.
- **Tracker Linking:** `useMangaTracker.ts` hook searches AniList and MAL for matching titles from the MangaDetail page. Found entries displayed with score, status, and sync button.
- **Self-Hosted Source Support:** Komga and Suwayomi server URLs configurable in Settings. Extensions generated at runtime for user-provided server addresses.
- **Desktop Background Sync:** Tauri app runs a Rust `tokio` background task that polls subscribed manga for new chapters every 15/30/60/120 minutes (configurable). OS notification (tauri-plugin-notification) fires when new chapters are found.
- **WiFi / Charging Sync Conditions:** Settings toggles gate auto-download sync behind network type and charging state checks.
- **Reader Enhancements:** Dual-page spread (Auto/Always/Off), tap zone layouts (Default/L-Nav/Edge/Disabled), volume key page navigation (Kotlin VolumeKeys plugin for Android + physical keyboard on desktop), image prefetch (next 3 pages), webtoon side-padding slider.
- **Sync Status Tracking:** `chapters_downloading` and `chapters_failed` fields added to library folder items. Dashboard shows per-manga download/failure counts.

### Changed
- **Large-Scale Architecture Upgrade:** Started major refactor of both frontend and backend for extensibility and reliability (commit: "started large scale upgrading").

### Fixed
- **Broken Images:** Fixed cover image loading errors in Reader and MangaDetail after Supabase proxy URL format changed.
- **Build Errors:** Resolved TypeScript type conflicts introduced during the tracker integration.

---

## [0.4.0] - 2026-06-07

### Added
- **Online Reading (Stream without Download):** Chapter pages fetched directly from source proxied through `/manga/image-proxy`. No CBZ download required to read.
- **Local Library Persistence:** IndexedDB stores downloaded CBZ files. Library page shows both cloud (Supabase) and local entries. Re-opens last read page on resume.
- **Firebase Environment Variables:** `VITE_FIREBASE_*` env vars replace hardcoded config in `firebase.ts`.
- **Reading Progress Tracking:** `reading_progress` table stores provider, manga ID, chapter ID, page number, and timestamp. Cloud sync on chapter close. Resume from last page on reopen.
- **Device Authentication:** 3-device limit enforced. `device_service.py` handles device fingerprinting, registration, 30-day forfeiture lock.
- **MAL Auto-Sync (Initial):** `Reader.tsx` marks chapter complete on MAL when the last page is reached (if MAL token set in Settings).
- **Stats Page (Initial):** `/r/stats` route showing total chapters downloaded, pages, provider breakdown, and 30-day download chart.

### Changed
- **Library API Refactor:** Unified `/api/library` endpoints to return both local folder items and Supabase-stored manga in a single response.

---

## [0.3.0] - 2026-06-03

### Added
- **Tauri Desktop App:** `src-tauri/` Rust shell initialized. `tauri.conf.json` configured with app identifier, window settings, and bundle targets. GitHub Actions workflow for desktop release (AppImage / `.deb` / `.exe` / `.dmg`). Java 21 required for Gradle; Android release workflow also added.
- **Local CBZ Manga (JSZip):** Upload CBZ/ZIP files from disk → browser IndexedDB → read locally without a backend. JSZip extracts images from the archive in the browser. EPUB support added (OPF spine parsing extracts images as ordered pages).
- **Predictive Image Prefetch:** Reader prefetches the next 3 page images into browser cache using `new Image()`. Eliminates visible loading on page turn.
- **Upscaling Option:** Reader settings gain an image upscaling toggle using CSS `image-rendering: pixelated` / `crisp-edges`.
- **P2P Resource Broadcasting:** Experimental inter-tab broadcast channel sends prefetched image blobs between open reader tabs (same origin).
- **Database Migrations:** Initial migration scripts for `downloads` table new columns; separate migration for `reading_progress`, `user_categories`, `manga_notes`.

### Fixed
- **MangaKatana Health:** Extension health check repaired; provider was returning 404 on the search endpoint due to path mismatch.
- **GitHub Actions Workflows:** Bun-compatible install commands; Java version check added; workflow `permissions` block added for artifact upload.

---

## [0.2.0] - 2026-05-31

### Added
- **Manga Reader (Initial):** `Reader.tsx` with page-by-page image display. Back button, chapter navigation, page counter.
- **Bulk Chapter Download:** "Download All" button queues all undownloaded chapters for a manga in a single action with per-chapter loading state.
- **Supabase Cloud Storage:** CBZ files uploaded to Supabase Storage bucket on download completion. Eviction logic removes old files when bucket quota is exceeded. Download directly from Supabase URL.
- **PDF Conversion:** "Export as PDF" converts a downloaded CBZ to a multi-page PDF using `pdf-lib`. Progress bar shows conversion status. Download via `<a download>` blob URL.
- **File Upload Progress:** Dashboard upload UI shows a progress bar during CBZ upload with byte-level tracking.
- **Database Migration:** New columns added to `downloads` table for tracking upload status and cloud URL.
- **WebSocket Download Queue:** Download status updates streamed to frontend over WebSocket connection with API key auth. Download history deduplication prevents repeated entries.
- **Favicon Redesign:** `favicon.svg` updated to a simplified, dimensionally correct mark.

### Changed
- **Download API:** Endpoint path and parameter names normalized. URL construction for download links updated to include API key and proper encoding.
- **WebSocket URL Construction:** Logic for production vs. local development environments unified to a single path with environment-variable fallback.

### Fixed
- **CORS:** `CORS_ORIGINS` type corrected; list parsing logic fixed to accept space-separated and comma-separated values.
- **Supabase PgBouncer Compatibility:** Connection settings iterated through multiple fixes: `NullPool`, `sslmode=require`, psycopg3 driver, `asyncpg` fallback, IPv4 host resolution. Final working config uses `asyncpg` with explicit IPv4 for Supabase Pooler.
- **Dependencies:** Added missing `asyncpg`, `psycopg2-binary` to `requirements.txt`. Added missing `Depends` import to `main.py`.
- **Firebase Workflows:** Directory change (`cd frontend`) added before `bun install` step; deployment target corrected to `frontend/` subdirectory.
- **Provider Configuration:** Removed redundant `base_url` field from `Provider` class; removed duplicate `BeautifulSoup` import from `MangaKatanaProvider`.

---

## [0.1.0] - 2026-05-30

### Added
- **Initial Project:** FastAPI backend (`backend/`) + React 19 Vite TypeScript frontend (`frontend/`). Single monorepo. Bun as package manager.
- **Manga Search:** Backend scrapers for MangaDex, MangaKatana, AsuraScans, OmegaScans. Search API (`GET /api/manga/search`) fans out to configured providers. Frontend `Search.tsx` page displays results grid.
- **Manga Detail:** `MangaDetail.tsx` fetches cover, description, chapter list, and status from backend. Chapter list with read/unread state.
- **Download Infrastructure:** `POST /api/manga/download` enqueues a chapter download job. Backend fetches chapter pages, packages as CBZ, stores locally. WebSocket progress endpoint.
- **Dashboard/Library:** `Dashboard.tsx` shows downloaded manga as cards with cover images (proxied). Grid/list toggle. Basic sort.
- **Image Proxy:** `/manga/image-proxy` endpoint bypasses source Referer restrictions using `curl_cffi` with Chrome impersonation.
- **Supabase PostgreSQL:** Backend `DATABASE_URL` pointed at Supabase. `asyncpg` async driver. ORM models: `DownloadJob`, `Manga`, `Chapter`, `User`, `Device`.
- **Firebase Hosting:** `firebase.json` configured. GitHub Actions workflow for Firebase Hosting deploy on push to `main` and PR preview channels.
- **Authentication (Initial):** Supabase Auth JWT. API key header required on all non-public endpoints. `get_current_user` dependency.
- **Settings Page:** `Settings.tsx` with MAL token input, download path, and theme selector (dark/light/AMOLED).
- **Downloads Page:** Active and completed download queue with status, size, and cancel button.

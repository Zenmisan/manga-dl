# Changelog

All notable changes to **manga-dl** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Dynamic Page Titles:** Added `usePageTitle` hook managing browser tab titles and document meta titles across all 15 app pages, local manga pages, and reader sessions.
- **Enhanced OpenGraph & Social Cards:** Configured absolute canonical image URLs (`https://manga-dl.web.app/Manga-dl1.png`), `og:site_name`, dimensions, and Twitter card metadata in `index.html` for rich unfurls on Discord, Twitter/X, and Telegram.
- **Webtoon Dynamic Scroll Tracking:** Real-time scroll observer updating active page indicator and bottom scrubber based on continuous viewport proximity.
- **In-Chapter Progress Bar:** Visual blue progress indicator along chapter cards reflecting exact read percentage (0–100%) computed from stored page milestones.
- **Dynamic Chapter Resume Label:** Intelligent action buttons on manga details ("Start Reading", "Continue Ch. X", "Re-read Ch. X").

### Changed
- **MangaDetail Adaptive Layout:** Conditional rating stat card (automatically collapsing into 2 columns for unrated entries), high-contrast genre badges with `+N more` pill, and automatic Markdown tag stripping in synopsis.
- **Reader Stale Closure Fix:** Synchronized `currentPageRef` in `useReaderData` to eliminate stale page index bugs when saving reading state upon unmount or chapter transitions.
- **Reader Back Navigation:** Streamlined back button to use `navigate(-1)` to honor original entry stacks across search, library, and history.

### Removed
- **Redundant Metadata Edit Button:** Removed extra pencil action on MangaDetail header in favor of centralized management.
- **Deprecated CI Workflows:** Removed obsolete `.github/workflows/firebase-hosting-*.yml` previews.

---

## [1.0.0] - 2026-09-01

### Added
- **Automated Local Android Toolchain:** Automated local Android SDK provisioning in `/home/zenmi/Android/Sdk` (`platforms/android-34`, `build-tools/34.0.0`, `cmdline-tools`, `platform-tools`).
- **Custom APK Naming:** Gradle build variant automation producing `manga-dl-v1.0.apk` (release) and `manga-dl-v1.0-debug.apk` (debug).
- **Desktop Packaging:** Support for Linux desktop release bundles (AppImage, `.deb`, `.rpm`) using Tauri v2.
- **Discovery Engine:** Server-side Discovery API (`/api/discovery/popular`, `/api/discovery/latest`) with file-backed caching for instant catalog browsing.
- **Search Source Toggles:** Interactive `SourceToggleModal` component to enable or disable individual manga extensions dynamically during search.
- **User Onboarding & Profile:** Automated username generation (`/api/users/generate-username`), avatar selection, and support ticket submission.
- **Email Notifications:** Integrated transactional email service for welcome notifications and support ticket delivery.

### Security
- **Strict Per-User Library Isolation:** Enforced JWT authentication (`require_jwt_user`) across `/api/library` and `/api/manga` endpoints.
- **Zero Hardcoded Secrets:** Migrated all client-side fallback keys (Firebase, Supabase, backend URL) strictly to environment variables (`.env`).
- **Database & Cache Untracking:** Untracked local SQLite database (`backend/manga_dl.db`) and `.firebase/` hosting caches from Git index, enforcing repository ignore rules.
- **Firebase Executable Restrictions:** Ignored binary distribution targets in `firebase.json` to prevent Spark tier hosting violations while preserving Supabase release pipelines.

### Changed
- **Capacitor Configuration:** Aligned `appId` (`com.zenmisan.mangadl`) with Gradle `applicationId`.
- **UI Normalization:** Unified loading spinners across all screens with `ThemedSpinner` and `ThemedLoadingScreen`.

---

## [0.9.0] - 2026-08-06

### Added
- **MangaDetail Redesign:** Hero blurred cover background, unified action buttons, floating binge action.
- **Custom Glass Select:** Polished dropdown selection components with blur styling.
- **Mobile Bottom Navigation:** Tailored 5-tab mobile navigation bar for Capacitor Android.
- **Import Guide Page:** Interactive ZIP/CBZ import tutorial with step-by-step guidance.
- **Biometric Lock:** Integrated biometric authentication support for mobile app.

---

## [0.8.0] - 2026-07-22

### Added
- **Full Platform Audit & Hardening:** Verified tri-platform compatibility across Web PWA, Tauri Desktop, and Capacitor Android.
- **Smart URL Routing:** Clean URLs for manga details and reading sessions (`/read/:title-slug-:extCode/:chapterSlug`).
- **Tauri Native Features:** Background sync, system tray, local file system import, and desktop updater infrastructure.
- **Reader Enhancements:** Dual-page spread, tap zone layouts, volume key page turning, and image prefetching.

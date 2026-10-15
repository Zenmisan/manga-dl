# Platform Feature Matrix

Last updated: 2026-10-08

The manga-dl ecosystem spans multiple targets: Web (PWA), Native Android ([manga-dl-android](https://github.com/zenmisan/manga-dl-android)), Native Windows ([manga-dl-windows](https://github.com/zenmisan/manga-dl-windows)), and Native Linux ([manga-dl-linux](https://github.com/zenmisan/manga-dl-linux)).

Legend:
- `[Supported]`: Feature is implemented and functional.
- `[Partial]`: Feature is partially implemented or under active polish.
- `[Planned]`: Feature is planned on the roadmap.
- `[Not Supported]`: Platform constraint prevents feature support.
- `[N/A]`: Not applicable to this platform form factor.

---

## Ecosystem Feature Comparison

| Feature | Web (PWA) | Android (Native) | Windows (Native) | Linux (Native) | Notes |
|---------|-----------|------------------|------------------|----------------|-------|
| Reading modes (LTR, RTL, Webtoon, Pager) | [Supported] | [Supported] | [Supported] | [Supported] | Native implementations use platform-optimized viewports |
| Online streaming without downloading | [Supported] | [Supported] | [Supported] | [Supported] | Web relays via proxy; Native connects directly |
| On-device scraper execution | [Supported] | [Supported] | [Supported] | [Supported] | Web uses Web Workers; Native uses embedded JS engines |
| Direct source networking (no proxy) | [Not Supported] | [Supported] | [Supported] | [Supported] | Web is constrained by browser CORS |
| Local library management | [Supported] | [Supported] | [Supported] | [Supported] | Web uses IndexedDB; Native uses local SQLite and filesystem |
| CBZ / EPUB reading | [Supported] | [Supported] | [Supported] | [Supported] | Native platforms parse via platform runtimes |
| Cloud reading progress sync | [Supported] | [Supported] | [Supported] | [Supported] | Supabase and Firebase sync |
| Trackers (AniList, MyAnimeList) | [Supported] | [Supported] | [Supported] | [Supported] | OAuth tokens and status updates |
| Background chapter update polling | [Not Supported] | [Supported] | [Supported] | [Supported] | Android WorkManager, Windows BackgroundService, Linux daemon |
| Arbitrary filesystem path selection | [Not Supported] | [Supported] | [Supported] | [Supported] | Sandboxed on browser |
| Hardware volume button page navigation | [Not Supported] | [Supported] | [N/A] | [N/A] | Native key event interception on Android |
| Keyboard shortcut navigation | [Supported] | [N/A] | [Supported] | [Supported] | Desktop key events |
| Keep screen awake during reading | [Supported] | [Supported] | [N/A] | [N/A] | Android WakeLock / Web Screen Wake Lock API |
| Biometric lock (Fingerprint / Face) | [Planned] | [Supported] | [Planned] | [Planned] | Android BiometricPrompt; Windows Hello |
| System tray integration | [N/A] | [N/A] | [Supported] | [Supported] | Minimize to tray, background polling status |
| Discord Rich Presence | [Not Supported] | [N/A] | [Supported] | [Supported] | Native IPC socket to local Discord desktop client |
| High-performance image rendering | [Supported] | [Supported] | [Supported] | [Supported] | Windows uses C++20 Direct2D; Android uses Compose GraphicsLayer |

---

## Platform Details

### 1. Web (PWA) — [manga-dl](file:///home/zenmi/Projects/manga-dl)
Web is the baseline cross-platform entry point, accessible through modern browsers and installable as a Progressive Web App.
- **Frontend Stack:** React 19, Vite, TanStack Query v5, Zustand, Tailwind CSS.
- **Scraper Execution:** Web Workers executing shared JavaScript source definitions.
- **Network Model:** Outbound requests relay through the FastAPI backend proxy (`/api/manga/proxy/*`) to circumvent browser CORS restrictions.
- **Local Storage:** IndexedDB for cached chapters, cover blobs, and local CBZ/EPUB imports.
- **Sync:** Real-time sync with Supabase PostgreSQL and Storage.

### 2. Android (Native) — [manga-dl-android](https://github.com/zenmisan/manga-dl-android)
A fully native Android application engineered for mobile performance, low memory overhead, and full on-device capabilities.
- **Stack:** Kotlin, Jetpack Compose, Material Design 3, Room SQLite, OkHttp, QuickJS embedded runtime.
- **Key Capabilities:**
  - Hardware volume rocker interception for instant page turns.
  - Native background workers using Android WorkManager for scheduled library updates.
  - Direct connection to upstream sources via OkHttp, completely bypassing backend proxy requirements.
  - On-device database storage using Room for instant startup and offline capability.
  - Biometric authentication via Android `BiometricPrompt`.
  - Ambient lighting status bar matching dominant page colors.

### 3. Windows (Native) — [manga-dl-windows](https://github.com/zenmisan/manga-dl-windows)
A modern desktop application built on Microsoft WinUI 3 and the Windows App SDK.
- **Stack:** C#, .NET 10, WinUI 3, XAML, C++20 native dynamic library (`MangaDl.Native`), SQLite-net, CommunityToolkit.Mvvm.
- **Key Capabilities:**
  - Direct2D / Win2D hardware-accelerated image decoding and custom border cropping in C++20.
  - Deep Windows 11 design language alignment (Mica material, custom titlebar chrome, fluent controls).
  - Native filesystem access with arbitrary directory choices for chapter storage.
  - Background synchronization service for library updates.
  - System tray icon with background minimization and notification toasts.
  - Discord Rich Presence integration via local IPC pipe.

### 4. Linux (Native) — [manga-dl-linux](https://github.com/zenmisan/manga-dl-linux)
A native desktop client adhering to the GNOME Human Interface Guidelines.
- **Stack:** GTK4, libadwaita, Vala / C, SQLite3, libsoup3, embedded QuickJS engine.
- **Key Capabilities:**
  - Adaptive Adwaita interface with native dark mode and accent colors.
  - Minimal resource consumption and fast cold-start performance.
  - Direct filesystem and desktop notifications integration.
  - MPRIS / desktop environment integration.

---

## Active Roadmap and Platform Priorities

### Android Focus
- Finalize Firebase DataConnect reading progress synchronization.
- Implement fine-grained WiFi-only and charging-only synchronization guards in WorkManager.
- Add notification channel management for new chapter releases.

### Windows Focus
- Wire real business services into the WinUI 3 MVVM viewmodels replacing sample data stubs.
- Finalize image processing pipeline inside `MangaDl.Native` (C++20).
- Windows Hello authentication integration.

### Linux Focus
- Complete QuickJS extension bridge binding in Vala.
- Package for distribution via Flatpak and native distribution packages.
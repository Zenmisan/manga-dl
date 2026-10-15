# Suwayomi-Server Architecture and Feature Analysis

This report analyzes Suwayomi-Server, comparing its features and architectural patterns with **manga-dl** to guide native desktop and backend improvements.

---

## 1. Architectural Differences

| Dimension | Suwayomi-Server | manga-dl Ecosystem |
| :--- | :--- | :--- |
| **Language and Runtime** | Kotlin / JVM (Java 21+) | Native Clients (Kotlin on Android, C#/.NET 10 on Windows, Vala/C on Linux) + React Web + FastAPI Backend |
| **Desktop Delivery** | Bundled JRE + ElectronJS launcher | Native WinUI 3 ([manga-dl-windows](https://github.com/zenmisan/manga-dl-windows)) and GTK4 ([manga-dl-linux](https://github.com/zenmisan/manga-dl-linux)) |
| **Memory Footprint** | Large (JVM + Electron: ~300MB - 1GB+) | Minimal (~40MB - 120MB per native client) |
| **Extension Engine** | Runs native Android Tachiyomi APKs via an emulator layer (`AndroidCompat`) | Shared JavaScript scrapers running in Web Workers (Web) or embedded QuickJS / ChakraCore (Native) |
| **External Client Support** | Exposes REST APIs + OPDS v1.2 Feed | Exposes REST APIs + WebSocket progress stream + Firebase/Supabase sync |

---

## 2. Key Findings and Opportunities for manga-dl

### A. OPDS Feed Support (High Opportunity)
- **What it is:** Suwayomi exposes a standard **OPDS (Open Publication Distribution System) v1.2** feed at `/api/opds/v1.2`. This allows external reader applications (e.g., Panels on iOS, KOReader on e-ink devices) to browse and stream from the server.
- **Action Item:** Implement an OPDS feed endpoint in our FastAPI backend ([backend/app/api/](file:///home/zenmi/Projects/manga-dl/backend/app/api)) by generating compliant XML/Atom feeds from our local SQLite library database.

### B. Cloudflare Bypass via FlareSolverr (Medium Opportunity)
- **What it is:** Suwayomi integrates with **FlareSolverr** (a proxy server to bypass Cloudflare challenges) via config properties.
- **Action Item:** If `curl_cffi` fails on Cloudflare blocks, we can implement an optional configuration key `FLARESOLVERR_URL` in our backend settings, letting users route scraping requests through a FlareSolverr container.

### C. Native System Tray Menu
- **What it is:** Suwayomi's system tray (built using Java `SystemTray.kt`) only exposes `Open` and `Quit`.
- **Action Item:** Desktop system tray menus in `manga-dl-windows` and `manga-dl-linux` expose quick controls:
  - Trigger Library Sync
  - Check Active Download Progress
  - Toggle Incognito Mode

### D. Android Compatibility Sandbox (`AndroidCompat`)
- **What it is:** Suwayomi includes a Gradle module `AndroidCompat` to mock Android SDK contexts, letting compiled Tachiyomi Kotlin extensions run on desktop platforms.
- **Action Item:** None. Our lightweight JS extension engine (`backend/app/services/extensions/*.js`) is far cleaner, uses fewer resources, and runs across Web and all native platforms without emulating Android.

# Manga OS Development and Compilation Guide

Last updated: 2026-10-08

This guide explains how to set up your local development environment and build components across the manga-dl ecosystem: Core Web and Backend ([manga-dl](https://github.com/zenmisan/manga-dl)), Native Android ([manga-dl-android](https://github.com/zenmisan/manga-dl-android)), Native Windows ([manga-dl-windows](https://github.com/zenmisan/manga-dl-windows)), Native Linux ([manga-dl-linux](https://github.com/zenmisan/manga-dl-linux)), and Self-Host ([manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost)).

---

## 1. Prerequisites Overview

| Target | Core Tools |
|---|---|
| Core Web Frontend | Bun (`curl -fsSL https://bun.sh/install \| bash`) |
| Core Backend | Python 3.14+, virtual environment (`venv`) |
| Native Android | JDK 17, Android Studio, Android SDK 34 |
| Native Windows | Windows 10/11, Visual Studio 2022+ (.NET Desktop, C++ Desktop, Windows App SDK), .NET 10 SDK |
| Native Linux | GTK4 development libraries, libadwaita, Vala compiler, Meson, Ninja |
| Self-Host | Docker, Docker Compose |

---

## 2. Core Web and Backend Development ([manga-dl](https://github.com/zenmisan/manga-dl))

The core repository contains the React 19 web application, the FastAPI synchronization server, and the source of truth for shared JavaScript extensions.

### Frontend Development
```bash
cd frontend

# Install dependencies using Bun
bun install

# Start development server with hot-module reloading
bun run dev

# Compile production bundle
bun run build
```

### Backend Development
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend development server
uvicorn app.main:app --reload --port 8000
```

---

## 3. Native Android Development ([manga-dl-android](https://github.com/zenmisan/manga-dl-android))

The Android client is a native Kotlin and Jetpack Compose application with on-device scraper execution.

### Prerequisites
- **JDK 17**: Ensure `JAVA_HOME` points to Java 17.
- **Android Studio**: Install latest version with Android SDK Platforms (API 34) and Build-Tools.

### Building and Running
```bash
cd /home/zenmi/Projects/manga-dl-android

# Build the debug APK using the Gradle wrapper
./gradlew assembleDebug

# Run unit tests
./gradlew test

# Install directly to a connected device or running emulator
./gradlew installDebug
```

Alternatively, open `/home/zenmi/Projects/manga-dl-android` in Android Studio, sync Gradle, and press **Run**.

---

## 4. Native Windows Development ([manga-dl-windows](https://github.com/zenmisan/manga-dl-windows))

The Windows client is a native WinUI 3 desktop application leveraging .NET 10 and a high-performance C++20 dynamic library (`MangaDl.Native`).

### Prerequisites
- Windows 10 (version 1809 or later) or Windows 11.
- Visual Studio 2022 (version 17.12+) with the following workloads:
  - **.NET desktop development** with **Windows App SDK C# Templates**.
  - **Desktop development with C++** (for building `MangaDl.Native`).
- .NET 10 SDK.
- Windows Developer Mode enabled.

### Building and Running
1. Clone `https://github.com/zenmisan/manga-dl-windows.git` and open `MangaDl.sln` in Visual Studio.
2. Select target architecture: `x64` or `ARM64`.
3. Set `MangaDl.App` as the startup project.
4. Build solution (F7) and start debugging (F5).

---

## 5. Native Linux Development ([manga-dl-linux](https://github.com/zenmisan/manga-dl-linux))

The Linux client is built with GTK4, libadwaita, and Vala/C for GNOME desktop integration.

### Prerequisites (Debian/Ubuntu example)
```bash
sudo apt install build-essential meson ninja-build libgtk-4-dev libadwaita-1-dev valac libsoup-3.0-dev libsqlite3-dev
```

### Building with Meson
```bash
git clone https://github.com/zenmisan/manga-dl-linux.git
cd manga-dl-linux

# Configure build directory
meson setup build

# Compile binary
ninja -C build

# Run application
./build/src/manga-dl
```

---

## 6. Self-Host Stack Development ([manga-dl-selfhost](https://github.com/zenmisan/manga-dl-selfhost))

To test the containerized multi-user self-hosting environment:

```bash
cd /home/zenmi/Projects/manga-dl-selfhost

# Review environment configuration
cp .env.example .env

# Launch containers in detached mode
docker compose up -d

# Inspect service logs
docker compose logs -f
```

---

## 7. Writing Shared JavaScript Extensions

All scrapers live in [backend/app/services/extensions/](file:///home/zenmi/Projects/manga-dl/backend/app/services/extensions) and are shared across all platforms without code duplication.

### Contract Requirements
Each extension file exports a global `extension` object implementing the following interface:

```javascript
var extension = {
  // Required: Search for series
  async search(query, page) {
    // Return array of objects: { id, title, cover_url, provider, url }
  },

  // Required: Fetch details and chapter catalog
  async getMangaDetail(mangaId) {
    // Return: { id, title, description, cover_url, author, status, genres, chapters: [...] }
  },

  // Required for manga: Fetch image URLs for a chapter
  async getPages(chapterId) {
    // Return array of image URL strings: [url1, url2, ...]
  },

  // Required for web novels: Fetch chapter text content
  async getChapterText(chapterId) {
    // Return: { content: string, format: 'html' | 'plain' }
  }
};
```

### Runtime Environment Constraints
Because extensions run across Web Workers, Android QuickJS, Windows ChakraCore, and Linux QuickJS, you must adhere to these rules:
- **No Node.js APIs:** Do not use `require`, `process`, `fs`, `path`, or `Buffer`.
- **No Direct DOM APIs:** Do not assume `document` or `window` exists. Parse HTML strings using regular expressions or lightweight parsing helpers.
- **Allowed Globals:** `JSON`, `RegExp`, `btoa`, `atob`, `encodeURIComponent`, `decodeURIComponent`, `Math`, `Date`, `Array`, `Object`, `String`.
- **Networking:** Exclusively use the injected host function `apiFetch(url, options)`. Do not use `fetch` or `XMLHttpRequest` directly.

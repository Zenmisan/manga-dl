# Contributing to manga-dl
**Version 1.0.0** · 2026-05-30 · HADS 1.0.0

---

## AI READING INSTRUCTION
Read `[SPEC]` and `[BUG]` blocks for authoritative facts.
Read `[NOTE]` only if additional context is needed.

---

## 1. Environment Setup
**[SPEC]**
- **Prerequisites**:
  | Tool | Version | Purpose |
  |------|---------|---------|
  | Python | 3.10+ | Backend Runtime |
  | Bun | Latest | Frontend Runtime & Orchestration |
  | Build Tools | GCC/C++ | Required for `curl_cffi` compilation |
- **Initial Setup**: Run `bun run install:all` from the project root.
- **Backend Configuration**:
  - Create `backend/.env` (optional).
  - Defaults:
    - `LIBRARY_PATH`: `~/manga-library`
    - `CACHE_PATH`: `~/.manga-dl-cache`
- **Development Server**: Run `bun dev` to start both frontend (Vite) and backend (Uvicorn) with hot-reloading.

**[NOTE]**
`bun run install:all` is a macro that performs a `bun install` in the frontend and a `pip install -r requirements.txt` in the backend. If you are on Windows, ensure you have the C++ Build Tools installed via Visual Studio Installer for `curl_cffi` to compile correctly.

## 2. Adding a New Provider
**[SPEC]**
- **File Location**: Create a new file in `backend/app/providers/{name}.py`.
- **Inheritance**: Subclass `Provider` from `app.providers.base`.
- **Class Attributes**:
  - `id`: Internal string slug (e.g., `mymanga`).
  - `name`: Display name.
  - `base_url`: Target site homepage.
- **Mandatory Implementation**:
  - `search(query, page)`: Returns `list[MangaResult]`.
  - `get_manga(manga_id)`: Returns `MangaDetail`.
  - `get_pages(chapter_id)`: Returns `list[str]` (image URLs).
- **Registration**: Add the provider class to the `_REGISTRY` list in `backend/app/providers/__init__.py`.
- **Validation**: Test implementation using `POST /api/manga/providers/{id}/validate`.

**[NOTE]**
Always use `await self._get_client()` to perform network requests; this ensures your provider uses the `curl_cffi` session with proper browser impersonation. For HTML providers, use BeautifulSoup4 to parse `resp.text`. Define `fingerprints` at the class level to enable the automated health-check system.

## 3. Frontend Development
**[SPEC]**
- **Tech Stack**:
  - **Framework**: React 19 (TypeScript)
  - **Styling**: Tailwind CSS 4
  - **Icons**: Lucide React
  - **Animations**: Framer Motion
- **Architecture**:
  - **API Client**: Centralized in `src/lib/api.ts`. Intercepts all requests to inject `X-API-Key`.
  - **Routing**: Managed via `react-router-dom` in `App.tsx`.
- **Design Tokens**:
  - Colors and common component styles (e.g., `.btn-primary`, `.panel`) are defined in `src/index.css`.
- **Build Tool**: Vite.

**[NOTE]**
Maintain the "Red/Zinc" dark-theme aesthetic. When adding new pages, wrap the content in a `motion.div` from Framer Motion for consistent entrance animations. Use the `cn()` utility from `src/lib/utils.ts` for dynamic class merging.

## 4. Testing Protocols
**[SPEC]**
- **Backend Unit Tests**: Run `pytest` within the `backend/` directory.
- **Provider Health Checks**:
  - Invoke `POST /api/manga/providers/validate-all` to run fingerprint checks across all sources.
  - Failures are categorized as `DEGRADED` (non-critical) or `BROKEN` (critical).
- **Manual "Happy Path"**:
  1. Search for a known manga title.
  2. Load details and verify chapter list visibility.
  3. Queue a small chapter.
  4. Verify `.cbz` existence in `LIBRARY_PATH` and correct image sequencing.
- **API Exploration**: Interactive Swagger documentation is available at `/docs`.

**[NOTE]**
Always monitor terminal logs for the Sync Engine. Since it runs in a background loop, errors may not appear in individual API responses. Look for "Auto-queueing" or "Sync task failed" log entries to verify background logic.

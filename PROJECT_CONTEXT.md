# manga-dl — Full Project Context

> Load this file at the start of any new conversation to resume work with full context.
> Last updated: 2026-06-14

---

## What Is This

manga-dl is a tri-platform manga reader and downloader:
- **Web**: React 19 PWA (hosted on Firebase)
- **Desktop**: Tauri v2 (Rust shell, Windows/macOS/Linux)
- **Android**: Capacitor 6 (WebView + native Kotlin plugins)
- **Backend**: FastAPI (Python), SQLite dev / Supabase PostgreSQL prod

Users can search 50+ manga sources, read online or download CBZ/EPUB offline, track progress with AniList/MAL/Kitsu/MangaUpdates/Shikimori/Bangumi, and sync state across devices via Supabase.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand (persist) |
| Backend | FastAPI, SQLAlchemy async, SQLite/PostgreSQL, curl_cffi (Cloudflare bypass) |
| Desktop | Tauri v2, Rust tokio, tauri-plugin-notification/autostart/dialog/fs |
| Android | Capacitor 6, @capacitor/haptics, @capacitor/filesystem, @capacitor/local-notifications |
| Android native | Custom Kotlin VolumeKeysPlugin (`MainActivity.java` + `VolumeKeysPlugin.kt`) |
| Auth | Supabase Auth (JWT) + API key header (`manga-api-key` in localStorage) |
| Storage | Supabase Storage (`manga-backups` bucket) + local CBZ files |
| Package manager | **bun** (not npm) |
| CI/CD | GitHub Actions: `release-android.yml`, `release-desktop.yml`, `firebase-hosting-merge.yml` |

---

## Repository Structure

```
manga-dl/
├── frontend/
│   ├── src/
│   │   ├── pages/          # React page components
│   │   │   ├── Dashboard.tsx      # Library (main page)
│   │   │   ├── MangaDetail.tsx    # Manga info + chapter list
│   │   │   ├── Reader.tsx         # Chapter reader
│   │   │   ├── Search.tsx         # Search across sources
│   │   │   ├── Downloads.tsx      # Download queue
│   │   │   ├── Sources.tsx        # Extensions/sources manager
│   │   │   ├── Settings.tsx       # App settings (flat, needs restructure)
│   │   │   ├── History.tsx        # Reading history (date-grouped)
│   │   │   ├── Stats.tsx          # Reading statistics
│   │   │   ├── Updates.tsx        # New chapter updates
│   │   │   ├── Login.tsx          # Supabase email login
│   │   │   ├── Register.tsx       # Supabase email register
│   │   │   ├── Profile.tsx        # Public user profile
│   │   │   ├── DownloadHub.tsx    # App download page
│   │   │   ├── Help.tsx           # Help / icon legend
│   │   │   ├── Terms.tsx          # Terms of service
│   │   │   └── Onboarding.tsx     # First-run onboarding
│   │   ├── lib/
│   │   │   ├── store.ts           # Zustand store (all persisted prefs)
│   │   │   ├── api.ts             # Axios API client
│   │   │   ├── supabase.ts        # Supabase client
│   │   │   ├── readTracking.ts    # Read state + Supabase sync
│   │   │   ├── categories.ts      # Category management + Supabase sync
│   │   │   ├── mangaNotes.ts      # Notes/ratings + Supabase sync
│   │   │   ├── extensions.ts      # ExtensionManager class
│   │   │   ├── localLibrary.ts    # Local CBZ/EPUB library
│   │   │   ├── nativeDownload.ts  # Capacitor filesystem save
│   │   │   ├── p2p.ts             # P2P sharing (experimental)
│   │   │   ├── utils.ts           # cn() and helpers
│   │   │   └── volumeKeys.ts      # Capacitor VolumeKeys plugin bridge
│   │   └── App.tsx                # Router, nav, auth state, sync gates
│   ├── android/
│   │   └── app/src/main/java/com/zenmi/mangaos/
│   │       ├── MainActivity.java       # Capacitor BridgeActivity
│   │       └── VolumeKeysPlugin.kt     # Native volume key interceptor
│   ├── src-tauri/
│   │   └── src/lib.rs              # Tauri app (Discord RPC, background sync, etc.)
│   └── package.json
├── backend/
│   └── app/
│       ├── api/
│       │   ├── manga.py     # /manga/* endpoints incl. POST /manga/migrate
│       │   ├── auth.py      # /auth/* AniList/MAL/Kitsu/Supabase auth
│       │   └── downloads.py # /downloads/* WebSocket + queue
│       ├── models/          # SQLAlchemy ORM models
│       ├── providers/       # Manga source adapters (MangaDex, MangaKatana, etc.)
│       └── core/
│           ├── downloader.py    # CBZ packaging (ComicInfo.xml, WebP compression)
│           └── tachibk.py       # Tachiyomi backup parser
├── docs/
│   └── supabase/
│       └── migrations.sql   # ALL Supabase table DDL + RLS policies
├── MASTER_PLAN.md           # Task checklist (what's done, what's next)
├── KNOWN_ISSUES.md          # Bug tracker
├── PROJECT_STATUS.md        # High-level phase status
├── FEATURES.md              # Feature list
└── UI/
    └/Tachiyomi/             # Tachiyomi reference screenshots (49 images)
```

---

## Zustand Store (store.ts) — All State Keys

```typescript
// Search
searchQuery, searchResults, selectedProvider, hasSearched

// Reader preferences
readingMode: 'webtoon' | 'manga' | 'manga-rtl' | 'vertical-pager'
upscaling: boolean
readerFilters: { brightness, contrast, grayscale, invert, sepia }
imageScale: 'fit-screen' | 'fit-width' | 'fit-height' | 'original'
skipReadChapters: boolean
cropBorders: boolean
dualPageSpread: 'auto' | 'on' | 'off'
tapZoneLayout: 'default' | 'l-nav' | 'edge' | 'disabled'
webtoonSidePadding: number    // 0-80px
cropBordersWebtoon: boolean

// Appearance
theme: 'dark' | 'light' | 'system'
amoledBlack: boolean
gridColumns: number            // 2-6, default 3

// Privacy
incognitoMode: boolean
appLockEnabled: boolean        // Biometric lock via @aparajita/capacitor-biometric-auth

// Android native
hapticFeedback: boolean

// Auto-backup
autoBackupEnabled: boolean
autoBackupInterval: 'daily' | 'weekly'

// Sync gates
syncWifiOnly: boolean          // @capacitor/network check
syncChargingOnly: boolean      // navigator.getBattery() check
```

All above are `partialize`d (persisted to localStorage as `manga-dl-prefs`).

---

## Key localStorage Keys

| Key | Contents |
|-----|----------|
| `manga-dl-read` | `Record<"provider:mangaId", string[]>` — read chapter IDs |
| `manga-dl-notes` | `Record<"provider:mangaId", {note, rating, updatedAt}>` |
| `manga-dl-categories` | `string[]` — custom category names |
| `manga-dl-manga-categories` | `Record<mangaTitle, string[]>` — assignments |
| `manga-dl-bookmarks` | bookmarks per manga |
| `manga-dl-meta-overrides` | `Record<"provider:mangaId", {title?, cover?, description?}>` |
| `manga-dl-notif-{provider}-{mangaId}` | `boolean` — per-manga notif mute |
| `manga-dl-tracker-links` | tracker account links per manga |
| `notifications-enabled` | `'true'` — global notification opt-in |
| `manga-api-key` | API key for FastAPI backend |

---

## Supabase Tables

Run `docs/supabase/migrations.sql` to create all tables. Tables:

| Table | PK | Purpose |
|-------|----|---------|
| `read_tracking` | (user_id, provider, manga_id) | Chapter read state per manga |
| `user_categories` | user_id | Custom categories + manga assignments |
| `manga_notes` | (user_id, provider, manga_id) | Notes + ratings |
| `reading_progress` | (user_id, provider, manga_id, chapter_id) | Page-level progress |
| `downloads` | id | Download history (has file_size_bytes, pinned, last_page_read cols) |

All tables have RLS enabled. Policies: users can only read/write their own rows.

Storage bucket: `manga-backups` (private) — for cloud backup uploads.

---

## API Routes (FastAPI backend)

Base: `http://127.0.0.1:8000/api` (dev) · `/api` prefix in prod via Firebase rewrites

Key endpoints:
- `GET /manga/search?q=&provider=` — search
- `GET /manga/{provider}/{manga_id}` — manga detail + chapters
- `GET /manga/{provider}/chapters/{chapter_id}/pages` — page URLs
- `POST /manga/sync` — sync subscribed manga for new chapters
- `POST /manga/migrate` — migrate manga between sources (MigrationRequest)
- `GET /downloads` — list downloads
- `WebSocket /downloads/ws` — real-time download progress
- `POST /auth/anilist/track` — sync to AniList
- `POST /auth/mal/track` — sync to MAL (score, start_date, finish_date supported)
- `GET /stats` — reading statistics

---

## Online Reader URL Format

MangaDetail builds: `btoa(unescape(encodeURIComponent("provider|mangaId|chapterId|mangaTitle|chapterTitle")))`
Reader decodes: `decodeURIComponent(escape(atob(filename)))`
Route: `/read/online/{base64param}`

Local CBZ route: `/read/{mangaTitle}/{filename}`

---

## App.tsx Key Behaviors

1. **Theme**: applies `dark`/`light`/`amoled` CSS classes to `<html>`
2. **Auto-sync**: `setInterval` 30min calls `POST /api/manga/sync` — gated by WiFi/charging checks
3. **WiFi gate**: `@capacitor/network` → `Network.getStatus()`, fallback `navigator.connection`
4. **Charging gate**: `navigator.getBattery()` web API
5. **Biometric lock**: `@aparajita/capacitor-biometric-auth` — `BiometricAuth.checkBiometry()` + `authenticate()`
6. **Cloud sync on mount**: `syncReadTrackingFromCloud()`, `syncCategoriesFromCloud()`, `syncMangaNotesFromCloud()`
7. **Tauri new-chapters event**: listens for `'new-chapters'` event → navigates to manga
8. **Global WebSocket notifications**: connects to `/api/downloads/ws`, fires browser Notification on `queued` event

---

## Android Native

Package: `com.zenmi.mangaos`

**VolumeKeysPlugin.kt** — Capacitor plugin, intercepts volume up/down keys in reader
- `enable()` / `disable()` methods
- `notifyListeners("volumeUp", JSObject())` / `notifyListeners("volumeDown", JSObject())`

**MainActivity.java** — extends `BridgeActivity`
- `registerPlugin(VolumeKeysPlugin.class)` in `onCreate` before `super.onCreate`
- Casts volume keys in `dispatchKeyEvent` to `VolumeKeysPlugin.handleVolumeKey()`

**TypeScript bridge**: `frontend/src/lib/volumeKeys.ts` — `registerPlugin('VolumeKeys', { web: noop })`

---

## Tauri (Desktop) Key Features

File: `frontend/src-tauri/src/lib.rs`
- `DISCORD_APP_ID = "1515346416430485785"` (confirmed real)
- Background sync task (Rust tokio `spawn` → calls backend sync every 30min)
- OS notifications via `tauri-plugin-notification`
- File drag-drop handler for CBZ/EPUB import
- Auto-launch on login via `tauri-plugin-autostart`
- Update checker on start
- Custom download directory via `tauri-plugin-dialog` folder picker

---

## GitHub Actions

| Workflow | Trigger | Output |
|----------|---------|--------|
| `firebase-hosting-merge.yml` | Push to main | Deploy web to Firebase |
| `firebase-hosting-pull-request.yml` | PR | Preview deploy |
| `release-android.yml` | Tag `v*` or manual | `MangaOS.apk` draft release |
| `release-desktop.yml` | Tag `v*` or manual | Desktop binaries |

Required secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GITHUB_TOKEN`

---

## Current Routing (App.tsx)

```
/                    → Dashboard (Library)   ← NEEDS CHANGE: should be Landing
/r                   → (doesn't exist yet)   ← NEEDS: should be Dashboard
/search              → Search
/sources             → Sources (Extensions)
/downloads           → Downloads queue
/settings            → Settings (flat, needs sub-pages)
/manga/:provider/*   → MangaDetail
/read/:mangaTitle/:filename → Reader (local)
/read/online/:param  → Reader (online streaming)
/history             → History
/updates             → Updates
/stats               → Stats
/download            → DownloadHub
/login               → Login
/register            → Register
/terms               → Terms
/help                → Help
/onboarding          → Onboarding
/profile/:userId     → Profile
```

---

## What's Implemented (as of 2026-06-14)

### Core Features ✅
- Library with cover grid, batch select, EPUB/CBZ upload, drag-drop (Tauri)
- MangaDetail: chapter list, download, tracker sync modal, metadata edit, notification mute, bookmarks
- Reader: webtoon/manga/manga-rtl/vertical-pager modes, dual page, tap zones, image filters, volume keys
- Search: multi-source, grouped by provider, filter chips
- Downloads: WebSocket real-time progress, Android completion notification
- Sources: installed/available split, enable/disable/uninstall/update
- History: date-grouped, search filter, date range filter
- Stats: reading time, pace, per-category, heatmap
- Updates: new chapter feed

### Sync & Auth ✅
- Supabase email login/register (Login.tsx, Register.tsx — functional)
- Read tracking, categories, manga notes all sync to Supabase on write, pull on mount
- AniList OAuth, MAL OAuth, Kitsu, MangaUpdates, Shikimori, Bangumi tracker linking
- AniList + MAL tracker sync (status, score, chapters, dates)

### Platform ✅
- Tauri v2: background sync, OS notifications, drag-drop, auto-launch, update checker
- Capacitor Android: volume keys, haptics, filesystem, local-notifications, status bar
- PWA: service worker, installable

### Settings ✅ (flat list, needs sub-page restructure)
- Theme (dark/light/system/AMOLED)
- Grid columns slider
- Webtoon padding slider, crop borders
- Reading mode, image scale, tap zones, dual page spread
- Biometric app lock
- WiFi-only / charging-only sync gates
- Auto-backup (daily/weekly)
- Source migration wizard
- Incognito mode, haptic feedback

---

## What's NOT Done Yet

### High Priority
- **Landing page** at `/` (currently shows Dashboard)
- **Route `/r`** for the app (currently `/` is the app)
- **Auth state in UI** (sidebar shows Sign In / user avatar based on Supabase session)
- **Settings sub-pages** (currently flat list, needs restructure per Tachiyomi pattern)
- **More page** for Android bottom nav
- **Android bottom nav restructure** (5 items: Library/Updates/History/Browse/More)

### Medium Priority
- MangaDetail blurred hero background
- MangaDetail floating Resume/Start FAB
- Library empty state with emoticon
- Browse page tab structure (Sources/Extensions/Migrate)
- Desktop Settings two-panel layout

### Low Priority
- Manga metadata overrides Supabase sync
- Source migration filesystem rename
- RAR/CBR support
- Android WorkManager background sync
- WebView fallback for Cloudflare sources
- Tablet multi-column reader layout
- Material You dynamic colors

---

## Design Reference (Tachiyomi UI)

Analyzed 49 screenshots in `UI/Tachiyomi/`. Key patterns to adapt:

**Bottom nav**: 5 items, pill/capsule highlight on active, `···` More overflow
**Library**: 2-col cover grid, unread count badge top-left of cover, title at bottom
**MangaDetail**: blurred hero background, cover thumbnail overlay, icon action row, genre chips, chapter dots, floating FAB
**Browse**: 3-tab bar (Sources/Extensions/Migrate), sources grouped by Last used/Pinned/Language
**Settings**: categorized sub-pages (Appearance, Reader, Downloads, Tracking, Browse, Data, Security, Advanced, About)
**Empty states**: `(˵•_•˵)` emoticon + helpful message
**Color scheme**: dark navy background, purple accent — we use dark black + red accent instead

---

## Design System (manga-dl)

**Colors**:
- Background: `#09090b` (sidebar/nav) / `#050505` (reader/landing)
- Accent: `red-600` (#dc2626), `red-500` hover
- Text: `#fafafa` primary, `white/30` muted, `white/10` border
- Glass panels: `bg-white/5 border border-white/5 backdrop-blur`

**Typography**: system sans (currently), landing page adds Bebas Neue for display

**CSS classes** (global):
- `.glass-panel` — frosted glass card
- `.btn-primary` — red filled button
- `.nav-link` — sidebar/bottom nav item

**Animations**: Framer Motion throughout, `AnimatePresence mode="wait"` for page transitions

---

## Pending Supabase Setup

**MUST RUN** in Supabase SQL editor before shipping:
```
docs/supabase/migrations.sql
```
Contains: `read_tracking`, `user_categories`, `manga_notes` tables + RLS policies.
Also needs: `ALTER TABLE downloads ADD COLUMN ...` for file_size_bytes, pinned, last_page_read.

---

## Where To Continue

See `MASTER_PLAN.md` for the full task checklist.

**Next immediate task**: Phase C — Landing page + auth routing
1. Create `frontend/src/pages/Landing.tsx`
2. Change `/` route to Landing, add `/r` route to Dashboard
3. Fix nav links: `'/'` → `'/r'` in App.tsx sidebar
4. Fix `Login.tsx` redirect: `navigate('/')` → `navigate('/r')`
5. Add Supabase session state to App.tsx
6. Add Sign In / user avatar to sidebar based on session

Then: Phase D — Android bottom nav restructure + More page + Settings sub-pages.

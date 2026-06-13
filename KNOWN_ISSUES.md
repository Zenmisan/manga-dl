# Known Issues & Limitations

This document tracks every known limitation, architectural caveat, and thing-that-could-break in manga-dl. Update it as issues are fixed or new ones are discovered.

---

## 🔴 Critical / Requires Setup

### Discord Rich Presence — placeholder App ID
- **File:** `frontend/src-tauri/src/lib.rs:13`
- **Issue:** `DISCORD_APP_ID` is `"1234567890123456789"` — a fake ID. RPC will silently fail until a real ID is used.
- **Fix:** Register an application at discord.com/developers/applications, copy the App ID, replace the constant.

### Cloud Backup — Supabase bucket must exist manually
- **File:** `frontend/src/pages/Settings.tsx` → `handleCloudBackup`
- **Issue:** Backup uploads to `manga-backups` bucket. Supabase does NOT create buckets automatically. Upload will return a 404-class error if the bucket doesn't exist.
- **Fix:** In Supabase dashboard → Storage → New bucket → name `manga-backups` → set to private.

### Kitsu tracker uses password grant
- **File:** `frontend/src/pages/Settings.tsx` → `handleKitsuLogin`
- **Issue:** Kitsu's password grant flow sends credentials directly (not via OAuth redirect). This is acceptable for personal/desktop use but Kitsu may deprecate the password grant endpoint.
- **Fix:** If Kitsu disables password grant, switch to their PKCE authorization_code flow. No redirect URI is officially supported for web apps at this time.

---

## 🟠 Functional Gaps

### Tachiyomi `.tachibk` binary import not supported
- **File:** `frontend/src/pages/Settings.tsx` → `handleTachiyomiImport`
- **Issue:** `.tachibk` is protobuf-encoded. Parsing it in the browser requires a protobuf library + the Tachiyomi schema. Only JSON backup format works.
- **Fix:** Add `protobufjs` to dependencies and decode using the [Tachiyomi backup proto schema](https://github.com/tachiyomiorg/tachiyomi/blob/master/app/src/main/proto/Backup.proto).

### Read tracking is localStorage-only — not cross-device
- **Files:** `frontend/src/lib/readTracking.ts`, `frontend/src/pages/Dashboard.tsx`
- **Issue:** Unread badge counts, read/unread chapter state, and bookmarks all live in localStorage. They do not sync across devices or browsers.
- **Fix:** Mirror read state to Supabase `reading_progress` table (already exists) on write. On initial load, reconcile localStorage with server state.

### Manga categories are localStorage-only — not cross-device
- **File:** `frontend/src/lib/categories.ts`
- **Issue:** Same as above — category assignments don't survive clearing browser data or switching devices.
- **Fix:** Add `manga_categories` column to `MangaRecord` or a separate join table; sync on assignment.

### Manga notes/rating are localStorage-only
- **File:** `frontend/src/lib/mangaNotes.ts`
- **Issue:** Same pattern as categories/read tracking.

### Scanlator filter uses regex `[GroupName]` pattern only
- **File:** `frontend/src/pages/MangaDetail.tsx` → `scanlators` useMemo
- **Issue:** Only extracts scanlator names that appear as `[GroupName]` in the chapter title. Providers that don't use this convention (e.g. raw chapter titles) will show no scanlator options.
- **Fix:** Extend with per-provider extraction logic, or add a `scanlator` field to `ChapterResult` in the backend.

### PWA icons are placeholders — app may not install correctly
- **File:** `frontend/vite.config.ts`
- **Issue:** `pwa-192x192.png` and `pwa-512x512.png` are referenced but may not exist in `public/`. Without these the PWA install prompt either won't appear or will show a broken icon.
- **Fix:** Add actual icon files to `frontend/public/`.

### Chapter bookmarks not shown in chapter filter
- **File:** `frontend/src/pages/MangaDetail.tsx`
- **Issue:** `readFilter` has `all/unread/read` options but no `bookmarked` filter despite bookmarks being stored.
- **Fix:** Add `'bookmarked'` to the `readFilter` type and include it in `displayedChapters` memo.

---

## 🟡 UX / Polish Issues

### Search grouped results show empty providers
- **File:** `frontend/src/pages/Search.tsx`
- **Issue:** When searching all providers, providers that return 0 results still render a header. The `Object.entries(reduce(...))` approach only groups results that exist, but if a provider errors mid-search the `Promise.allSettled` in the backend returns partial data silently.
- **Fix:** Add minimum 1 result check before rendering a provider group header (currently handled by the reduce, but verify with slow providers).

### Category tabs in Dashboard don't persist across reload
- **File:** `frontend/src/pages/Dashboard.tsx`
- **Issue:** `activeCategory` state resets to `null` on page reload.
- **Fix:** Persist in URL param (`?category=Reading`) or `sessionStorage`.

### Discord RPC errors are fully silent
- **File:** `frontend/src/pages/Reader.tsx`
- **Issue:** The Tauri invoke call swallows all errors silently (`.catch(() => {})`). If Discord is not running or the App ID is wrong, nothing notifies the user.
- **Fix:** Acceptable for optional RPC — keep silent. If user adds a "Discord status" indicator in Settings, surface errors there.

### Dynamic filter state resets when switching tabs
- **File:** `frontend/src/pages/Search.tsx`
- **Issue:** `activeFilters` is local state. Switching from Popular → Latest → Popular resets to defaults.
- **Fix:** Move `activeFilters` to the Zustand store or use `useRef` to preserve between tab switches.

### Public profile shows user UUID as display name
- **File:** `frontend/src/pages/Profile.tsx`
- **Issue:** No username system exists — profile header shows first 8 chars of UUID (`shortId`).
- **Fix:** Add a `display_name` column to `UserDevice` or a separate `UserProfile` table in Supabase.

### `read/online/` URL encoding breaks if title contains `|`
- **File:** `frontend/src/pages/Reader.tsx`, `frontend/src/pages/MangaDetail.tsx`
- **Issue:** The 5-part pipe-separated URL encoding (`provider|mangaId|chapterId|mangaTitle|chapterTitle`) fails silently if any field contains a literal `|` character.
- **Fix:** Base64-encode each component, or switch to a JSON-encoded + base64 URL param.

---

## 🟢 Minor / Low Priority

### Heatmap uses download date, not read date
- **File:** `frontend/src/pages/Stats.tsx`, `backend/app/api/library.py`
- **Issue:** `yearly_downloads` tracks when chapters were *downloaded*, not when they were *read*. A user who bulk-downloads shows a spike, not steady reading.
- **Fix:** Count `ReadingProgress.updated_at` entries instead of download records.

### MAL sync sends chapter ID not chapter number
- **File:** `backend/app/api/manga.py` (MAL sync endpoint)
- **Issue:** MAL expects a chapter *number* (integer) for `num_chapters_read`. Currently sends chapter ID string. MAL may silently reject or misrecord.
- **Fix:** Parse `ChapterResult.number` (float) and cast to int before sending.

### Provider `get_popular_filtered` falls back to `get_popular` for non-MangaDex
- **File:** `backend/app/providers/base.py`
- **Issue:** Only MangaDex overrides `get_popular_filtered`. Other providers silently ignore filters and return unfiltered results.
- **Fix:** Acceptable for now. Document in Source page UI when a source doesn't support filters (check `filters` endpoint returns empty array).

### `vite-plugin-pwa` dev mode disabled
- **File:** `frontend/vite.config.ts`
- **Issue:** `devOptions: { enabled: false }` means the service worker is NOT registered during development. PWA features (offline, cache) only work in production builds.
- **Fix:** Expected behaviour. Run `npm run build && npm run preview` to test PWA.

### CBZ `ComicInfo.xml` fields use UTF-8 but special chars not escaped
- **File:** `backend/app/core/downloader.py` → `build_comic_info_xml`
- **Issue:** Manga titles with `<`, `>`, `&` (e.g. `Dungeon & Fighter`) will produce malformed XML.
- **Fix:** Use `xml.sax.saxutils.escape()` on all string fields.

### Tauri `discord-rich-presence` crate may not compile on all targets
- **File:** `frontend/src-tauri/Cargo.toml`
- **Issue:** `discord-rich-presence = "0.2"` uses platform IPC sockets. May fail to compile on some Linux distros without `libdbus` or similar.
- **Fix:** Wrap in `[target.'cfg(not(target_os = "ios"))'.dependencies]` if mobile builds are needed, or add `optional = true` and gate behind a feature flag.

---

## 📋 Platform-Specific Gaps (see PLATFORM_MATRIX.md for full breakdown)

| Feature | Web | Desktop | Android |
|---------|-----|---------|---------|
| Discord Rich Presence | ❌ not possible | ✅ via Tauri IPC | ❌ not applicable |
| Volume key navigation | ✅ keyboard events | ✅ keyboard events | ❌ Android intercepts volume keys at OS level |
| File system access (CBZ save) | ❌ download prompt only | ✅ full FS via Tauri | 🔨 Capacitor filesystem plugin |
| Local folder scan | ❌ | ✅ | 🔨 |
| Push notifications | ✅ Web Push | ✅ OS notifications via Tauri | ✅ Capacitor push |
| Biometric lock | ❌ | 🔨 via OS keychain | 🔨 Capacitor biometric plugin |
| Offline mode | ✅ PWA service worker | ✅ app is local | ✅ native app |
| Background chapter sync | ❌ | ✅ tray process | 🔨 Capacitor background task |

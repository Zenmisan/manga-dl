# Known Issues & Limitations

Last updated: 2026-06-13

---

## 🔴 Critical / Requires Setup Before Shipping

### Discord Rich Presence — placeholder App ID
- **File:** `frontend/src-tauri/src/lib.rs` → `DISCORD_APP_ID`
- **Issue:** Value is `"1234567890123456789"` — fake. RPC silently fails.
- **Fix:** Register app at discord.com/developers/applications → copy App ID → replace constant.

### Cloud Backup — Supabase bucket must be created manually
- **Issue:** `handleCloudBackup` uploads to `manga-backups` bucket. Supabase doesn't auto-create buckets. Upload returns 404-class error if missing.
- **Fix:** Supabase dashboard → Storage → New bucket → name `manga-backups` → private.

### Supabase Production DB — missing columns/tables
Run in Supabase SQL Editor:
```sql
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER DEFAULT 0;
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS last_page_read INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS reading_progress (
  user_id    VARCHAR NOT NULL,
  provider   VARCHAR NOT NULL,
  manga_id   VARCHAR NOT NULL,
  chapter_id VARCHAR NOT NULL,
  last_page  INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, provider, manga_id, chapter_id)
);
```

---

## 🟠 Functional Bugs

### `manga-dl-bookmarks` key uses wrong compound key
- **File:** `frontend/src/pages/MangaDetail.tsx:71`
- **Issue:** `useState` initializer reads `[provider}:${provider}]` — duplicates `provider` instead of using `mangaId`. Bookmarks never load correctly on first render.
- **Fix:** Change to `` `${provider}:${mangaId}` ``.

### MAL sync sends chapter ID string, not chapter number
- **File:** `backend/app/api/manga.py` (MAL sync endpoint)
- **Issue:** MAL expects `num_chapters_read` as integer. Code sends chapter ID string. MAL silently rejects or stores 0.
- **Fix:** Parse `ChapterResult.number` (float) → cast to int.

### `|` in manga title breaks `/read/online/` URL encoding
- **Files:** `frontend/src/pages/Reader.tsx`, `frontend/src/pages/MangaDetail.tsx`
- **Issue:** 5-part pipe-separated URL param (`provider|mangaId|chapterId|mangaTitle|chapterTitle`) breaks if any field contains literal `|`.
- **Fix:** Base64-encode each component, or switch to JSON+base64 URL param.

### ComicInfo.xml doesn't escape special characters
- **File:** `backend/app/core/downloader.py` → `build_comic_info_xml`
- **Issue:** Manga titles with `&`, `<`, `>` produce malformed XML (e.g. `Dungeon & Fighter`).
- **Fix:** Apply `xml.sax.saxutils.escape()` to all string fields.

---

## 🟡 UX / Sync Gaps

### Read tracking is localStorage-only — not cross-device
- **Files:** `frontend/src/lib/readTracking.ts`, `frontend/src/pages/Dashboard.tsx`
- **Issue:** Unread badges, read/unread chapter state, bookmarks are all localStorage. Don't sync across devices.
- **Fix:** Mirror to Supabase `reading_progress` table on write; reconcile on load.

### Manga categories are localStorage-only
- **File:** `frontend/src/lib/categories.ts`
- **Issue:** Category assignments lost on browser clear or new device.
- **Fix:** Add `manga_categories` column to `MangaRecord` or a join table; sync on assignment.

### Manga notes / rating are localStorage-only
- **File:** `frontend/src/lib/mangaNotes.ts`
- **Issue:** Same pattern as categories.

### Manga metadata overrides are localStorage-only
- **File:** `frontend/src/pages/MangaDetail.tsx` → `manga-dl-meta-overrides` key
- **Issue:** Manual title/cover/description edits don't sync cross-device.
- **Fix:** Store in `MangaRecord` columns or a separate `manga_overrides` table.

### Auto-backup (web) triggers browser download prompt
- **File:** `frontend/src/pages/Settings.tsx` → auto-backup useEffect
- **Issue:** Fires `a.click()` to download JSON, which pops a save dialog. Silent background backup not possible on web.
- **Acceptable:** Document behaviour in Settings UI. Cloud backup (Supabase) is the silent alternative.

---

## 🟡 Extension Limitations

### Keiyoushi index is Android APK metadata — no JS sources
- **Issue:** Extension install succeeds (metadata stored) but sources can't execute JS. Built-in providers (MangaDex, MangaKatana, etc.) delegate to the backend and work correctly.
- **Workaround:** Extensions act as "preferences" for which sources to show. Actual data flows through backend providers.

### Source migration doesn't migrate downloaded files
- **File:** `backend/app/api/manga.py` → `migrate_manga_source`
- **Issue:** Migrating a manga updates the DB record but existing CBZ files remain under the old path/title. Re-downloading is required.
- **Fix:** Rename the download directory for the manga on the filesystem as part of migration.

---

## 🟢 Minor / Low Priority

### Category tabs in Dashboard don't persist across reload
- **Issue:** `activeCategory` resets to `null` on reload.
- **Fix:** Persist in URL param (`?category=Reading`) or `sessionStorage`.

### Heatmap uses download date, not read date
- **Issue:** Reflects when chapters were *downloaded*, not *read*. Bulk downloads cause spikes.
- **Fix:** Count `ReadingProgress.updated_at` from Supabase instead.

### Public profile shows UUID as display name
- **File:** `frontend/src/pages/Profile.tsx`
- **Issue:** No username system — shows first 8 chars of UUID.
- **Fix:** Add `display_name` column to `UserDevice` or a `UserProfile` table.

### Search grouped results show header for zero-result providers
- **File:** `frontend/src/pages/Search.tsx`
- **Issue:** Headers render even when provider returns 0 results. Mostly invisible but wastes space.
- **Fix:** Add `results.length > 0` guard before rendering provider group.

### Dynamic filter state resets on tab switch
- **File:** `frontend/src/pages/Search.tsx`
- **Issue:** `activeFilters` local state resets when switching Popular → Latest → Popular.
- **Fix:** Move to Zustand store or `useRef`.

### `vite-plugin-pwa` dev mode disabled
- **Issue:** Service worker not registered in dev. PWA features only work in production build.
- **Expected.** Run `bun run build && bun run preview` to test PWA.

### `tauri-plugin-autostart` may not compile on all Linux distros
- **Issue:** Requires platform autostart APIs. May fail on minimal setups.
- **Fix:** Gate behind `[target.'cfg(target_os = "linux")'.dependencies]` if needed.

### Tracker sync modal only supports AniList + MAL
- **File:** `frontend/src/pages/MangaDetail.tsx` → `showSyncModal`
- **Issue:** MangaUpdates, Shikimori, Bangumi show "Sync" button only for anilist/mal. Others show only "Unlink".
- **Fix:** Add sync handlers for MU/Shiki/BGM when their APIs support status+score writes.

---

## 📋 Platform Gaps (see PLATFORM_MATRIX.md)

| Feature | Web | Desktop | Android |
|---------|-----|---------|---------|
| Background sync (persistent) | ❌ | ✅ Rust task | ⬜ WorkManager |
| Biometric lock | ❌ | ⬜ | ⬜ |
| Discord Rich Presence | ❌ | ✅ | ❌ |
| Volume keys | ❌ (browser) | ✅ keyboard | ✅ Kotlin plugin |
| Filesystem (custom path) | ❌ | ✅ | ✅ Documents/ |
| Push notifications | ✅ Web Push | ✅ OS notif | ⬜ FCM needed |
| Download notification | ❌ | ❌ | ✅ local-notifications |
</content>
</invoke>
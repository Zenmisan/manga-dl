# manga-dl — Full Feature Roadmap

Derived from a complete audit of the Tachiyomi source repo vs current manga-dl implementation.
Features are grouped by area, then tagged:

- ✅ Done (already in manga-dl)
- 🔨 Partial (exists but incomplete)
- ❌ Missing (Tachiyomi has it, manga-dl doesn't)
- ⭐ Original (manga-dl exclusive — not in Tachiyomi)
- 💡 Idea (not in either — new additions to consider)

---

## 📚 Library

| Feature | Status | Notes |
|---------|--------|-------|
| Basic library view (grid/list) | ✅ | Grid + list toggle |
| Library cards with cover | ✅ | |
| Subscribe to manga | ✅ | |
| Unread chapter badge on card | ✅ | Blue "N new" badge in grid; "· N unread" in list |
| Download status badge | ✅ | files.length/total_chapters shown on card |
| Cover image on library cards | ✅ | Proxied cover art in grid + list view |
| Continue reading button on card | ✅ | Pulls from history, navigates to last chapter |
| Sort by: title A-Z, Z-A, most downloaded | ✅ | Sort panel in library toolbar |
| Filter by: subscribed, downloading, failed | ✅ | Filter panel in library toolbar |
| Categories / collections | ✅ | Category tabs above library; 5 default + custom |
| Default category assignment | ✅ | Set from MangaDetail page |
| Sort by: last read, last update, unread count, date added | ✅ | Title, downloaded, last read, unread count sorts added |
| Filter by: downloaded, unread, started, completed, tracker | ❌ | subscribed/downloading/failed filters exist |
| Batch actions: multi-select delete / move / download | ❌ | |
| Cover image cache | 🔨 | Proxied but not cached locally |
| Refresh library from source | ✅ | Refresh button exists |
| Local CBZ/ZIP import | 🔨 | IndexedDB only, no folder scan on web |
| Auto-update library (scheduled background check) | ❌ | |
| Update restrictions: WiFi only, charging only | ❌ | |
| Portrait/landscape column count config | ❌ | |
| Backend-unreachable banner | ✅ | Amber WifiOff banner on fetch fail |

---

## 📖 Reader

| Feature | Status | Notes |
|---------|--------|-------|
| Left-to-right pager mode | ✅ | |
| Right-to-left pager mode | ✅ | |
| Webtoon (continuous vertical scroll) | ✅ | |
| Vertical pager (non-continuous) | ❌ | Tachiyomi has this as 4th mode |
| Page number display | ✅ | |
| Fullscreen mode | ✅ | |
| Ambilight / ambient glow effect | ⭐ | manga-dl exclusive |
| AI upscale / enhance (beta) | ⭐ | manga-dl exclusive |
| Export chapter as PDF | ⭐ | manga-dl exclusive |
| Export chapter as EPUB | ⭐ | manga-dl exclusive |
| Upload local CBZ to cloud | ⭐ | manga-dl exclusive |
| Image scale types: fit screen, fit width, fit height, original | ✅ | Cycle button in header (pager mode only) |
| Zoom start position: auto / left / right / center | ❌ | |
| Double-tap zoom speed config | ❌ | |
| True color mode | ❌ | |
| Brightness slider | ✅ | In filter panel |
| Contrast slider | ✅ | In filter panel |
| Color filter: grayscale, invert, sepia | ✅ | Toggle buttons in filter panel |
| Filter panel persist across sessions | ✅ | Stored in zustand persist |
| Crop borders (pager) | ❌ | Remove whitespace around pages |
| Crop borders (webtoon) | ❌ | |
| Webtoon side padding config | ❌ | |
| Landscape zoom mode | ❌ | |
| Dual-page spread support | ❌ | |
| Split dual-page spreads | ❌ | |
| Rotate oversized pages to fit | ❌ | |
| Tap zone layouts (default / L-nav / Kindlish / edge / disabled) | ❌ | Fixed layout only |
| Volume key navigation | ✅ | Arrow + volume keys cycle pages in pager mode |
| Volume key → brightness/contrast mode | ✅ | Optional toggle in filter panel |
| Long-tap enable/disable | ❌ | |
| Tap inversion (horizontal / vertical / both) | ❌ | |
| Skip already-read chapters | ❌ | |
| Skip filtered chapters | ❌ | |
| Auto-download while reading (X chapters ahead) | ❌ | |
| Remove chapter after read (auto-delete) | ❌ | |
| Chapter transition screen | ✅ | End-of-chapter overlay with "Next Chapter →" |
| Cloud reading progress sync | ✅ | Supabase-backed |
| Resume last page on open | ✅ | |
| Incognito mode (skip history save) | ✅ | Toggle in Settings + respected in Reader |
| Shareable chapter link | ✅ | Web Share API + clipboard fallback |
| Discord Rich Presence (desktop) | ✅ | Tauri invoke to discord-rich-presence crate |
| Swipe actions on chapter items | ❌ | Bookmark, mark read, download |

---

## 🔌 Extensions / Sources

| Feature | Status | Notes |
|---------|--------|-------|
| Install extensions from repo | ✅ | |
| Uninstall extensions | ✅ | |
| Per-user extension storage | ✅ | Keyed by Supabase user ID |
| Extension search in marketplace | 🔨 | Basic, no filtering |
| Extension language filter | ❌ | |
| Extension enable/disable toggle | ❌ | |
| Extension update checking | ❌ | |
| Source preferences (per-extension settings UI) | ❌ | |
| Multiple extension repos | ❌ | Only Keiyoushi |
| Browse source: Popular listing | ✅ | MangaDex popular tab (sorted by followedCount) |
| Browse source: Latest updates | ✅ | MangaDex latest tab (sorted by latestUploadedChapter) |
| Dynamic source filters (checkboxes, selects, text per-source) | ✅ | Filter panel on Popular tab; MangaDex supports content rating, sort, status, demographic |
| Global multi-source parallel search | ✅ | Results grouped by provider when searching all sources |
| Pin favourite sources | ❌ | |
| Source deep link (open manga from URL) | ❌ | |
| Non-library source browsing | ❌ | Browsing without adding to library |
| WebView fallback for Cloudflare sources | ❌ | |

---

## ⬇️ Downloads

| Feature | Status | Notes |
|---------|--------|-------|
| Download queue | ✅ | |
| Pause/resume queue | ✅ | |
| Cancel individual download | ✅ | |
| Clear history | ✅ | |
| Real-time progress via WebSocket | ✅ | |
| Cloud storage (Supabase) | ⭐ | manga-dl exclusive |
| CBZ format | ✅ | |
| ComicInfo.xml embedded in CBZ | ✅ | Series/Title/Number/PageCount/Manga fields |
| Retry failed downloads | ✅ | Retry button on failed history items |
| Folder format (source/manga/chapter/page) | ❌ | |
| Download only on WiFi | ❌ | |
| Custom download location (desktop) | ❌ | |
| Auto-download new chapters for subscribed manga | ❌ | |
| Auto-download exclusions per category | ❌ | |
| Download badge on manga cards | ❌ | |
| Split tall images | ❌ | For extremely tall webtoon pages |
| Download notification with progress (mobile) | ❌ | |

---

## 📡 Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| AniList OAuth | ✅ | |
| MyAnimeList OAuth | ✅ | |
| MAL auto-sync on chapter completion | ✅ | Fires when last page reached |
| Kitsu OAuth (password grant) | ✅ | Email+password → token; username shown |
| MangaUpdates | ❌ | |
| Shikimori (Russian) | ❌ | |
| Bangumi (Chinese) | ❌ | |
| Komga (self-hosted) | ❌ | |
| Suwayomi server | ❌ | |
| Sync: last chapter read | 🔨 | Partial — chapter_id stored, not chapter number |
| Sync: reading status | ❌ | |
| Sync: score | ❌ | |
| Sync: start / finish dates | ❌ | |
| Auto-update tracker on chapter completion | ✅ | MAL only |
| Search manga on tracker (link manga) | ❌ | |
| Pull from tracker (update manga from tracker) | ❌ | |
| Tracker filter in library | ❌ | |

---

## 🕐 History

| Feature | Status | Notes |
|---------|--------|-------|
| Reading history page | ✅ | Full page with list view |
| Last read chapter per manga | ✅ | Stored + shown in history |
| Last page read per chapter | ✅ | Cloud synced |
| Manga title + chapter title in history | ✅ | Saved via 5-part URL encoding |
| Clear history (global) | ✅ | "Clear All" button on history page |
| Clear history (per manga) | ✅ | Trash icon per row; DELETE /users/history/{provider}/{manga_id} |
| Filter history by date | ❌ | |
| Resume reading from history | ✅ | Resume button navigates back to exact chapter |
| Incognito mode bypasses history | ✅ | |
| History across devices (cloud sync) | ⭐ | Supabase-backed |

---

## 📊 Statistics

| Feature | Status | Notes |
|---------|--------|-------|
| Total manga count | ✅ | |
| Total chapters read | ✅ | |
| Total pages count | ✅ | |
| Storage used | ✅ | |
| Download activity chart (30 days) | ✅ | |
| Provider breakdown chart | ✅ | |
| Download streak | ✅ | |
| All-time reading heatmap (GitHub-style) | ✅ | 52-week grid, green intensity by count |
| Reading goals (monthly chapters / yearly manga) | ✅ | Set targets with progress bars; persisted locally |
| Reading time estimate | ❌ | Based on pages × avg time |
| Per-category stats | ❌ | |
| Tracker score distribution | ❌ | |
| Most read genre | ❌ | |
| Reading pace (chapters/week) | ❌ | |

---

## 💾 Backup & Restore

| Feature | Status | Notes |
|---------|--------|-------|
| Export backup as JSON | ✅ | Library + history + all settings |
| Import backup from JSON | ✅ | Restores settings; prompts reload |
| Backup: manga list | ✅ | Via library API |
| Backup: reading history | ✅ | Via history API |
| Backup: app settings | ✅ | API key, backend URL, tracker IDs, reader prefs |
| Backup: categories | ✅ | categories + manga-categories localStorage keys exported |
| Backup: read tracking + bookmarks | ✅ | Included in cloud backup |
| Backup: tracking data | ❌ | Tokens not exported (security) |
| Backup: downloaded chapters list | ❌ | |
| Selective restore | ❌ | All-or-nothing import currently |
| Auto-backup (scheduled) | ❌ | |
| Cloud backup (Supabase) | ✅ | Upload/download backup JSON via manga-backups storage bucket |
| Tachiyomi backup import (JSON) | ✅ | Reads backupManga list + backupCategories |

---

## 🔐 Security & Privacy

| Feature | Status | Notes |
|---------|--------|-------|
| Supabase account auth | ✅ | |
| 3-device registration | ✅ | |
| API key auth for backend | ✅ | |
| Default API key pre-populated | ✅ | Set on first load if not present |
| Incognito mode (no history) | ✅ | Toggle in Settings, persisted |
| Biometric / PIN lock | ❌ | |
| App lock with timeout | ❌ | |
| Secure screen (block screenshots) | ❌ | Android only |
| Hide notification content | ❌ | |
| Lock on screen off | ❌ | |

---

## 🌐 Network & Performance

| Feature | Status | Notes |
|---------|--------|-------|
| Image proxy (bypass hotlink protection) | ✅ | curl_cffi Chrome impersonation |
| Custom backend URL | ✅ | |
| DNS over HTTPS | ❌ | |
| Custom user agent | ❌ | |
| Download only on WiFi | ❌ | |
| Verbose network logging | ❌ | |
| Offline PWA (service worker cache) | ✅ | vite-plugin-pwa with workbox NetworkFirst/CacheFirst strategies |
| Preload next chapter while reading | ❌ | |
| Image prefetch in reader | ❌ | |

---

## 🎨 UI & Appearance

| Feature | Status | Notes |
|---------|--------|-------|
| Dark theme | ✅ | Only dark — no light |
| Glassmorphism design system | ✅ | manga-dl style |
| Hover tooltips on buttons (web) | ✅ | |
| Icon legend / help page | ✅ | |
| Mobile bottom navigation | ✅ | |
| Desktop sidebar with extra links | ✅ | History, Stats, Get App in sidebar |
| Responsive layout (web/tablet/mobile) | ✅ | |
| Animated transitions | ✅ | Framer Motion |
| Relative time display ("2d ago") | ✅ | In History and Updates pages |
| System theme follow (light/dark) | ❌ | |
| Light theme | ❌ | |
| Material You / dynamic colors | ❌ | Android only |
| AMOLED pitch black mode | ❌ | |
| Custom date format | ❌ | |
| Tablet multi-column layout | ❌ | |
| Onboarding / first-run screen | ✅ | 3-step flow: welcome → backend config → done |
| App update notification | ❌ | |

---

## 🔔 Notifications & Updates

| Feature | Status | Notes |
|---------|--------|-------|
| Browser push notifications | ✅ | When chapter queued |
| Updates feed page | ✅ | Groups new chapters by manga, Read Online + Download buttons |
| New chapter available notification | ❌ | |
| Scheduled background chapter check | ❌ | |
| Per-manga notification toggle | ❌ | |
| Update interval configuration | ❌ | |
| Update only on WiFi | ❌ | |
| Badge count on app icon (mobile) | ❌ | |

---

## 📂 Local Source & File Handling

| Feature | Status | Notes |
|---------|--------|-------|
| Read local CBZ/ZIP | ✅ | Via IndexedDB |
| Read local EPUB | ❌ | |
| Read local folder (directory of images) | ❌ | |
| RAR/CBR support | ❌ | |
| 7Z support | ❌ | |
| Custom cover for local manga | ❌ | |
| Metadata file parsing (ComicInfo.xml) | ✅ | Embedded when packaging CBZ (Series/Title/Number/PageCount/Manga) |
| Import from Google Drive | 💡 | Cloud file picker |
| Import from Dropbox | 💡 | |

---

## 🔀 Advanced Manga Management

| Feature | Status | Notes |
|---------|--------|-------|
| Chapter sort: number, date, alphabetical | ✅ | Sort dropdown in MangaDetail |
| Chapter search by title | ✅ | Search input in MangaDetail |
| Chapter sort ascending/descending | 🔨 | Preset modes only, no explicit asc/desc flip |
| Chapter filter: read/unread/all | ✅ | Filter buttons above chapter list |
| Bookmark individual chapters | ✅ | Amber bookmark icon per chapter, persisted in localStorage |
| Scanlator filter (hide specific groups) | ✅ | Dropdown filtered from [GroupName] in chapter titles |
| Mark chapters read/unread in bulk | ✅ | "Mark All Read" button in MangaDetail |
| Source migration (move manga between sources) | ❌ | |
| Duplicate manga detection | ❌ | |
| Manual manga metadata edit | ❌ | Edit title, cover, description |
| Custom cover upload | ❌ | |
| Manga notes / personal rating | ✅ | 5-star rating + free-text note per manga, localStorage-persisted |

---

## 💡 manga-dl Exclusive Ideas (Not in Tachiyomi)

| Feature | Notes |
|---------|-------|
| ⭐ Cloud library (Supabase storage) | CBZ files in the cloud |
| ⭐ Multi-device sync via account | Reading progress synced |
| ⭐ Web platform | No install required |
| ⭐ PDF export | Per-chapter |
| ⭐ EPUB export | Per-chapter |
| ⭐ Ambilight reader effect | Ambient colour behind pages |
| ⭐ AI upscale (beta) | Sharp low-res pages |
| ⭐ Online streaming | Read without downloading |
| ⭐ GitHub-style reading heatmap | ✅ 52-week activity grid in Stats |
| ✅ Shareable chapter link | Web Share API + clipboard fallback |
| ✅ Reading goals | Monthly chapters + yearly manga targets with progress bars |
| ✅ ComicInfo.xml support | Embedded in every CBZ; Kavita/Komga/Paperback compatible |
| ✅ Offline PWA | Service worker via vite-plugin-pwa |
| ✅ Cloud backup to Supabase | Export/import through manga-backups bucket |
| ✅ Discord Rich Presence (desktop) | Updates when reading via Tauri IPC |
| ✅ Import from Tachiyomi backup | JSON backup: reads manga list + categories |
| ✅ Public profile page | `/profile/:userId` — shareable, chapters/manga/streak + recent activity |
| ✅ Manga notes & personal star rating | 5-star + free-text note per manga |
| 💡 Reading sessions / Pomodoro mode | Timed reading with session tracking |
| 💡 "Similar to X" recommendations | AI-powered discovery |

---

## Priority Execution Order

### Phase 1 — Core gaps ✅ complete
1. ✅ Reading history page + resume from history
2. ✅ Updates feed ("new chapters in your library")
3. ✅ Retry failed downloads
4. ✅ Chapter sort + search within manga detail
5. ✅ Continue reading button on library card
6. ✅ Onboarding screen (first-run flow)
7. ✅ Unread badge on library cards

### Phase 2 — Power user features ✅ complete
8. ✅ Reader: brightness + contrast + color filters
9. ✅ Reader: volume key navigation + optional brightness mode
10. ✅ Reader: chapter transition screen
11. ✅ Reader: fit-width / fit-height / original scale types
12. ✅ Incognito mode
13. ✅ Backup / restore (JSON export + import)
14. ✅ GitHub-style reading heatmap in stats
15. ✅ Library sort (title A-Z/Z-A, most downloaded) + filter (subscribed/downloading/failed)
16. ✅ Source browse: Popular + Latest tabs (MangaDex; other providers return [] gracefully)
17. ✅ Cover images on library cards

### Phase 3 — Polish & differentiation ✅ complete
17. ✅ Library categories / collections
18. ✅ Chapter bookmarks + scanlator filter
19. ✅ Global multi-source search (results grouped by provider)
20. ✅ Kitsu tracker (password grant)
21. ✅ Offline PWA (vite-plugin-pwa + workbox)
22. ✅ ComicInfo.xml embedded in CBZ output
23. ✅ Reading goals in Stats
24. ✅ Cloud backup to Supabase storage
25. ✅ Tachiyomi backup importer (JSON format)
26. ✅ Discord Rich Presence (Tauri desktop)
27. ✅ Shareable chapter links

### Phase 4 — Original features ✅ complete
28. ✅ Public profile page — `/profile/:userId`, shareable, shows chapters/manga/streak + recent activity
29. ✅ Dynamic source filters — filter panel on Popular tab, MangaDex: content rating, sort, status, demographic
30. ✅ Manga notes & personal star rating — 5-star + free-text note, persisted in localStorage per manga

### Phase 5 — Web QoL ✅ complete
31. ✅ Vertical pager reading mode — slides pages top→bottom with `y: 40/-40` animation
32. ✅ Skip read chapters — toggle in Reader filter panel; "Next Unread →" skips already-read chapters
33. ✅ Image prefetch — next 3 pages pre-loaded into browser memory while reading
34. ✅ Dashboard sort: last read + unread count — sorts library by reading recency or most unread
35. ✅ Dashboard filter: has unread — filters to manga with chapters not yet read
36. ✅ Download badge on grid cards — X/Y chapters downloaded shown on card overlay + badge row
37. ✅ Chapter row swipe actions — swipe left on chapter row to reveal bookmark/mark-read/download tray
38. ✅ Clear history per manga — trash icon per history row; backend DELETE /users/history/{provider}/{manga_id}

# manga-dl — Master Implementation Plan

Last updated: 2026-06-14

---

## PHASE A — Bug Fixes & Android Build (DONE ✅)

- [x] Fixed `MainActivity.java` — `registerPlugin` moved to `onCreate`, `getPlugin` by string name
- [x] Fixed `VolumeKeysPlugin.kt` — `JSObject()` instead of `null` in `notifyListeners`
- [x] Fixed bookmarks key `provider:provider` → `provider:mangaId`
- [x] Fixed MAL sync chapters read (was hardcoded 0)
- [x] Fixed ComicInfo.xml `xml.sax.saxutils.escape()` on all string fields
- [x] Fixed pipe-in-title URL encoding: btoa encode in MangaDetail, atob decode in Reader
- [x] Discord App ID confirmed real (`1515346416430485785`)
- [x] Supabase `manga-backups` bucket created by user

---

## PHASE B — Supabase Sync (DONE ✅)

- [x] `readTracking.ts` — syncs to `read_tracking` table on every write, pulls on app start
- [x] `categories.ts` — syncs to `user_categories` table on every write, pulls on app start
- [x] `mangaNotes.ts` — syncs to `manga_notes` table on every write, pulls on app start
- [x] `App.tsx` — calls all 3 sync functions on mount
- [x] `docs/supabase/migrations.sql` — all 3 tables + RLS policies documented
- [ ] **TODO**: Actually run `docs/supabase/migrations.sql` in Supabase SQL editor

---

## PHASE C — Landing Page + Auth Routing (NEXT UP)

### C1. Route Restructure
- [ ] Change `/` route → `Landing.tsx` (new page)
- [ ] Add `/r` route → `Dashboard` (the app)
- [ ] Update sidebar nav: Library path `'/'` → `'/r'`
- [ ] Update sidebar logo link `'/'` → `'/r'`
- [ ] `Login.tsx`: change `navigate('/')` → `navigate('/r')` after success

### C2. Auth State Wiring
- [ ] `App.tsx`: add `supabase.auth.getSession()` on mount + `onAuthStateChange` listener
- [ ] Store session in React state (not Zustand — ephemeral)
- [ ] Pass session down via context or prop
- [ ] Sidebar: show user avatar (initials circle) + email when logged in
- [ ] Sidebar: show red "Sign In" button when logged out
- [ ] Add "Sign Out" action in sidebar when logged in

### C3. Landing Page (`frontend/src/pages/Landing.tsx`)
Sections in order:

**Hero** (100dvh, full screen)
- Background: `#050505` + radial red glow at center top + CSS grain texture overlay
- Display font: `Bebas Neue` (via Google Fonts) for headline
- Headline: **"Read Everything. Own Everything."**
- Subhead: "50+ sources. Offline reading. AniList sync. Free, forever."
- CTA 1: "Start Reading" → `/r` (red filled pill button)
- CTA 2: "Sign In" → `/login` (ghost outline button)
- Framer Motion: staggered word-by-word reveal, spring easing
- Faint manga panel grid lines in background (CSS, low opacity)

**Stats Strip** (narrow band)
- `50+` Sources · `3` Platforms · `∞` Chapters · `0$` Cost
- Large numbers in red, thin uppercase labels

**Features Grid** (6 cards, 2-col mobile / 3-col desktop)
- Offline Reading (CBZ/EPUB download)
- 50+ Sources (MangaDex, MangaKatana, Komga, Suwayomi...)
- Cross-Device Sync (read state, categories, notes via Supabase)
- Tracker Integration (AniList, MAL, Kitsu, MU, Shikimori, Bangumi)
- 3 Platforms (Web PWA + Desktop Tauri + Android APK)
- No Ads, No DRM, No Limits
- Each card: glass panel, icon, title, short description, subtle red border on hover
- Framer Motion: scroll-triggered reveal, stagger

**How It Works** (3 steps)
1. Search → 50+ sources simultaneously
2. Read or Download → stream online or save CBZ offline
3. Track → syncs with AniList/MAL automatically

**Platform Section** (3 cards)
- Web PWA → "Open in Browser" → `/r`
- Desktop → "Download for macOS/Windows/Linux" → `/download`
- Android → "Download APK" → GitHub releases link
- Each card: platform icon, name, badge, CTA link

**Final CTA** (dark card with red glow border)
- "Start your library in 30 seconds."
- Email input pre-filling → `/register?email=...`
- Microcopy: "No credit card. No ads."

**Footer**
- Logo · Library `/r` · Sign In `/login` · Help `/help` · GitHub link
- Copyright line

### C4. SEO (in `frontend/index.html`)
- `<title>` manga-dl — Read & Download Manga from 50+ Sources, Free
- `<meta name="description">` Manga reader for web, desktop, and Android...
- Open Graph tags (og:title, og:description, og:image)
- Schema JSON-LD: SoftwareApplication
- `frontend/public/robots.txt`
- `frontend/public/sitemap.xml`

---

## PHASE D — Android UI Restructure (Mobile-first)

### D1. Bottom Navigation Restructure
Current (6 items, too crowded): Library · Search · Updates · Extensions · Downloads · Settings

New (5 items matching Tachiyomi pattern):
`Library · Updates · History · Browse · More`

- `More` opens a dedicated `MorePage` component (not a modal)
- Downloads, Settings, Stats, Categories accessible from More

### D2. More Page (`frontend/src/pages/More.tsx`)
New page at `/more`:
- Quick toggles section: Downloaded only, Incognito mode (with pill toggles)
- Links: Download queue (with count badge) · Categories · Statistics · Data & Storage · Settings · Help · About

### D3. Library Improvements (Dashboard.tsx)
- Unread chapter badge: top-left corner of cover card (red pill with count)
- 2-column default on mobile (already using gridColumns store value)
- Category tabs: horizontal scrollable pill tabs below header
- Empty state: `(˵•_•˵)` emoticon + "Your library is empty. Add manga from Browse."
- Long-press → batch select mode (already implemented)

### D4. MangaDetail Improvements
- Blurred cover as full-width hero background (~200px tall)
- Cover thumbnail overlaid bottom-left of hero
- Floating "Resume" / "Start" FAB pill button (red) bottom-right
- Chapter dot indicator: red dot = unread, grey dot = read

### D5. Browse Page Restructure (Sources.tsx)
- Tab bar: `Sources · Extensions · Migrate`
- Sources tab: grouped sections (Last Used, Pinned, by Language)
- Each source row: icon square + name + language + "Latest" link + pin toggle
- Extensions tab: "Update all" banner when updates pending, then Installed list

### D6. Settings — Sub-page Architecture
Replace current flat Settings page with categorized sub-pages:

**Settings index** (`/settings`):
- Appearance → theme, grid columns, AMOLED
- Reader → reading mode, tap zones, dual page, image scale, webtoon padding
- Library → categories, skip read chapters, auto-backup
- Downloads → download location, auto-download
- Tracking → AniList, MAL, Kitsu, MU, Shikimori, Bangumi links
- Sync → WiFi only, charging only gates
- Security & Privacy → biometric lock, incognito mode
- Data & Storage → backup/restore, cloud backup, clear cache
- Advanced → API key, custom backend URL
- About → version, GitHub, terms

Each sub-page is its own route: `/settings/appearance`, `/settings/reader`, etc.

### D7. Empty States
Add Tachiyomi-style empty states to:
- Updates page: `(˵•_•˵)` + "No recent updates"
- History page: `(˵•_•˵)` + "No reading history"
- Downloads page when empty
- Search before query entered

---

## PHASE E — Desktop UI (Tauri — our own design, not Tachiyomi)

### E1. Sidebar Enhancement
Current sidebar has all nav items. Add:
- User avatar / Sign In section at very bottom (above Help)
- Active indicator: left border accent (red) not just icon color
- Collapsible sidebar (icon-only mode) for smaller windows

### E2. Desktop-specific Layout
- Library: support 4-6 column grid (already have gridColumns)
- MangaDetail: two-column layout on wide screens (cover+info left, chapters right)
- Reader: keyboard shortcut overlay on first open
- Settings: two-panel layout (category list left, content right) like macOS System Preferences

### E3. Window Chrome
- Custom titlebar (Tauri) with drag region
- Traffic light buttons (close/min/max) or standard Windows chrome
- Menu bar: File, Library, View, Help

---

## PHASE F — SEO & Marketing

### F1. Landing Page SEO (part of Phase C)
Already planned above.

### F2. Sitemap & robots.txt
```
/robots.txt → allow all, disallow /api
/sitemap.xml → /, /login, /register, /help, /download
```

### F3. OG Image
- Create `frontend/public/og-image.png` (1200×630)
- Dark background, red "M" logo, app name, tagline
- Used in og:image meta tag

---

## PHASE G — Known Remaining Code Issues

- [ ] Manga metadata overrides (`manga-dl-meta-overrides`) still localStorage only
- [ ] Source migration doesn't rename downloaded files on disk
- [ ] Heatmap counts downloads not reads
- [ ] Search shows source headers even with 0 results
- [ ] Search filter state resets on tab switch
- [ ] Public profile shows UUID (no display_name system)
- [ ] Tracker sync only for AniList + MAL (MU/Shiki/BGM no write API)
- [ ] Android WorkManager background sync (currently web-based 30min timer)
- [ ] RAR/CBR archive support not implemented
- [ ] WebView fallback for Cloudflare-protected sources

---

## PHASE H — Before Shipping Checklist

- [ ] Run `docs/supabase/migrations.sql` in Supabase SQL editor
- [ ] Create `manga-backups` Supabase storage bucket (DONE by user)
- [ ] Replace Discord App ID fake value (DONE — real ID confirmed)
- [ ] Generate OG image for landing page
- [ ] Test Android APK build end-to-end (after volume keys fix)
- [ ] Test desktop build (Tauri) on Windows + macOS
- [ ] Verify Supabase auth flows (email verify, login, register)
- [ ] Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in GitHub secrets
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Firebase hosting env if applicable

---

## Implementation Order (recommended)

1. **Phase C** — Landing page + auth routing (highest user-facing impact)
2. **Phase D1–D3** — Android bottom nav + More page + Library improvements
3. **Phase D4–D6** — MangaDetail + Browse + Settings sub-pages
4. **Phase E** — Desktop layout improvements
5. **Phase F** — SEO/marketing meta
6. **Phase G** — Fix remaining code issues (low priority, mostly polish)

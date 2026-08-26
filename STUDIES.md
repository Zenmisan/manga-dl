# Manga Site Design Studies

Reference for future site builds. Covers home, browse/search, title detail, and reader pages.
Studies conducted 2026-08-26 via screenshots.

---

## S1 · MangaDex — mangadex.org

**Genre impression:** Dense information architecture. The reference standard for manga metadata.

### Nav
- **N7 sidebar** — persistent left sidebar, icon+label nav items
- Logo top, nav items stacked, settings/profile bottom
- Not used for marketing pages; sidebar is app-shell only

### Home / Discovery
- Cover-art hero with featured series
- Horizontal carousels by category (Latest / Popular / Seasonal)
- No right sidebar

### Title Detail
- Layout: left narrow sidebar (cover + actions) + wide right main + right sidebar (stats/links)
- Cover ~220px wide, sticky
- Actions: "Add to Library" (primary), "Read" (secondary)
- Alt titles row (collapsible)
- Colored categorical tags — each tag has an assigned background color (not all one color)
- GENRES / THEMES / DEMOGRAPHICS / CONTENT RATING all separate labeled sections
- Horizontal stats bar: follows / rating / year / status / pub status
- **Volume accordion** — chapters grouped by volume, accordion expand
- Each chapter row: Ch.N · group name · language flag · time · bookmark
- Related/similar sidebar on right

### Search
- Dense 2-col list view default
- Cover small-left, metadata right
- Colored tags on result cards (same system as detail page)
- Sidebar filters (always visible): Status / Demographic / Content Rating / Genres / Tags / Sort

### Reader
- Minimal: fixed top bar (title + chapter nav) + fixed bottom (page counter)
- Reading mode toggle in top bar
- No scrubber

### Key DNA for borrowing
- Colored tag system (each genre gets a fixed hue)
- Volume accordion for chapter list
- Dense 2-col search results
- Sidebar metadata pattern on detail page

---

## S2 · comix.to

**Genre impression:** Clean utilitarian. Best detail page hierarchy of all three studied.

### Nav
- **N1 toolbar** — `[logo] [full-width centered search] [Browse] [gear] [hamburger] [Login CTA]`
- Login button: solid cyan pill
- Browse → dropdown: Trending / Popular / Groups / Collections / Browse all

### Home / Discovery
- Announcements card (left border accent, cyan links)
- Social share row
- Ranked horizontal carousels (#1–#5 with rank badge overlay)
- Latest Updates carousel (Hot/New tab toggle)
- **Right sidebar** (persistent): Recently Added live feed (thumb + type badge + title + time) + Top 10 Uploaders ranked list

### Title Detail — **cleanest layout studied**
Layout: narrow left sidebar (cover + actions, sticky) + wide right main + right sidebar (recommendations)

**Left sidebar:**
- Cover art static (no parallax)
- `Start reading` — full-width cyan primary with book icon
- `Follow >` — full-width outline ghost
- `Add to Collection >` — full-width outline ghost
- 5-star rating (interactive)

**Right main:**
- Breadcrumb `HOME / MANHWA`
- Title (700 weight)
- Alt titles row — globe icon + dropdown chevron
- Status chip row: `MANHWA` · `SAFE` · `2025` · `● RELEASING` · `K0`
- Stats: `#89 · ★ 9.3 by 721 users · 30,252 followed`
- Description + "[View more]"
- Metadata sections (eyebrow label → chip row):
  - GENRES / TAGS / DEMOGRAPHICS / FORMATS / AUTHORS / ARTISTS / PUBLISHERS
  - TRACKERS — favicon-sized colored icons: `al` `mal` `mu` `mb`
- Share row
- **Chapters section:**
  - `Search chapter...` input
  - `All groups` dropdown
  - `Chapter · Volume · Date` sort tabs (not select)
  - Flat list rows: `Ch.N (cyan)` · `👤 Group Name` · `💬 N` · `time ago` · `🔖`
  - Multiple rows per chapter (one per scanlator group)
- Right sidebar: Recommendations (small thumb + title + upvote count + expand chevron)

### Settings / Filters modal
- Centered modal
- Pill theme switcher: Main / Dark / Light (cyan active)
- Content filter: radio buttons (Safe / Suggestive [RECOMMENDED] / Erotica / Pornographic)
- Content Preferences sub-modal: Types checkboxes + Demographic checkboxes + Blocked Genres grid

### Browse / Search
- Full-width search bar at top of page (not inside nav)
- "ADVANCED FILTERS" toggle button → reveals 2-row filter panel:
  - Row 1: Sort By | Content Rating (multi-select dropdown) | Types | Genres | Demographic | Release Status
  - Row 2: Min Chapter | Authors | Artists | [Reset Filters] [I'm Feeling Lucky]
- Result count: `N items` above results
- 2-col list view default + grid toggle
- List row: `[thumb]` + Title + `TYPE · YEAR · STATUS · Ch.X · ♥ N · ★ N` + description excerpt + time ago

### Reader
- **Thinnest chrome (tied with Asura)**
- Right-side icon rail: home / library / comments / TOC / fullscreen / settings / help
- Top right only: `← Ch.N / total →`
- Bottom right: `↔` width toggle · `– N% +` zoom
- Webtoon: vertical scroll, per-image loading badge `N / 10` centered
- Comments: slide-in panel from right side
- No scrubber anywhere

### Key DNA for borrowing
- Narrow left sidebar (cover + stacked actions) for detail page ← **chosen for R15**
- GENRES/TAGS/etc. each get own eyebrow label + chip row
- Tracker favicon icons in metadata
- Chapter list: multi-group rows, scan group attribution first-class
- ADVANCED FILTERS reveal (single button, not always-visible sidebar) ← **chosen for R16**
- Full-width search bar on search page (not in nav)
- 2-col list as default search view

---

## S3 · AsuraScans — asurascans.com

**Genre impression:** Premium-product energy. Polished, subscription-forward, reaction-heavy.

### Nav
- **Banner nav** — full-width solid purple `~#7c3aed`, height ~56px
- `[hooded-icon] [Home] [Browse] [Resources ▼]` | `[Search Ctrl+K] [Bookmarks] [Sign Up]`
- Search shows keyboard shortcut hint (good affordance)
- Completely chromatic nav (colored, not dark grey)

### Home / Discovery
- Premium announcement strip (dark purple card, crown icon, gold price pill, gradient CTA)
- Red announcement bar (announcements/news)
- **Hero carousel** — full-width horizontal, center cover elevated/spotlit, partial covers on sides, rating badge overlay, title overlaid bottom-left of active cover
- 2-col layout below hero:
  - Left: "Trending Comics" (★ icon + "All Comics" purple button) → horizontal carousel: title + chapter + rating
  - Left: "Trending Novels [BETA]" → same pattern
  - Right sidebar: "Popular" (Weekly/Monthly/All Time pill toggle) → numbered ranked list: thumb + title + genres + rating
- Latest updates section: 2-col card grid, each card showing thumb + title + last 3 chapters + timestamps
- EDITOR'S PICK feature: large editorial cover right sidebar

### Browse page
- Heading with count: `Browse Series 340` (count in small pill badge)
- 2-row filter chips — **"+" additive prefix** convention:
  - Row 1: `[≡ Latest Update ▼]` `[+ Status]` `[+ Type]` | right: `[Search series...]`
  - Row 2: `[+ Genres]` `[+ Creator]` `[+ Minimum Chapters]` `[👁 Hide Bookmarked]`
- Grid: large covers (~5 col), each: `★ N.N` badge overlay top-right, title + chapter count pill + status pill at bottom

### Title Detail
Layout: **50/50 equal split** (left: cover+metadata / right: description+chapters)

**Left column (cover + metadata):**
- Large cover art
- `★ Rating` button (gold-bordered full-width, tappable)
- **3-stat row** — most distinctive pattern in all studies:
  ```
  ★ 9.4        🟩 125       🔖 18.1K
  Rating    Chapters   Bookmarks
  ```
  Equal thirds, colored icon above number above label
- Status + Type: 2 ghost cards side-by-side (`● Ongoing` / `● MANHWA` with purple dot)
- Author row (pencil icon prefix)
- Artist row (image icon prefix)
- Genre chips (dark ghost pills, flat): Action / Adventure / Comedy / Fantasy / Tragedy

**Right column (description + chapters):**
- Title (large bold)
- Alt titles (muted, dot-separated)
- Description + "Show more ▼" / "Show less ▲"
- 3-button action row:
  - `🔖 Bookmark` (purple solid)
  - `👁 First Chapter` (ghost)
  - `⬇ Download Offline [PREMIUM]` (gold + "PREMIUM" badge embedded in button)
- `N Chapters` heading + `Newest ≡` sort toggle
- Chapter search input (full-width)
- **Chapter list scrollable region** (contained, own scrollbar):
  - Locked row: `🔒 Chapter N · EARLY ACCESS (amber) · Unlocks in Xh Ym · time ago`
  - Normal row: `Chapter N · time ago`
  - Read chapter: purple accent text
- **Reactions section** (bottom, full-width):
  - "What did you think of this series? — N reactions"
  - 6 emoji buttons: 👍 Upvote / 😂 Funny / ❤️ Love / 😮 Surprised / 😡 Angry / 😢 Sad

### Reader
- **Minimal** — matched with comix.to for thinnest chrome
- Top bar: `[🏠]` · `[thumb · Title · Chapter N]` · `[💬 N]`
- Bottom bar: `[← Prev]` · `[≡ Chapter N ▼]` · `[Next →]`
- Full-width image, black gutters, no settings visible
- No scrubber

### Key DNA for borrowing
- 3-stat bar (Rating | Chapters | Bookmarks) — punchy, real numbers ← **use in R15**
- `+ prefix` additive filter chips on browse ← **use in R16**
- Count badge on section headings (`Browse Series 340`)
- Emoji reactions section ← interesting for future
- Premium/locked chapter row (lock + badge + countdown) ← pattern for future
- Scrollable chapter list region (contained height, own scrollbar)

---

## Cross-study decisions

### R15 MangaDetail layout → comix.to model (narrow sidebar + wide main)
Reason: chapter list with scan group + chapter title + timestamps needs width. 50/50 (Asura) wastes space on metadata. Sidebar (comix) gives chapters room.

### R15 features confirmed by 2+ studies
| Feature | S1 | S2 | S3 |
|---|---|---|---|
| Cover left | ✓ | ✓ | ✓ |
| Inline chapter list | ✓ | ✓ | ✓ |
| Chapter search | ✓ | ✓ | ✓ |
| Genre chips | ✓ | ✓ | ✓ |
| Tracker icons | ✗ | ✓ | ✗ |
| Scan group on chapters | ✓ | ✓ | ✗ |
| 3-stat bar | ✗ | ✗ | ✓ |
| Related/recommendations | ✓ | ✓ | ✗ |

### R16 Search layout → comix.to model
- Full-width search bar on page (not in nav)
- Single "ADVANCED FILTERS" reveal button (not always-visible sidebar)
- 2-col list view default

---

## General observations across all three

- **All use dark canvases** — near-black or very dark grey
- **All show chapter count prominently** — users care about length
- **Readers are minimal** — the manga IS the UI; controls hide or are minimal
- **No site has a page scrubber** — manga-dl's scrubber is a differentiator
- **Cover art does the heavy lifting** on browse/home — grids of large covers outperform text lists for discovery
- **Rating is always prominent** — ★ N.N shown on every card and at the top of detail pages
- **Alt titles matter** — all three show them, some with dropdowns for the full list
- **Status badge is important** — Ongoing / Finished / Hiatus visible at a glance

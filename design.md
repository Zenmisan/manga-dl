# manga-dl design system

> **Hallmark-locked** — 2026-08-26. Future `hallmark redesign` runs on any page in this project read this file first and defer to it. The diversification rule is inverted here: pages must share the system, not rotate away from it.

---

## Identity

**Genre:** atmospheric — dark nocturnal tool, warm red accent, confident confidence without decoration  
**Product:** manga reader (web PWA + Tauri desktop + Android APK)  
**Voice:** direct, imperative, zero filler. "Start Reading." not "Get started with manga-dl today."

---

## Token system

All colour values must reference a named CSS custom property. Inline `oklch()`, `hex`, or `rgb()` values are forbidden in component files. If a value is needed that has no token, lift it into the token block first.

```css
/* :root — defined in Landing.tsx <style> tag; for app pages, mirror via index.css */
--color-paper:          oklch(9%  0.008 245);   /* near-black canvas */
--color-paper-2:        oklch(13% 0.009 245);   /* card / surface */
--color-paper-3:        oklch(18% 0.010 245);   /* hover surface */
--color-ink:            oklch(94% 0.006 220);   /* near-white body text */
--color-ink-2:          oklch(65% 0.010 235);   /* muted text */
--color-ink-3:          oklch(38% 0.010 240);   /* very muted / placeholder */
--color-accent:         oklch(50% 0.230  27);   /* red — #dc2626 equivalent */
--color-accent-glow:    oklch(50% 0.230  27 / 0.20);
--color-accent-subtle:  oklch(18% 0.100  27);   /* dark red bg */
--color-rule:           oklch(20% 0.009 240);   /* hairlines / borders */
--color-focus:          oklch(50% 0.230  27);   /* same as accent */

--font-display: 'Anton', sans-serif;
--font-body:    'Inter', system-ui, sans-serif;

--space-3xs: 0.25rem;  --space-2xs: 0.5rem;   --space-xs: 0.75rem;
--space-sm:  1rem;     --space-md:  1.5rem;   --space-lg: 2.5rem;
--space-xl:  4rem;     --space-2xl: 6rem;     --space-3xl: 9rem;

--ease-out: cubic-bezier(0.16, 1, 0.3, 1);

--radius-pill:  999px;
--radius-card:  1rem;
--radius-input: 0.75rem;
```

**App pages** (`/r`, `/reader`, `/search`, `/sources`, `/profile`, etc.) use the existing app token layer (`var(--surface)`, `var(--border)`, `var(--accent)`, `var(--muted2)`, etc.) — these are defined in `frontend/src/index.css`. Do NOT import the `--color-*` landing tokens into app pages; they are Landing-scoped. Instead, when app-page tokens need to match the landing system, alias them in `index.css`.

---

## Typography

| Role | Font | Weight | Transform |
|---|---|---|---|
| Display headline | Anton | 400 (bold by design) | `uppercase` |
| Section heading | Anton or Inter | 900 (Inter) | mixed case preferred |
| Body | Inter | 400–600 | sentence case |
| Label / eyebrow | Inter | 900 | `uppercase` + `tracking-[.2em]` |
| Monospace / ordinal | Anton | 400 | as-is |

**Rules:**
- All headings and display type: `font-style: normal` (roman only — no italic headers)
- Display size: `clamp(3.5rem, 13vw, 10rem)` for hero, scale down for section heads
- Section headings: **left-aligned by default** on marketing pages — not centered
- `overflow-wrap: anywhere; min-width: 0` on all display text (prevents horizontal overflow)
- No gradient text. Emphasis via weight, accent colour, or a drawn underline

**2+1 discipline:** Anton (display) + Inter (body) = 2 faces. One optional accent (monospace) only if the page needs code. No third decorative face.

---

## Colour usage rules

- Canvas: `var(--color-paper)` on marketing pages, `var(--bg)` / `var(--surface)` on app pages
- Primary text: `var(--color-ink)` / `var(--fg)`
- Muted text: `var(--color-ink-2)` / `var(--muted2)`
- Accent: `var(--color-accent)` / `var(--accent)` — warm red, single accent, used sparingly
- Focus ring: always `focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black` (Tailwind class chain). Never `outline: none` alone.
- Bloom: `radial-gradient(ellipse … var(--color-accent-glow) 0%, transparent 65%)` — maximum 2 blooms per page, opacity ≤ 0.25 except in hero

---

## Motion

**Stance:** framer-motion (motion-on project). Atmospheric genre rules apply:

- **Fade only** — `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`. No slide (`y: ±N`) on in-view entrance animations.
- **Duration:** 0.6–0.8s for primary content; 0.4s for UI feedback
- **Ease:** `[0.16, 1, 0.3, 1]` (fast-out) for entrances; default for feedback
- **Stagger cap:** `Math.min(idx * 0.03, 0.3)` — cap all stagger delays at 300ms
- **No bounce, no spring, no scale-up:** `scale: 1 → 1` entrance only. `active:scale-[0.98]` on cards is fine (interaction feedback, not decoration)
- **No decorative loops:** no `animate={{ rotate: 360 }}`, no infinite float

---

## Layout rules — marketing pages (Landing, MangaDetail, etc.)

- **Macrostructure:** Split Studio (15) is the established choice for manga-dl. Use it unless a page is structurally incompatible (e.g. a purely data-display page). Do not rotate to a different macrostructure without deliberate justification.
- **Section rhythm:** NO uniform "heading + cards" pattern across all sections. Each section must differ in layout from the previous.
- **Section headings:** left-aligned eyebrow (`var(--color-accent)`, `text-[10px] font-black uppercase tracking-[.25em]`) + left-aligned display heading beneath it
- **Max width:** `max-w-6xl mx-auto` content container
- **Horizontal padding:** `px-6 md:px-12`
- **Section vertical padding:** `py-24` typical; hero `min-h-[100dvh]`
- **Border rhythm:** `border-top: 1px solid var(--color-rule)` between major sections — no cards with heavy shadow as section dividers

---

## Layout rules — app pages (Dashboard, Reader, Search, Sources, Profile, etc.)

- App pages live inside the app shell and use app-level tokens (`var(--surface)`, `var(--border)`, etc.)
- **Sticky header:** `sticky-header` class, consistent height ~60px
- **Content padding:** `px-4 md:px-6` + `pt-4 pb-28` (bottom clears the fixed nav/bulk bar)
- **Empty states:** left-aligned atmospheric treatment. No centered glass card. Pattern: `radial-gradient` bloom (accent-muted) + left-aligned icon + display heading ~26px weight-900 + muted body text + left-aligned action buttons. Decorative faded placeholder grid (3×2) optional on desktop.
- **Card grids:** `repeat(auto-fill, minmax(Npx, 1fr))` — always `minmax(0, 1fr)` variants, never bare `1fr`
- **Tab bars:** `role="tablist"` on container, `role="tab" aria-selected={...}` on each tab
- **Filter chips:** `aria-pressed={isActive}` on each toggle chip

---

## Nav archetype

**Marketing pages:** N5 Floating Pill  
- `position: fixed; top: 1rem; left: 50%; transform: translateX(-50%)`  
- `width: min(92%, 640px); border-radius: 999px`  
- `backdrop-filter: blur(20px); background: oklch(9% 0.008 245 / 0.82)`  
- `border: 1px solid var(--color-rule)`  
- Structure: `[logo + wordmark] [Library · Help] [Sign In · Open App]`

**App pages:** existing `sticky-header` class (toolbar-style, not nav-style)

---

## Footer archetype

**Marketing pages:** Ft5 Statement  
- Big display sentence: `font-family: var(--font-display); font-size: clamp(2.5rem, 8vw, 7rem); uppercase`
- Line 1 full contrast (`var(--color-ink)`), line 2 muted (`var(--color-ink-3)`)
- Example: "Read more. / Spend less."
- Below: thin rule + `[logo] [nav links] [tagline crossfade · © year]`

---

## Interactive components — 8-state requirement

Every interactive component ships code for all 8 states:

| State | Implementation |
|---|---|
| default | base styles |
| hover | `hover:` Tailwind or `:hover` CSS |
| focus | `focus-visible:ring-2 focus-visible:ring-red-500 …` |
| active | `active:scale-[0.98]` or `active:opacity-80` |
| disabled | `disabled:opacity-40 disabled:pointer-events-none` |
| loading | spinner icon + label change + `disabled` attr |
| error | accent-red state, `role="alert"` on message |
| success | green-tinted state or toast + reset |

---

## Accessibility floor

These are non-negotiable on every component:

- `aria-label` (not `title`) on all icon-only buttons
- `aria-pressed` on all toggle buttons
- `aria-selected` on all tab buttons within a `role="tablist"`
- `aria-live="polite" aria-atomic="true"` on page counters, status text that updates
- No `confirm()` / `alert()` — replace with inline confirm state + auto-dismiss toast (3500ms)
- Focus ring: `focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black` on every interactive element

---

## Slop gates (always active)

| Gate | Rule |
|---|---|
| No gradient text | `background-clip: text` forbidden |
| No italic headers | All headings `font-style: normal` |
| No invented metrics | Never write numbers not supplied by real data |
| No fake chrome | No hand-drawn browser bars, phone frames, code-editor mocks |
| No mid-render color improvisation | All colors via `var(--color-*)` tokens only |
| Two-line click text | Button labels must be single-line on mobile |
| Grid track safety | Always `minmax(0, 1fr)` not bare `1fr` |
| Display header wrap | `overflow-wrap: anywhere; min-width: 0` on all display text |
| Root overflow | `overflow-x: clip` on `html` and `body` — never `hidden` |

---

## CTA voice

Short, imperative, specific. Examples:

| ✓ Do | ✗ Don't |
|---|---|
| "Start Reading" | "Get Started with manga-dl" |
| "Browse Sources" | "Explore our catalog of sources" |
| "Upload Archives" | "Upload Local Archive(s) / Batches (.zip, .cbz)" |
| "Open App" | "Open the Application" |
| "Sign In" | "Log in to your account" |

---

## Honest copy rule

If a metric, testimonial, or count was not supplied by real data: do not write it. Use `—` as a placeholder label. Real numbers used in this project:

- 50+ sources
- 3 platforms (Web, Desktop, Android)
- 6+ trackers (AniList, MAL, Kitsu, MangaUpdates, Shikimori, Bangumi)
- $0 (free, open source)

---

## Files locked by this system

| File | Role |
|---|---|
| `frontend/src/pages/Landing.tsx` | Marketing landing — R1 redesign complete |
| `frontend/src/pages/Dashboard.tsx` | App library view — R2 redesign complete |
| `frontend/src/components/dashboard/DashboardHeader.tsx` | App header — A2 audit complete |
| `frontend/src/components/dashboard/DashboardMangaCard.tsx` | Library card — A2 + R2 complete |
| `frontend/src/components/dashboard/DashboardCategoryTabs.tsx` | Category tabs — R2 complete |
| `frontend/src/components/dashboard/DashboardSortFilterPanel.tsx` | Sort/filter — R2 complete |
| `frontend/src/pages/MangaDetail.tsx` | Title detail — R15 complete |
| `frontend/src/components/manga/MangaHeroHeader.tsx` | Detail hero — R15 complete |
| `frontend/src/components/manga/MangaChaptersSection.tsx` | Chapter list — R15 a11y+motion complete |
| `frontend/src/pages/Reader.tsx` | Reader — A3 complete |
| `frontend/src/components/reader/ReaderHeader.tsx` | Reader header — A3 complete |
| `frontend/src/components/reader/ReaderViewport.tsx` | Reader viewport — A3 complete |
| `frontend/src/pages/Onboarding.tsx` | Onboarding wizard — R12 complete |
| `frontend/src/pages/Search.tsx` | Search + Browse — R16 complete |
| `frontend/src/pages/Sources.tsx` | Extensions page — A5 complete |
| `frontend/src/pages/Login.tsx` | Auth login — motion + a11y pass complete |
| `frontend/src/pages/Register.tsx` | Auth register — motion + a11y pass complete |
| `frontend/src/pages/Stats.tsx` | Stats — motion violations fixed |
| `.hallmark/log.json` | Hallmark run history |

---

*To amend this system: update the relevant section, bump the date at the top, and note what changed. Do not add a third font face, swap the genre, or change the token names without full-page audit of existing files.*

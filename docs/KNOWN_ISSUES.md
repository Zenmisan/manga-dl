# Known Issues and Limitations

Last updated: 2026-10-08

---

## Critical / Required Database Setup

### Supabase Production Database Migrations
Run the full migration script located at `docs/supabase/migrations.sql` in the Supabase SQL Editor:

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider, manga_id, chapter_id)
);

-- Read tracking (chapter-level read state, synced by readTracking.ts)
CREATE TABLE IF NOT EXISTS read_tracking (
  user_id     VARCHAR NOT NULL,
  provider    VARCHAR NOT NULL,
  manga_id    VARCHAR NOT NULL,
  chapter_ids JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider, manga_id)
);

-- Category assignments (synced by categories.ts)
CREATE TABLE IF NOT EXISTS user_categories (
  user_id           VARCHAR NOT NULL PRIMARY KEY,
  custom_categories JSONB NOT NULL DEFAULT '[]',
  manga_assignments JSONB NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manga notes and ratings (synced by mangaNotes.ts)
CREATE TABLE IF NOT EXISTS manga_notes (
  user_id    VARCHAR NOT NULL,
  provider   VARCHAR NOT NULL,
  manga_id   VARCHAR NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  rating     INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider, manga_id)
);
```

Enable Row Level Security (RLS) on all user-scoped tables per policies in `docs/supabase/migrations.sql`.

---

## Resolved Issues

- **Backend unreachable banner auto-dismiss:** Banner auto-dismisses after 30s and has a working close button.
- **Blank page on first visit at `/r`:** Routing race condition resolved; session check completes prior to rendering app shell.
- **Onboarding skipped for fresh web users:** First-visit onboarding triggers reliably for unauthenticated users entering reader mode.
- **Bookmark storage compound keys:** Repaired compound key format `provider:mangaId`.
- **MyAnimeList chapter number sync:** Sync handler passes numerical chapter value rather than raw string IDs.
- **URL encoding for titles containing pipes:** Titles encoded using base64 URL safe representations.
- **MangaDex chapter title formatting:** Added fallback formatting to present `Chapter X: Title` rather than raw UUIDs.
- **MangaKatana title selector:** Repaired selector matching and catalog endpoints.
- **Public Library 403 Forbidden:** Unlocked `/library` endpoints for all authenticated users.
- **Reader mobile navigation overlap:** Hid main app navigation bar during reader view routes.

---

## Extension and Provider Constraints

### Keiyoushi Index Format
The community Keiyoushi index supplies Android APK metadata packages rather than raw JavaScript sources. Installed third-party packages act as discovery catalogs, whereas data scraping executes through the built-in JavaScript sources in [backend/app/services/extensions/](file:///home/zenmi/Projects/manga-dl/backend/app/services/extensions).

### Source Migration Disk Paths
Migrating a title to an alternative provider updates the database record, but downloaded archives retain their original filesystem path until re-downloaded or moved.

---

## Minor UX Behaviors

### Web Auto-Backup Browser Prompt
- **Context:** `frontend/src/pages/Settings.tsx`
- **Behavior:** Triggering client-side backups on the Web PWA prompts a standard browser download dialog because web security forbids silent filesystem writes. Native platforms write backups directly to local storage.

### Search Empty Provider Headers
- **Context:** `frontend/src/pages/Search.tsx`
- **Behavior:** Headers for providers returning 0 search matches may briefly render during fan-out queries.

### Dynamic Filter State Resets on Tab Switch
- **Context:** `frontend/src/pages/Search.tsx`
- **Behavior:** Active filter criteria reset when switching between Popular and Latest tabs.

---

## Platform Matrix Comparison

| Capability | Web (PWA) | Android (Native) | Windows (Native) | Linux (Native) |
|---|---|---|---|---|
| Background update polling | Not Supported | Supported (WorkManager) | Supported (BackgroundService) | Supported (Daemon) |
| Direct source networking (no proxy) | Not Supported | Supported (OkHttp) | Supported (HttpClient) | Supported (Soup3) |
| Biometric app unlock | Planned | Supported (BiometricPrompt) | Planned (Windows Hello) | Planned |
| Discord Rich Presence | Not Supported | N/A | Supported (IPC) | Supported (IPC) |
| Hardware key navigation | Not Supported | Supported (Volume rocker) | Supported (Keyboard) | Supported (Keyboard) |
| Custom storage directory | Not Supported | Supported | Supported | Supported |
| Native push notifications | Supported (Web Push) | Supported (FCM / Local) | Supported (WinUI Toast) | Supported (Desktop Notif) |
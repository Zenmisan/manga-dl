# Platform Feature Matrix

manga-dl runs on three platforms. Features are categorised by where they belong.
This is a planning document — ticked items are implemented, unticked are planned.

Legend: ✅ Done · 🔨 Partial · ⬜ Planned · ❌ Not possible · — Not applicable

---

## 🌐 Web (PWA)

Web is the baseline. Everything that doesn't require native OS access goes here.
Accessed via browser; can be installed as a PWA (service worker caches assets + API responses).

| Feature | Status | Notes |
|---------|--------|-------|
| Full manga reader (all modes) | ✅ | Pager LTR/RTL, webtoon |
| Online streaming (no download) | ✅ | |
| Library management | ✅ | |
| Search + browse sources | ✅ | |
| Download queue | ✅ | Downloads via backend; served via API |
| Reading history + progress sync | ✅ | Supabase-backed |
| Stats + heatmap | ✅ | |
| AniList / MAL / Kitsu tracking | ✅ | OAuth redirects work in browser |
| Reader brightness/contrast/filters | ✅ | CSS filter |
| PWA offline mode | ✅ | vite-plugin-pwa + workbox |
| Web Share API (share chapter link) | ✅ | Falls back to clipboard |
| Push notifications (chapter alerts) | ✅ | Notification API |
| Cloud backup / restore | ✅ | Supabase Storage |
| Tachiyomi backup import (JSON) | ✅ | |
| Incognito mode | ✅ | |
| Reading goals | ✅ | |
| Manga notes + rating | ✅ | |
| Library categories | ✅ | |
| Chapter bookmarks + scanlator filter | ✅ | |
| Unread badge | ✅ | |
| Public profile page | ✅ | |
| Dynamic source filters | ✅ | MangaDex only for now |
| CBZ export (save to Downloads) | 🔨 | Browser download prompt — no custom path |
| Local CBZ/ZIP import | 🔨 | File picker → IndexedDB; no folder scan |
| Background chapter sync | ❌ | No persistent background on web |
| Full filesystem access | ❌ | Sandboxed |
| Discord Rich Presence | ❌ | No IPC to Discord client |
| Volume hardware keys | ❌ | Browser doesn't expose volume keys |
| Biometric lock | ❌ | WebAuthn possible future |
| System tray | ❌ | |

---

## 🖥️ Desktop (Tauri v2)

Desktop builds on top of web — all web features work. These are additions.
Shipped as a native binary (.exe / .app / .deb / .AppImage).

| Feature | Web baseline | Desktop extra | Status | Notes |
|---------|-------------|--------------|--------|-------|
| All web features | ✅ | — | ✅ | |
| Full filesystem access | ❌ | ✅ | ✅ | `tauri-plugin-fs` |
| Custom download location | ❌ | ✅ | ⬜ | Config in Settings; Tauri `download_dir` |
| Local folder scan | ❌ | ✅ | ⬜ | Scan a directory for CBZ/ZIP files |
| Reveal in file manager | — | ✅ | ✅ | Nautilus/Dolphin/Finder/Explorer |
| System tray (hide to tray) | ❌ | ✅ | ✅ | Tray icon + hide-on-close |
| Background chapter sync | ❌ | ✅ | ⬜ | Rust async task while app runs in tray |
| Discord Rich Presence | ❌ | ✅ | ✅ | `discord-rich-presence` Rust crate (needs real App ID) |
| Volume key navigation | ❌ | ✅ | ✅ | Global keyboard listener in reader |
| OS notifications | ❌ | ✅ | ⬜ | Tauri notification plugin (vs Web Push) |
| Auto-launch on startup | — | ✅ | ⬜ | `tauri-plugin-autostart` |
| Update checker (in-app) | ❌ | ✅ | ⬜ | `tauri-plugin-updater` |
| Biometric (OS keychain lock) | ❌ | ✅ | ⬜ | Windows Hello / macOS Touch ID via Tauri |
| Window remember size/position | — | ✅ | ⬜ | Persist window state |
| Custom title bar | — | ✅ | ⬜ | Frameless + custom controls |
| File drag-and-drop (CBZ import) | ❌ | ✅ | ⬜ | Tauri drag-drop event → direct import |
| ComicInfo.xml embedded CBZ | — | ✅ | ✅ | Backend already writes it |

---

## 📱 Android (Capacitor)

Android builds the web app into a native WebView. All web features work.
Capacitor plugins add native APIs.

| Feature | Web baseline | Android extra | Status | Notes |
|---------|-------------|--------------|--------|-------|
| All web features | ✅ | — | ✅ | |
| Volume key next/prev page | ❌ | ✅ | ⬜ | Capacitor key listener; different from browser volume which controls media |
| Hardware back button | — | ✅ | ⬜ | Capacitor `App.addListener('backButton')` |
| Biometric / PIN lock | ❌ | ✅ | ⬜ | `@capacitor-community/biometric-auth` |
| Secure screen (no screenshots) | ❌ | ✅ | ⬜ | `FLAG_SECURE` via Capacitor plugin or custom native code |
| Push notifications (FCM) | 🔨 | ✅ | ⬜ | `@capacitor/push-notifications` + Firebase |
| Share sheet (native) | 🔨 | ✅ | ⬜ | Capacitor `Share` plugin — richer than Web Share API |
| Download to device storage | 🔨 | ✅ | ⬜ | `@capacitor/filesystem` → Downloads folder |
| Status bar colour theming | — | ✅ | ⬜ | `@capacitor/status-bar` → match ambilight colour |
| Keep screen on while reading | — | ✅ | ⬜ | `@capacitor/keep-awake` |
| Badge count on app icon | ❌ | ✅ | ⬜ | `@capacitor/badge` (requires FCM) |
| Haptic feedback | — | ✅ | ⬜ | `@capacitor/haptics` on chapter advance |
| Material You dynamic colours | — | ✅ | ⬜ | Android 12+ `DynamicColors` — needs custom native plugin |
| Background sync (WorkManager) | ❌ | ✅ | ⬜ | `@capacitor/background-task` → schedule chapter check |
| Discord Rich Presence | ❌ | ❌ | ❌ | Discord mobile doesn't expose RPC |
| System tray | ❌ | — | — | Not applicable on Android |
| Offline reading (downloaded) | ✅ (PWA) | ✅ | 🔨 | Capacitor filesystem for CBZ; IndexedDB for uploaded |

---

## 🚦 Implementation Priority (platform-specific items only)

### Desktop — next wave
1. ⬜ Custom download location (Settings → pick folder)
2. ⬜ File drag-and-drop CBZ import
3. ⬜ Background chapter sync (tray process)
4. ⬜ OS notifications via Tauri plugin
5. ⬜ Auto-launch on startup toggle
6. ⬜ In-app update checker

### Android — next wave
1. ⬜ Volume key page navigation
2. ⬜ Hardware back button handling
3. ⬜ Keep screen on while reading
4. ⬜ Status bar colour sync with ambilight
5. ⬜ Haptic feedback on page turn
6. ⬜ Download to device storage
7. ⬜ Biometric lock
8. ⬜ Push notifications (FCM)

### Both desktop + Android
1. ⬜ Background chapter sync
2. ⬜ Biometric / PIN lock

---

## Notes

- **iOS is not currently planned.** Tauri v2 has experimental iOS support; Capacitor supports iOS. If added, most Android items translate directly, except: no Material You, uses Face ID / Touch ID instead of Android biometric.
- **Linux desktop** works via Tauri AppImage/deb but Discord RPC requires `libdiscord-rpc`. The crate handles this.
- **Windows desktop** is fully supported via Tauri MSI. File manager reveal uses `explorer /select`.

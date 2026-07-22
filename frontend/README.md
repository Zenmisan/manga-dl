# Manga OS Frontend

Shared React 19 codebase powering Web, Desktop, and Android.

## Tech Stack
- **Framework**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand (persist) + TanStack Query v5 (server state / caching)
- **Native Wrappers**: Tauri v2 (Desktop) + Capacitor v8 (Android)

## Development Setup

```bash
bun install
```

### Run Web Version
```bash
bun run dev
```

### Run Desktop Version (Tauri)
Requires Rust installed.
```bash
bun run tauri dev
```

### Run Android Version (Capacitor)
Requires Android Studio installed.
```bash
bun run build
bun run android:sync
bun run android:open
```

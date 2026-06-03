# Manga OS

The ultimate cross-platform, local-first manga & webtoon reader. Built as a successor to Tachiyomi, Manga OS runs natively on **Windows, macOS, Linux, Android, and the Web** from a single codebase.

![Manga OS Reader](frontend/public/icons.svg)

## Features

- **Tri-Platform Native**: Runs via Tauri (Desktop), Capacitor (Android), and Firebase (Web).
- **Universal Extension Engine**: Install community scrapers (like Keiyoushi) via JS sandboxes to access 500+ sources without backend limits.
- **Smart Binge**: Zero-latency reading. Auto-prefetches next chapter pages while you read.
- **Chameleon UI**: Interface dynamically tints to match current manga cover art.
- **Ambilight & Modes**: Supports Webtoon (Vertical scroll), Manga LTR, and Manga RTL.
- **Local Mastery**: Instantly read massive local CBZ/ZIP folders. No cloud upload required for native clients.
- **Ecosystem Sync**: Bi-directional AniList tracking and cross-device progression via Supabase.

## Quick Start (Web)

Visit the live web version: [manga-dl.web.app](https://manga-dl.web.app)

## Downloads (Native Apps)

*Coming soon via GitHub Actions Release pipeline.*
- **Windows**: `.msi`, `.exe`
- **macOS**: `.dmg` (Universal)
- **Linux**: `.AppImage`, `.deb`
- **Android**: `.apk`

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Frontend Development (Web/Tauri/Capacitor)](frontend/README.md)
- [Backend Development (FastAPI Proxy/Sync)](backend/README.md)

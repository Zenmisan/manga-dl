# Manga OS: The God Tier Cross-Platform Reader

The ultimate open-source successor to Tachiyomi. Built for the modern web and native platforms, Manga OS provides a seamless, high-performance reading experience across **Windows, macOS, Linux, Android, and the Web**.

![Manga OS Hero](frontend/src/assets/hero.png)

## 🚀 Key God-Tier Features

- **Universal Extension Engine**: Bypass backend limitations by running community-made scrapers (JS plugins) directly in your browser or native app. Access 500+ sources instantly.
- **Smart Binge™ Engine**: Predictive prefetching that loads the next chapter's images while you read. Zero-latency transitions between chapters.
- **Chameleon UI**: A premium "Glassmorphic" interface that dynamically extracts colors from manga cover art to theme the entire application mood.
- **Ambilight Reader**: Immersive reading experience with dynamic edge-glow that bridges the gap between panels and your dark background.
- **Tri-Platform Native**:
  - **Desktop**: Powered by Tauri (Rust) for instant local file system access and system tray integration.
  - **Mobile**: Powered by Capacitor for native Android performance, SQLite offline databases, and haptic feedback.
  - **Web**: Firebase-hosted SPA for instant access anywhere.
- **Local Mastery**: Instantly scan and read massive local directories of CBZ/ZIP files without uploading to the cloud.
- **Ecosystem Sync**: Bi-directional AniList/MAL tracking and cross-device progression via Supabase Cloud Storage.

## 📦 Native Downloads

Visit the [Download Hub](https://manga-dl.web.app/download) to get the latest version for your device:
- 🪟 **Windows**: `.msi`, `.exe`
- 🍎 **macOS**: `.dmg` (Universal)
- 🐧 **Linux**: `.AppImage`, `.deb`
- 🤖 **Android**: `.apk` (Alpha)

## 🛠️ Development & Compilation

Read the **[Local Compilation Guide](docs/CONTRIBUTING.md)** to set up your environment and build the apps from source.

### Project Structure
- `frontend/`: Shared React 19 core + Tauri + Capacitor shells.
- `backend/`: FastAPI proxy for storage sync and image enhancement.
- `docs/`: Technical specifications and architecture diagrams.

---
Built with ❤️ by the Manga OS Team.

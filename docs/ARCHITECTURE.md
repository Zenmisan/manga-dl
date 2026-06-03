# Tri-Platform Architecture

Manga OS utilizes a single frontend monorepo wrapped by native shells.

```mermaid
graph TD
    A[React Core + Zustand + Tailwind] --> B(Vite Build)
    
    B --> C{Deployment Target}
    
    C -->|Web| D[Firebase Hosting]
    C -->|Desktop| E[Tauri Shell Rust]
    C -->|Mobile| F[Capacitor Shell Android]
    
    D --> G[FastAPI Backend Render]
    E --> H[Native FS / JS Sandbox]
    F --> I[SQLite / JS Sandbox]
    
    G --> J[(Supabase PG/Storage)]
    H -.->|Optional Sync| J
    I -.->|Optional Sync| J
```

## Data Flow
- **Web Users**: Rely on the FastAPI backend for scraping due to browser CORS limits.
- **Native Users (Tauri/Capacitor)**: Run JS scrapers directly on device, bypassing backend bottleneck. Local storage handles gigabytes of CBZ files instantly. Supabase used only for progress syncing.

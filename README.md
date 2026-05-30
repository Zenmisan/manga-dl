# manga-dl

A self-hostable manga downloader and library manager with a modern React dashboard.

## Features

- **Multi-Source Search**: Search across MangaDex, Asura Scans, MangaKatana, and OmegaScans simultaneously.
- **Asynchronous Queue**: Efficiently download chapters with controlled concurrency.
- **Real-time Progress**: Live progress bars via WebSockets.
- **Auto-Sync**: Background task checks for new chapters in your subscribed manga every 6 hours.
- **Library Manager**: Scan and view your downloaded CBZ collection.
- **Cloudflare Bypass**: Uses `curl_cffi` to mimic real browser behavior and avoid scrapers' blocks.
- **Security**: Optional API Key protection for remote hosting.

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, SQLAlchemy (SQLite), BeautifulSoup4, `curl_cffi`.
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React.
- **Orchestration**: Bun, Concurrently.

## Getting Started

### Prerequisites
- Python 3.10+
- [Bun](https://bun.sh) (recommended) or Node.js

### Installation
From the root directory:
```bash
bun run install:all
```
*Note: This installs frontend NPM packages and backend Python requirements.*

### Running the Project
```bash
bun dev
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs

## Configuration

Edit `backend/app/config.py` or create a `.env` file in `backend/`:

- `DATABASE_URL`: SQLAlchemy connection string (default: SQLite).
- `LIBRARY_PATH`: Where your CBZ files are stored.
- `API_KEY`: Set this to enable authentication (header `X-API-Key`).
- `MAX_CONCURRENT_DOWNLOADS`: Number of parallel downloads (default: 3).

## Directory Structure
- `backend/`: FastAPI application logic.
- `frontend/`: React dashboard.
- `manga-library/`: Default download location.

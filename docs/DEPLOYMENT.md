# Deployment Guide (Free Tier)

This guide explains how to deploy **manga-dl** for free using a combination of cloud providers.

## Architecture
- **Frontend**: [Firebase Hosting](https://firebase.google.com/) (Free CDN)
- **Backend**: [Render](https://render.com/) (Free Web Service using Docker)
- **Database**: [Supabase](https://supabase.com/) (Free PostgreSQL)

---

## 1. Database Setup (Supabase)
Free hosting providers like Render use ephemeral storage, meaning SQLite files are deleted on every restart. You **must** use an external database for persistence.

1. Create a free project at [Supabase](https://supabase.com/).
2. Navigate to **Project Settings > Database**.
3. Copy the **Connection String (URI)**.
4. Modify the prefix from `postgresql://` to `postgresql+asyncpg://` (this is required for the async backend).
   - *Example:* `postgresql+asyncpg://postgres:password@db.xxxx.supabase.co:5432/postgres`

---

## 2. Backend Deployment (Render)
Render allows you to deploy the backend using the provided `Dockerfile`.

1. Push your project to a GitHub repository.
2. Sign in to [Render](https://render.com/) and create a new **Web Service**.
3. Connect your GitHub repository.
4. Set the following:
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
5. Add these **Environment Variables**:
   - `DATABASE_URL`: Your Supabase URI from Step 1.
   - `API_KEY`: A secure secret of your choice.
   - `CORS_ORIGINS`: `https://your-firebase-app.web.app` (You can also provide a comma-separated list or a JSON array).
   - `LIBRARY_PATH`: `/tmp/manga-library`
   - `CACHE_PATH`: `/tmp/manga-cache`

*Note: Render Free tier services sleep after 15 minutes of inactivity. The first request after a break may take ~60 seconds to wake up.*

---

## 3. Frontend Deployment (Firebase)

### Update API Configuration
Modify `frontend/src/lib/api.ts` to point to your new backend:

```typescript
const api = axios.create({
  baseURL: 'https://your-backend-name.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
})
```

### Build and Deploy
1. Install Firebase Tools: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting` (Set public directory to `frontend/dist`)
4. Build:
   ```bash
   cd frontend
   npm run build # or bun run build
   ```
5. Deploy: `firebase deploy --only hosting`

---

## 4. Limitations & Persistence
- **Manga Storage**: Files downloaded to `/tmp/manga-library` on Render are **ephemeral**. They will be deleted when the server restarts or goes to sleep.
- **Recommended Workflow**: Use the app to download chapters, and then immediately download the resulting `.cbz` file to your local device from the "Library" or "Downloads" page.
- **Permanent Solution**: For 100% permanent storage, consider upgrading to a Render "Disk" (paid) or using a "real" VPS like the Oracle Cloud Free Tier.

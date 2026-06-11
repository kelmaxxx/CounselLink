# Deploying CounselLink (free tier)

Architecture: **Vercel** serves the React frontend, **Render** runs the Express API, and the MySQL database stays on **Aiven** (already set up). All three have free tiers with no credit card required.

```
Browser ──> Vercel (frontend, static)  ──fetch──>  Render (backend, Node)  ──SSL──>  Aiven (MySQL)
```

## 0. Before you deploy (one-time security steps)

1. **Rotate the Aiven database password.** The current one has been sitting in `.env` on disk and may have been shared. In the [Aiven console](https://console.aiven.io) → your service → reset the `avnadmin` password, then update `backend/.env` locally and the Render env vars below.
2. **JWT secret**: a real random secret is already in `backend/.env`. Generate a fresh one for production (don't reuse the dev one):
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Push the repo to GitHub (both Vercel and Render deploy straight from your repo).

## 1. Backend on Render

1. [render.com](https://render.com) → New → **Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. Environment variables (Settings → Environment):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DB_HOST` | your Aiven host (`...aivencloud.com`) |
   | `DB_PORT` | your Aiven port |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | the **new** rotated password |
   | `DB_NAME` | `counselink` |
   | `DB_SSL` | `true` |
   | `DB_CA_PATH` | `./ca.pem` (only if you commit Aiven's public CA cert to `backend/ca.pem` — it is a public cert, not a secret; omit both to connect encrypted-but-unverified) |
   | `JWT_SECRET` | fresh random secret from step 0.2 |
   | `JWT_EXPIRES_IN` | `1d` |
   | `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | your Gmail SMTP settings |
   | `CORS_ORIGINS` | your Vercel URL, e.g. `https://counsellink.vercel.app` (no trailing slash; comma-separate if you add more) |

4. Deploy. Verify: `https://<your-service>.onrender.com/api/health` returns `{"status":"ok"}`.

## 2. Frontend on Vercel

1. [vercel.com](https://vercel.com) → Add New → Project → import the repo.
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
3. Environment variable:
   - `VITE_API_BASE` = `https://<your-service>.onrender.com` (no trailing slash)
4. Deploy. `frontend/vercel.json` already handles React Router deep links (refreshing `/student/appointments` works).
5. Go back to Render and make sure `CORS_ORIGINS` matches your final Vercel URL exactly, then redeploy the backend if you changed it.

## 3. Smoke test after deploy

- Open the Vercel URL → login page loads with the new design.
- Log in with a real account → dashboard loads (first request may take ~50 s, see caveats).
- Refresh on an inner page → still works (SPA rewrite).
- Upload an avatar → image displays (cross-origin file serving).

## Caveats of the free tier (fine for a demo/defense)

- **Cold starts**: Render free services sleep after ~15 min idle; the first request then takes ~50 seconds. Consider warning users or using a free uptime pinger (e.g. cron-job.org hitting `/api/health` every 10 min) during your defense.
- **Ephemeral disk**: everything in `backend/uploads/` (COR files, avatars) is **wiped on every deploy or restart**. Acceptable for demos; the real fix later is moving uploads to Cloudinary (free tier) or S3.
- **Aiven free tier**: 1 free MySQL service; it can be paused after long inactivity — check the console before a demo.

## Why not Azure for Students?

Your .edu account gives $100/year credit + free App Service (F1) and Static Web Apps — it works, but the F1 tier has a 60 CPU-minutes/day cap, the setup has more moving parts, and the perks must be renewed yearly while enrolled. Vercel + Render is simpler and doesn't expire. Azure remains a good fallback if Render's cold starts become a problem.

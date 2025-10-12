# Deploying RiderInventory to Render (always-on web service)

This repository contains a static site plus a small gallery API originally implemented as a Netlify Function. To run an always-on service on Render, follow the steps below.

What we added for Render
- `server.js` — an Express server that: serves static files, exposes the Netlify-style function endpoints under `/.netlify/functions/gallery`, and falls back to `index.html` for SPA routes.
- `package.json` — includes `express` and a `start` script used by Render.

Deploy steps (Render)
1. Push your repository to GitHub (or connect Git provider).
2. Go to https://render.com and create an account (if you don't have one).
3. Click "New" → "Web Service".
4. Connect your GitHub repo and select this repository.
5. Set the following options:
   - Name: riderinventory
   - Branch: main (or whichever branch you want to deploy)
   - Build Command: (leave empty — no build step)
   - Start Command: `node server.js`
   - Environment: Node 18+ (matches engines)

6. Add environment variables in the Render dashboard (Settings → Environment):
   - CLOUDINARY_CLOUD_NAME = dqkosqeke
   - CLOUDINARY_API_KEY = 896655973757538
   - CLOUDINARY_API_SECRET = (your secret)

7. Click "Create Web Service" — Render will build and start the service. It provides a public URL that is always-on.

Notes
- The server exposes the same API path your site expects: `https://<render-url>/.netlify/functions/gallery`.
- For persistent storage across restarts, consider using a hosted database or object store rather than writing to local `gallery.json` (Render's filesystem may be ephemeral on redeploys).
- If you need background workers or scheduled jobs, Render supports background workers and cron jobs as separate services.

Security
- Avoid committing sensitive credentials. Use Render's Environment settings and rotate secrets if they were shared publicly.

If you want, I can create a `Dockerfile` instead and provide instructions to deploy a container to Render.
Docker (optional) — build and run locally
1. Build the Docker image locally:

```bash
docker build -t riderinventory:latest .
```

2. Run the container locally (maps port 3000):

```bash
docker run --rm -p 3000:3000 -e CLOUDINARY_CLOUD_NAME=dqkosqeke -e CLOUDINARY_API_KEY=896655973757538 -e CLOUDINARY_API_SECRET=_NWG9E7XjwbcEEg1jEv4HaQZOBw riderinventory:latest
```

Render manifest (`render.yaml`)
- A `render.yaml` is included so you can deploy using Render's Infrastructure as Code features. It references environment variables by key only — set actual values in the Render dashboard or using the Render CLI.

Deploy using `render.yaml` (if you use Render's Git integration)
1. Push the repo to GitHub.
2. In Render, create a new Web Service and choose "I have a render.yaml" during setup (or let Render discover it on connect).
3. Confirm the service settings and environment variables, then create the service.

Local verification
- Start server locally: `node server.js` and visit http://localhost:3000
- Confirm the gallery API: http://localhost:3000/.netlify/functions/gallery

---

If you'd like, I can create a background worker configuration (separate service) or switch `gallery.json` to store data in a small hosted Postgres instance (I can add Neon/Postgres connectivity and migration scripts). Tell me which you prefer.

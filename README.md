# SkyTrack — Flight Information System

Live flight tracking with a Mapbox map. Django + DRF backend, React (Vite) frontend.

## Architecture

```
frontend/          React 19 + Vite + TypeScript + react-map-gl (Mapbox)
backend/           Django 6 + DRF, Postgres (Neon), Whitenoise
render.yaml        Render Blueprint (backend web service + static frontend)
flight_backend/    Root shim so gunicorn (manual Web Service) finds the Django app
requirements.txt   Root requirements shim for manual Web Service builds
```

## Data sources

| Source | Use | Quota |
|---|---|---|
| OpenSky Network | Live positions, flight trail (`/tracks`) | 400 req/day anonymous, ~4000/day with API client |
| AviationStack | Schedules, airport arrivals/departures boards | 500 req/month (free) — responses cached 10 min |
| Local DB (seed) | "Today's flights" near a location | — |

OpenSky fallback order: authenticated OAuth2 token → anonymous → bundled sample data.

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/live-flights/?lamin=&lomin=&lamax=&lomax=` | Live flights (cached 10 s, 15 req/min/IP) |
| `GET /api/live/stream/?lamin=...` | Server-Sent Events stream (4 connections/min/IP) |
| `GET /api/flights/today/?lat=&lng=&radius_km=` | Today's flights near a location (cached 30 s) |
| `GET /api/search/?flight_number=&airline=&departure=&arrival=&date=` | Flight search |
| `GET /api/flights/<flight_number>/` | Flight detail |
| `GET /api/flights/arrival/?airport=JNB` | Arrivals board (cached 5 min) |
| `GET /api/flights/departure/?airport=JNB` | Departures board (cached 5 min) |
| `GET /api/track/<icao24>/` | Historical flight path / trail (cached 5 min) |
| `GET /api/airports/` | Airports (seeded) |
| `GET /api/stats/` | Dashboard stats (cached 60 s) |

All endpoints are rate-limited per client IP (in-memory sliding window) and
results are cached to protect upstream quota.

## Local development

Backend:

```bash
cd backend
python -m venv myvenv
myvenv\Scripts\activate           # Windows; . ./myvenv/bin/activate on Linux/macOS
pip install -r requirements.txt
copy .env.example .env            # fill in keys (see below)
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env            # VITE_MAPBOX_TOKEN
npm run dev                       # http://localhost:5173 (proxies /api to :8000)
```

### Environment variables

Backend (`backend/.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres URL (Neon) or `sqlite:///db.sqlite3` |
| `DJANGO_SECRET_KEY` | Django secret |
| `DJANGO_DEBUG` | `True`/`False` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts (no wildcard in production) |
| `CORS_ALLOW_ALL` | `False` in production; use `CORS_ALLOWED_ORIGINS` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `AVIATIONSTACK_API_KEY` | AviationStack key (free tier) |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | OpenSky OAuth2 API client (optional; anonymous fallback otherwise) |

Frontend (`frontend/.env`):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:8000/api` |
| `VITE_MAPBOX_TOKEN` | Mapbox public token (baked in at build time) |

## Deploy (Render)

**Recommended: Blueprint.** `render.yaml` pins `PYTHON_VERSION=3.12.4` (the
runtime.txt pin is ignored by manual Web Services) and runs migrations +
`seed_data` automatically. In Render: **New + → Blueprint → this repo**.

After the first Blueprint deploy, set the `sync: false` vars in the dashboard:

- Backend service: `AVIATIONSTACK_API_KEY`, `OPENSKY_CLIENT_ID`,
  `OPENSKY_CLIENT_SECRET`
- Frontend service: `VITE_MAPBOX_TOKEN` (then trigger a rebuild — Vite bakes
  env into the bundle at build time)
- Add the frontend's own onrender.com URL to `CORS_ALLOWED_ORIGINS`

### Manual services (legacy)

Manual Web Services ignore `render.yaml`/`rootDir`. The repo therefore ships
root-level shims: `requirements.txt` (`-r backend/requirements.txt`) and the
`flight_backend/` package (adds `backend/` to `sys.path` for gunicorn). Set the
same env vars above in each service.

## Security notes

- `CORS_ALLOW_ALL` defaults to `False`; origins must be explicitly allowed.
- `DJANGO_ALLOWED_HOSTS` has no wildcard fallback in production.
- **Mapbox token**: the `pk.` token is public by design, but restrict it to your
  site URL in the Mapbox dashboard (Account → Tokens → URL restrictions) so it
  cannot be used by others.
- **OpenSky credentials**: if you see `unauthorized_client` (401) in the logs,
  regenerate the API client at https://opensky-network.org — the current client
  id/secret pair is rejected by OpenSky's auth server.
- `npm audit` reports GHSA-qwww-vcr4-c8h2 (react-router 7.12.0–8.2.0, RSC-mode
  CSRF). SkyTrack is a plain SPA (`BrowserRouter`, no React Server Components),
  so the advisory does not apply; no patched release exists yet.

## Testing

```bash
# backend (uses a scratch sqlite DB; external APIs are mocked)
cd backend
DATABASE_URL=sqlite:///test_db.sqlite3 python manage.py test flights

# frontend
cd frontend
npm test        # vitest unit tests
npm run build   # tsc + vite production build
```

CI (`.github/workflows/ci.yml`) runs both on every push.

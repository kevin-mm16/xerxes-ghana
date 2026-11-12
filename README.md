# XERSXES Ghana

Map-first environmental intelligence for Ghana. The workspace shows photographic imagery with optional town labels. Google Hybrid is used when a restricted browser key is configured; Esri imagery and place labels work without one. District boundaries, monitoring areas, and reviewed observations are separate optional overlays.

## What works

- Detailed satellite/aerial imagery with switchable place labels and a Sentinel-2 composite fallback.
- Google Maps Hybrid integration, with automatic satellite fallback on loading or authentication failure.
- Import of GSS 2021 census district geography (261 districts), with source/version/checksum provenance.
- PostGIS monitoring polygons, versioned by Alembic and served through FastAPI.
- Browser geolocation with accuracy/time/source and authoritative spatial coverage checks.
- Persisted private observation metadata and capture locations.
- Optional private image/video intake, with bounded streaming uploads, SHA-256 integrity records, and durable background processing into private review copies.
- Public GeoJSON containing reference boundaries, coverage, and independently sanitized approved observations.

Monitoring boundaries are demonstration geometries, separate from GSS census district geography. Uploaded originals, review copies, and thumbnails stay private. Media-backed observations cannot be published through the existing development helper. Authenticated moderator review, content redaction, public media delivery, AI inference, raster processing, notifications, and production source protection remain unimplemented. The moderator screens are still disconnected demonstrations.

## Structure

- `apps/web`: Next.js App Router, React, Tailwind, Leaflet, typed API adapter, frontend tests.
- `apps/api`: FastAPI, SQLAlchemy, PostGIS models, Alembic migrations, private media storage/worker, spatial tests, and an explicit development publication helper for metadata-only observations.
- `services/geospatial`, `services/ai`: future processing boundaries; see [imagery and AI contracts](docs/imagery-and-ai-contracts.md).
- `research/xnp`: separate simulation-only node research.
- `infrastructure`: deployment notes. `docs`: architecture, security, scope, and local operation.

## Run locally without Docker

This workspace has an isolated PostgreSQL 18/PostGIS instance at `127.0.0.1:55432`, with `xerxes` and `xerxes_test` databases. Data is under `%LOCALAPPDATA%/Xersxes/postgresql18/data`. Local connection credentials are in ignored `.env`; they are not committed. The existing system PostgreSQL service is separate.

For a fresh machine, install PostgreSQL 16+ and PostGIS 3.4+, create application and `*_test` databases, and configure `DATABASE_URL` and `TEST_DATABASE_URL` using `.env.example`. Migrations require permission to install PostGIS (or an administrator can preinstall it). Use Python 3.12+ and Node 22. Video processing also requires FFmpeg and ffprobe on `PATH`, or explicit `FFMPEG_PATH` and `FFPROBE_PATH` settings in the root `.env`.

Windows, from the repository root:

```powershell
python -m venv apps/api/.venv
apps/api/.venv/Scripts/python.exe -m pip install -e "./apps/api[dev]"
python scripts/start_database.py
apps/api/.venv/Scripts/python.exe scripts/run_api.py migrate
apps/api/.venv/Scripts/python.exe scripts/run_api.py seed
apps/api/.venv/Scripts/python.exe scripts/run_api.py serve
```

The database starter is specific to the isolated instance prepared for this workspace; use your PostgreSQL service manager on other machines. Keep the media worker running in a second terminal:

```powershell
apps/api/.venv/Scripts/python.exe scripts/run_api.py worker
```

In another terminal, start the web application:

```powershell
npm.cmd --prefix apps/web ci
npm.cmd --prefix apps/web run dev
```

Open [the satellite workspace](http://localhost:3000/map) or [contribute](http://localhost:3000/report). API liveness is [localhost:8000/health](http://localhost:8000/health); database readiness is [localhost:8000/ready](http://localhost:8000/ready). The web server proxies supported `/api/v1` paths to `API_INTERNAL_URL`, defaulting to `http://127.0.0.1:8000`. Satellite fallback needs no key. To enable Google Hybrid, set a restricted `GOOGLE_MAPS_BROWSER_KEY` in ignored `apps/web/.env.local` and restart Next.js; no rebuild is required. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is also accepted.

See [map sources and district import](docs/map-sources.md) for the GSS import command, dataset vintage, and Google setup. In the map's Layers panel, toggle **Town and road labels** or **GSS district boundaries** independently.

See [private media intake](docs/media-intake.md) for supported formats, limits, capability-scoped uploads, processing states, cleanup, and privacy limitations. Native development stores private files in ignored `.local/evidence`; a production S3 adapter is not implemented, and this filesystem provider refuses production use.

See [UI system v2](docs/ui-system-v2.md) for the interface audit, design system, guided contribution flow, map stability changes and validation. The [Ghana focus notes](docs/map-focus.md) distinguish the visual country mask from district geography and coverage eligibility.

On Linux/macOS use `apps/api/.venv/bin/python` and `npm` instead.

## Checks

```powershell
apps/api/.venv/Scripts/python.exe -m ruff check apps/api/src apps/api/tests apps/api/migrations
apps/api/.venv/Scripts/python.exe scripts/run_api.py test
npm.cmd --prefix apps/web run test
npm.cmd --prefix apps/web run typecheck
npm.cmd --prefix apps/web run build
python scripts/verify_imagery.py
```

The spatial suite actually uses PostGIS and requires a separate database whose name ends in `_test`. It exercises migrations, boundary/accuracy semantics, and publication isolation. It never substitutes SQLite spatial approximations.

## Docker later

`docker compose up --build` is prepared for a development PostGIS database, a one-shot migration/seed job, API readiness, a media worker sharing a private evidence volume with the API, and the web application. The API image includes FFmpeg. Its database port is `55433` on the host to avoid the native databases. Stop native API/web processes before using their same ports. Docker execution was explicitly deferred by the user; this stack has not been run locally.

See [the implementation guide](docs/geospatial-foundation.md), [architecture](docs/architecture.md), [security](docs/security.md), and [contributing](CONTRIBUTING.md). Work remains on `feature/*`; do not merge directly to `main`.

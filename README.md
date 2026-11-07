# XERSXES Ghana

Map-first environmental intelligence for Ghana. The default workspace is unlabelled satellite imagery. Monitoring areas and reviewed observations are optional overlays; other analysis views remain future work.

## What works

- Detailed unlabelled satellite/aerial imagery, with a validated Sentinel-2 composite fallback.
- PostGIS monitoring polygons, versioned by Alembic and served through FastAPI.
- Browser geolocation with accuracy/time/source and authoritative spatial coverage checks.
- Persisted private observation metadata and capture locations.
- Public GeoJSON containing only coverage and independently sanitized, approved observations.

Monitoring boundaries are demonstration geometries, not authoritative or licensed boundaries. Media upload, authenticated moderator review, AI inference, raster processing, notifications, and production source protection are not implemented. The moderator screens are still disconnected demonstrations.

## Structure

- `apps/web`: Next.js App Router, React, Tailwind, Leaflet, typed API adapter, frontend tests.
- `apps/api`: FastAPI, SQLAlchemy, PostGIS models, Alembic migrations, spatial tests, explicit development publication helper.
- `services/geospatial`, `services/ai`: future processing boundaries; see [imagery and AI contracts](docs/imagery-and-ai-contracts.md).
- `research/xnp`: separate simulation-only node research.
- `infrastructure`: deployment notes. `docs`: architecture, security, scope, and local operation.

## Run locally without Docker

This workspace has an isolated PostgreSQL 18/PostGIS instance at `127.0.0.1:55432`, with `xerxes` and `xerxes_test` databases. Data is under `%LOCALAPPDATA%/Xersxes/postgresql18/data`. Local connection credentials are in ignored `.env`; they are not committed. The existing system PostgreSQL service is separate.

For a fresh machine, install PostgreSQL 16+ and PostGIS 3.4+, create application and `*_test` databases, and configure `DATABASE_URL` and `TEST_DATABASE_URL` using `.env.example`. Migrations require permission to install PostGIS (or an administrator can preinstall it). Use Python 3.12+ and Node 22.

Windows, from the repository root:

```powershell
python -m venv apps/api/.venv
apps/api/.venv/Scripts/python.exe -m pip install -e "./apps/api[dev]"
python scripts/start_database.py
apps/api/.venv/Scripts/python.exe scripts/run_api.py migrate
apps/api/.venv/Scripts/python.exe scripts/run_api.py seed
apps/api/.venv/Scripts/python.exe scripts/run_api.py serve
```

The database starter is specific to the isolated instance prepared for this workspace; use your PostgreSQL service manager on other machines. In another terminal:

```powershell
npm.cmd --prefix apps/web ci
npm.cmd --prefix apps/web run dev
```

Open [the satellite workspace](http://localhost:3000/map) or [contribute](http://localhost:3000/report). API liveness is [localhost:8000/health](http://localhost:8000/health); database readiness is [localhost:8000/ready](http://localhost:8000/ready). The web server proxies only supported `/api/v1` paths to `API_INTERNAL_URL`, defaulting to `http://127.0.0.1:8000`. No browser API key or cross-origin credential setup is needed.

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

`docker compose up --build` is prepared for a development PostGIS database, a one-shot migration/seed job, API readiness, and the web application. Its database port is `55433` on the host to avoid the native databases. Stop native API/web processes before using their same ports. Docker execution was explicitly deferred by the user; this stack has not been run locally.

See [the implementation guide](docs/geospatial-foundation.md), [architecture](docs/architecture.md), [security](docs/security.md), and [contributing](CONTRIBUTING.md). Work remains on `feature/*`; do not merge directly to `main`.

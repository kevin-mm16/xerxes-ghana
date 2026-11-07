# Geospatial foundation assessment

Baseline: `ec7a069`, `feature/map-first-foundation`, inspected 7 November 2026.

The repository already separates a Next.js interface, a modular FastAPI application, and future geospatial, AI, and XNP workstreams. App Router layouts and browser-only Leaflet boundaries work. The map is the central workspace and its feature model can accommodate new sources without a new renderer.

The backend has only liveness/discovery endpoints and two smoke tests. It has no database session, models, migrations, or coverage validation. All coverage geometry is currently canonical in frontend fixtures. The public map adapter includes pending/rejected mock reports and synthetic AI confidence values. The contribution form simulates storage and loses drafts despite claiming to save them. Browser GPS drops accuracy/timestamp and offers no authoritative eligibility check. Public/private location separation exists only as presentation. Map controls are hidden on mobile, and imagery has no failure recovery.

Baseline checks actually run: API editable install, Ruff (pass), pytest (2 pass), web `npm ci`, `npm run typecheck`, and `npm run build` (pass). Windows initially locked the preview's SWC binary; stopping that project compiler allowed the clean install. The API test dependency emits a Starlette/httpx deprecation warning.

Live Digital Earth Africa GetCapabilities verified `gm_s2_semiannual` with `simple_rgb` and `ndvi_anomaly` with `style_ndvi_mean`. Both GetMap requests for Ghana returned HTTP 200 PNG images. Available dates, styles, and failure handling must be explicit; the observation timeline must not imply that an unrelated WMS image matches it.

Implementation direction: PostGIS owns versioned demo coverage; SQLAlchemy/Alembic own persistence and migrations; FastAPI performs `ST_Covers` and accuracy-aware boundary checks; the frontend consumes public GeoJSON through a same-origin API proxy. Raw observations and capture points stay private, publication requires separate sanitized text and generalized geometry, and AI/satellite layers remain empty until real reviewed output exists.

Local execution is required for this task. Docker/WSL are absent, and the user has deferred Docker installation and stack validation. An isolated native PostGIS instance will be used for spatial integration tests without altering the existing PostgreSQL service.

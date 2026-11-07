# Map-first frontend

The central workspace remains a full-height Ghana satellite map. The default contains no town labels, administrative boundaries, coverage outlines, observation pins, or fabricated AI results. Monitoring polygons and approved observations can be enabled deliberately through compact layer controls; other analytical views are reserved for real reviewed output.

The user's satellite-only direction supersedes the earlier satellite/vegetation/streets switcher. Cached detailed World Imagery is the default; a Sentinel-2 fallback is validated against Digital Earth Africa GetCapabilities and actual Ghana image requests. Vegetation configuration is retained as future preparation, not an active view. The workspace opens over southern Ghana with country overview, zoom, scale, and coordinate navigation. Observation dates filter records only, not the photographic basemap.

Coverage and observations now come from PostGIS/FastAPI through the typed public GeoJSON adapter. No canonical monitoring polygon remains in frontend mock data. Existing moderator fixtures are isolated demonstrations, not public observations.

See [database/API and contribution design](geospatial-foundation.md) and [imagery/AI contracts](imagery-and-ai-contracts.md). The app retains the existing Next.js/Leaflet architecture and responsive map drawer, controls, and timeline.

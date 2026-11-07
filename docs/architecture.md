# Architecture v0.1

## System boundary

The initial product is a modular FastAPI application, a Next.js client, PostgreSQL/PostGIS, and independently executable analysis workers.

```text
Next.js web -> FastAPI core -> PostgreSQL/PostGIS
                         -> (future) background jobs -> geospatial / AI workers
                         -> (future) restricted object storage
```

## Domain modules (planned)

- Identity and access management
- Geospatial study areas and observations
- Satellite imagery catalog and processing jobs
- Incident intake and human moderation
- Evidence provenance and controlled publication
- Drone registry and simulation (not aircraft control)

Keep confidential report processing logically and operationally isolated from public traffic. There are no live sensitive-intake endpoints in the scaffold.

## Design decisions

- Modular monolith before introducing microservices.
- No blockchain.
- No invented encryption algorithms or radio protocols.
- Human validation is required for claims about alleged illegal mining.
- Field drone operations must not depend on cloud availability.
- Data protection, audit trails and recoverability are requirements, not implied by the current scaffold.

See `docs/adr/0001-modular-monolith.md`.

## Implemented web structure

Galamsey Watch is the initial interface within `apps/web`, using Next.js App Router. The public route group `app/(public)` owns the shared navigation, footer, and public report routes. `app/moderator` owns the login and dashboard routes; the dashboard has its own layout. These layouts organize the interface and do not enforce authentication.

Page content lives in `src/views`, reusable components in `src/components`, synthetic data in `src/data`, shared types in `src/types`, utilities in `src/utils`, and global styling in `src/styles`. Only interactive components are marked as client components. Leaflet imports are isolated behind `src/components/map/BrowserMaps.tsx` because the map library requires browser globals.

The interface currently reads sample data directly. It does not yet call FastAPI or persist to PostGIS. API implementation remains in `apps/api`; satellite processing, AI, infrastructure, and XNP research retain their existing top-level directories. See [the frontend guide](galamsey-watch.md) for routes and local commands.

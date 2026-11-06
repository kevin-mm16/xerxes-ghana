# xersxes

A modular environmental intelligence platform and R&D project within the wider XERSXES technology mission.

> **Status:** Early development. This repository is not ready to receive confidential whistleblower evidence or operate physical drones.

## MVP scope

- Interactive geospatial monitoring dashboard
- Human-reviewed environmental incident workflow
- Reproducible satellite change-analysis pipelines
- Initial research model evaluated on held-out geography

Drone integration and XNP peer networking are separate research workstreams. No blockchain is planned.

## Stack

- **Web:** Next.js, TypeScript, React
- **API:** FastAPI, Python 3.12
- **Spatial database:** PostgreSQL 16 + PostGIS
- **Processing:** Independent Python geospatial and AI workers (future)
- **Local environment:** Docker Compose

## Getting started

1. Install Docker Engine/Compose or Docker Desktop.
2. Copy `.env.example` to `.env` at the repository root.
3. Replace the development-only value of `POSTGRES_PASSWORD` with a unique local password.
4. Run `docker compose up --build`.
5. Visit [localhost:3000](http://localhost:3000) for the web shell and [localhost:8000/health](http://localhost:8000/health) for the API health endpoint.

The local stack is for **development only**. It does not implement production security, high availability, or anonymous source protection.

## Team workflow

- `main`: reviewed release-ready history
- `develop`: integration
- `feature/*`: one feature per branch, proposed into `develop` via pull request

Read [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), [security boundaries](docs/security.md), and [contributing](CONTRIBUTING.md) before adding features.

## Integrated Galamsey Watch interface

The Galamsey Watch interface lives in `apps/web/src`. Next.js App Router owns navigation; browser-only views isolate Leaflet from server rendering. The API, services, research, and infrastructure structure is preserved.

Routes: `/`, `/map`, `/report`, `/evidence`, `/about`, `/reports/rpt-002`, `/moderator/login`, `/moderator/dashboard`.

Reports, uploads, moderation, and satellite displays remain demonstrations with sample data. The UI is not connected to the API or database. Moderator routes have no authentication and must not contain real private data.

Run with `cd apps/web`, `npm ci`, and `npm run dev`. Validate with `npm run typecheck` and `npm run build`. The [original frontend scope](docs/galamsey-watch.md) is retained for reference; its Vite setup instructions are historical.

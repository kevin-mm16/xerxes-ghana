# xersxes

A modular environmental intelligence platform for Ghana. Galamsey Watch is its first interface for civic reporting previews, approximate public maps, evidence browsing, and moderator review demonstrations.

> Early development: the interface uses synthetic data. Reporting, uploads, moderation, authentication, and satellite processing are demonstrations; no confidential evidence should be submitted.

## Repository structure

```text
apps/
  web/               Next.js, React, TypeScript, Tailwind, Leaflet
    app/             Routes and shared layouts
      (public)/      Public pages and report details
      moderator/     Demo login and review dashboard
    src/
      views/         Page content
      components/    Reusable interface and browser-only map components
      data/          Synthetic report and dashboard fixtures
      types/         Shared frontend types
      utils/         Formatting and presentation helpers
      styles/        Global styling
  api/               FastAPI application and Python tests
services/
  geospatial/        Planned satellite processing workers
  ai/                Planned analysis and model evaluation
research/xnp/        Separate node protocol research
infrastructure/      Deployment planning
docs/               Architecture, roadmap, and security guidance
```

The web interface is not yet connected to the API or database. The API currently exposes `/health` and `/api/v1`. PostgreSQL 16 with PostGIS is configured for local development in `compose.yaml`.

## Run the web interface

Use Node.js 22, as in CI:

```bash
cd apps/web
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Build and typecheck from `apps/web`:

```bash
npm run typecheck
npm run build
```

The [Galamsey Watch guide](docs/galamsey-watch.md) describes routes and current behavior.

## Run the development stack

Install Docker Engine/Compose or Docker Desktop, copy `.env.example` to `.env`, and set a unique local `POSTGRES_PASSWORD`. From the repository root:

```bash
docker compose up --build
```

The web interface runs at [localhost:3000](http://localhost:3000) and the API liveness endpoint at [localhost:8000/health](http://localhost:8000/health). This stack is for development; it does not implement production security, anonymous source protection, or high availability.

## Scope and workflow

The MVP targets geospatial monitoring, a human-reviewed incident workflow, reproducible satellite change analysis, and research evaluated on held-out geography. Drone integration and XNP remain separate research workstreams. No blockchain is planned.

Use `feature/*` branches for implementation and propose changes into `develop`; releases move from `develop` to `main`. CI checks the API and web builds on feature pushes and pull requests.

Read [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), [security boundaries](docs/security.md), and [contributing](CONTRIBUTING.md) before adding features.

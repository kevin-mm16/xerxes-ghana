# Contributing

## Branches

Start from `develop`; create `feature/<brief-name>` or `fix/<brief-name>`. Open pull requests against `develop`. Releases are reviewed and merged from `develop` to `main`.

## Pull request checklist

- Explain the outcome and trust boundaries affected.
- Include tests and instructions to reproduce changes.
- Do not commit secrets, sensitive submissions, production credentials, or real source identities.
- Use synthetic data for local development.
- Require teammate review for authentication, evidence, drone, or security changes.
- Keep aviation safety, operational geofences and node revocation independent of flight-control safety functions.

## Initial commands

```bash
docker compose up --build
cd apps/api && python -m pip install -e ".[dev]" && pytest
cd apps/web && npm ci && npm run typecheck && npm run build
```

Keep frontend work in `apps/web`: route and layout files belong in `app`, page content in `src/views`, reusable interface code in `src/components`, and synthetic fixtures in `src/data`. Import Leaflet maps through `src/components/map/BrowserMaps.tsx` so the rest of each page can render on the server.

Commit the web lockfile alongside dependency changes. Python dependency locking and automated dependency updates remain planned.

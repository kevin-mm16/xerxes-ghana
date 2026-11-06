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
cd apps/web && npm install && npm run typecheck && npm run build
```

Dependency lockfiles and automated dependency updates should be introduced before production deployment.

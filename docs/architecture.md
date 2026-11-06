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

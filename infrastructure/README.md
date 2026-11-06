# Infrastructure

The root `compose.yaml` is a **development-only** convenience.

Production architecture, privacy guarantees, backup retention, geographic failover and incident recovery are not yet implemented. All deployment changes require threat modeling and review.

Do not expose the local PostGIS port or copy development credentials to production.

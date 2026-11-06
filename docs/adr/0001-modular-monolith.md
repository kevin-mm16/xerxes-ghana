# ADR 0001: Modular monolith for the initial platform

**Status:** Accepted for the initial scaffold

## Context

Two developers need to deliver a measurable environmental-monitoring MVP while leaving room for independent AI and drone research.

## Decision

Build one Python/FastAPI API with clearly separated domain modules, a Next.js web application, a PostgreSQL/PostGIS database, and future asynchronous worker processes. Keep confidential reporting and experimental drone communications separately bounded.

## Consequences

Lower operational overhead and faster iteration, at the cost of needing disciplined module boundaries. Extraction into separate deployable services is deferred until measurable scaling or security requirements justify it.

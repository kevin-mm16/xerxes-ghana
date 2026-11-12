# Architecture v0.1

## System boundary

The product is a modular FastAPI application, a Next.js client, PostgreSQL/PostGIS, and independently executable workers. Private media processing is implemented; satellite and AI processing remain planned.

```text
Next.js web -> FastAPI core -> PostgreSQL/PostGIS
                    |           -> durable private-media jobs -> media worker
                    +-> private EvidenceStorage <--------------------+

(future) scene catalog/jobs -> geospatial / AI workers
```

## Domain modules (planned)

- Identity and access management
- Geospatial study areas and observations
- Satellite imagery catalog and processing jobs
- Incident intake and human moderation
- Evidence provenance and controlled publication
- Drone registry and simulation (not aircraft control)

Keep confidential report processing logically and operationally isolated from public traffic. Private observation and media intake now exist for local development. The storage protocol currently has a filesystem implementation only; production selection fails closed. These components must not be exposed as a high-assurance source-protection service.

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

The map reads public GeoJSON from FastAPI/PostGIS through a typed adapter and same-origin Next.js proxy, using debounced viewport requests and a zoom threshold for district geometry. Only published, independently sanitized observations are public; capture and reviewed activity locations have separate private tables. Contribution sends GPS accuracy/timestamp/source and repeats authoritative coverage validation on intake. The moderator interface uses server-verified sessions, explicit review/approval/publication states and private media access. Public media uses a separate derivative and storage namespace with a publication gate on every delivery. See [moderation/publication](moderation-publication.md), [the foundation](geospatial-foundation.md) and [future imagery/AI contracts](imagery-and-ai-contracts.md).

## Private media intake

The contribution form permits one optional image or video after consent. Small upload declarations and observation metadata use JSON. A separate Next.js uploads proxy streams binary bytes to capability-scoped FastAPI routes; ordinary JSON endpoints retain their smaller body limit. Only upload capabilities are forwarded by this route, with no browser cookies or general moderator authentication.

`EvidenceMedia` records private filenames, object keys, hashes, expiry, processing status, and the observation attachment. A random upload capability is returned once and retained in browser memory; only its SHA-256 hash is persisted. A completed upload is immutable. Observation submission verifies ownership, derives the media kind server-side, and uses a stable submission ID to make unchanged retries idempotent.

`MediaProcessingJob` is a durable PostgreSQL queue. The separate worker claims work with `FOR UPDATE SKIP LOCKED`, uses expiring leases and bounded retries, verifies original hashes, and writes private review assets and thumbnails. A lease check gates recording successful outputs. File-storage writes and database commits are separate operations; maintenance reconciles abandoned uploads and unreferenced attempt objects.

Storage is accessed through `EvidenceStorage`. The native provider stores quarantine originals, review assets, and staging work under ignored `.local/evidence`, outside the web application. It creates server-controlled names and refuses overwrites. No media HTTP-read endpoint or public object URL exists in this phase. Metadata removal prepares content for private review; it does not redact visual or audio identifiers or approve publication. The development publication helper rejects media-backed observations. See [the intake contract and local operation](media-intake.md).

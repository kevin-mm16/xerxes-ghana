# Database-backed geospatial foundation

## Database

An immutable initial Alembic revision, `0001_geospatial`, creates:

| Table | Purpose | Geometry |
| --- | --- | --- |
| `coverage_regions` | Code/name, version, validity, status, demo attribution | MultiPolygon, EPSG:4326 |
| `observations` | Original private intake metadata and server coverage decision | None |
| `capture_locations` | Device position, accuracy, timestamp, source | Point, EPSG:4326 |
| `observation_locations` | Optional independently reviewed activity location | Geometry, EPSG:4326 |
| `public_locations` | Sanitized title/description and generalized public area | Geometry, EPSG:4326 |

UUID keys, foreign keys, status/range checks, valid/nonempty geometry checks, GiST indexes on monitoring/public geometry, observation status/time indexes, and automatic `updated_at` triggers are included. Capture points are indexed by observation primary key rather than being exposed as a searchable public layer.

Revision `0002_administrative_boundaries` adds source/version/checksum records and independently stored GSS census district MultiPolygons. These reference districts do not expand monitoring eligibility; see [map sources](map-sources.md) for vintage, provenance, and reuse limitations.

Revision `0003_private_media` adds private `evidence_media`, durable `media_processing_jobs`, and nullable observation submission IDs/hashes for unchanged retry idempotency. Media records have private object references, upload capability hashes, original/derivative hashes, processing constraints, and a unique optional observation association. See [private media intake](media-intake.md) for the schema and state contract.

The demo seed is canonical in `apps/api/src/xerxes_api/data/coverage.demo.geojson`. It creates Ankobra (`GHA-XER-W001`), Offin (`GHA-XER-C001`), and Atewa (`GHA-XER-E001`) polygons. It requires `APP_ENV=development` and an explicit command, is idempotent, and never overwrites existing coverage codes. These geometries are illustrative, not legal boundaries. Changing operational geometry requires a deliberate reviewed version/validity change rather than changing frontend fixtures.

## API

All public responses are `no-store`. Database errors are sanitized, and SQL parameter logging is disabled. Application configuration accepts a connection URL or separately encoded PostgreSQL fields so special characters in passwords are not corrupted.

| Method | Endpoint | Contract |
| --- | --- | --- |
| GET | `/health` | Process liveness, independent of database readiness |
| GET | `/ready` | Confirms schema and PostGIS are reachable |
| GET | `/api/v1/coverage` | Active, currently valid regions as GeoJSON |
| GET | `/api/v1/coverage/{uuid}` | One active region, or 404 |
| POST | `/api/v1/coverage/check` | GPS latitude/longitude, accuracyMeters, capturedAt, source -> insideCoverage, state, boundaryAmbiguous, matchedRegions, nearbyRegions |
| POST | `/api/v1/observations` | Validated metadata, captureLocation or manualLocation, observedAt, consent, optional submissionId/media attachment -> pending receipt |
| GET | `/api/v1/observations/{uuid}` | Separately sanitized approved public record; pending/rejected/missing records return 404 |
| GET | `/api/v1/map/features` | Public GeoJSON for reference districts, coverage, and published observations |
| POST | `/api/v1/uploads/intents` | Consent and bounded filename/type/size declaration -> short-lived private upload capability |
| PUT | `/api/v1/uploads/{uuid}/content` | Scoped bearer capability plus bounded raw bytes -> private quarantine/processing status |
| GET | `/api/v1/uploads/{uuid}` | Scoped bearer capability -> minimal processing status, with no media bytes or object paths |

Map queries support `bbox=west,south,east,north`, comma-separated `layers`, ISO-aware `from`/`to` times, `status=approved`, `confidence_min`, and a bounded `limit`. Antimeridian-crossing boxes are rejected. Coverage is independent of observation date filters. Unscored observations do not satisfy a positive confidence threshold. AI/satellite layers are reserved and currently empty. A `truncated` flag identifies bounded responses; pagination/viewport queries need expansion before national-scale records are loaded.

## Accuracy semantics

`ST_Covers` includes a point on a polygon boundary. Separately, geography-based `ST_DWithin` measures whether the reported accuracy radius reaches a boundary, including hole boundaries. That condition produces `state=uncertain`, even when the measured centre is inside. An outside centre can also be uncertain with nearby region references. Multiple matches are returned, not silently collapsed.

Coordinates must be finite and in geographic ranges. Accuracy is bounded to 0-10,000 m; wider readings require retry or manual context. Timestamps require time zones and cannot be more than five minutes in the future. Current coverage validity is evaluated on the server, not selected by the browser timestamp. GPS remains an untrusted device measurement, not proof of presence or observation location.

Submission repeats the authoritative check in the same database transaction. Only one unambiguous inside match receives an automatic coverage association. Uncertain/outside/manual submissions remain pending for human assignment. No caller-supplied status, coverage assignment, or public geometry is accepted.

## Private review and publication

Intake stores the original description and capture point. The receipt returns its identifier, pending state, submission time, coverage classification, and optional minimal media-processing status. Neither the public observation read nor the map query joins the capture table or serializes private media records.

The authenticated moderator application is future work. Existing moderator screens remain clearly labelled demonstrations and cannot read actual pending intake. A development-only local helper allows an authorized database operator to test explicit publication of metadata-only observations with a separately supplied sanitized title/description. It publishes the whole assigned monitoring polygon, not the exact or rounded capture point. Manual or uncertain records need a reviewer-assigned region first. It rejects every media-backed observation; completing private processing does not authorize publication. Monitoring-area generalization is not a production privacy guarantee.

Example from `apps/api`, with environment configured:

```text
python -m xerxes_api.publication OBSERVATION_UUID --title "Sanitized title" --description "Sanitized summary" --acknowledge-sanitized
```

Do not put raw sensitive text in shell history. The helper is restricted to development. No unauthenticated HTTP publication endpoint exists.

## Frontend

Next.js keeps its existing routes/layouts and proxies allowlisted API paths using a server-only URL. The ordinary public proxy caps JSON request bodies and upstream timeouts and does not relay browser cookies or authorization headers. A separate uploads proxy streams bounded file bytes and forwards only the upload-scoped bearer capability. It rejects capability query strings and does not forward browser cookies. `services/map-data.ts` converts public GeoJSON into the generic renderer contract. There is no silent mock fallback when the database/API fails.

The map starts with satellite imagery, town/road labels, and optional GSS district outlines enabled. The gold-line legend identifies the census district source; users can disable labels and outlines independently. Database-backed monitoring polygons and approved observations remain opt-in layers. Empty inference layers are disabled. The renderer handles Polygon/MultiPolygon rings and holes. Mobile has the same layer access, a bounded panel, a bottom details sheet, and a scrollable observation timeline when dated records are enabled. Satellite scene analysis and geographic boundary-quality work remain separate from media intake.

Contribution proceeds through location, optional evidence selection, context, and storage consent. Browser GPS is requested only on click and retains accuracy/time/source. No precise capture point is sent to an external tile map in this flow. Administrative region/district entry is not required. Manual descriptions and metadata-only submissions remain available. Selecting a file does not upload it. After consent and submission, the form obtains a scoped capability, streams one private attachment, then associates it with the observation. A stable submission ID and in-memory upload receipt support unchanged retries. Processing progress is polled for a bounded period and can be checked again; neither success nor failure implies public approval.

## Local state and validation

The prepared native cluster is in `%LOCALAPPDATA%/Xersxes/postgresql18`, bound to loopback port 55432. Credentials remain in ignored root `.env`. API and web run on loopback ports 8000 and 3000. The separate test database is guarded by its `_test` suffix and migration rollback tests operate only there.

See [the recorded baseline](geospatial-foundation-assessment.md). Real spatial tests and browser checks are required; a passing liveness endpoint alone is insufficient. Docker execution is deferred at the user's request. CI provisions a real PostGIS 16/3.4 service for spatial tests; native checks currently use PostgreSQL 18/PostGIS 3.6.

## Limitations

Production role separation, authentication/MFA, moderator authorization, reviewer audit records, external-beta abuse controls, content redaction, production storage/encryption, operational geofences, backup/restore drills, and incident handling remain unimplemented. The application database identity is privileged for local migrations and must be split before deployment. Upload declaration, signature/size checks, full private media decoding/transcoding, metadata removal, and durable processing retries now exist; they are not a complete hostile-media sandbox or publication workflow. Observation retries with the same submission ID and unchanged payload are idempotent. Public text is only as safe as explicit review, and monitoring-area generalization is not a disclosure-risk assessment. No public inference or video evidence is manufactured.

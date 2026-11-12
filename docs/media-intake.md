# Private media intake

The intake pipeline accepts one optional image or video per observation, stores its original privately, and prepares a private review copy through a durable worker. The [moderation/publication workflow](moderation-publication.md) now adds authenticated review, independently reviewed activity locations and distinct public derivatives. Automatic visual/audio redaction remains unimplemented; development should use controlled non-sensitive files.

The metadata-only contribution flow remains available. No media becomes public through intake or review processing alone. The old publication CLI is retired; its internal metadata-only compatibility helper still refuses attached media. New publication goes through authenticated review, explicit certification and the separately gated public derivative.

## Formats and limits

| Input           | Maximum size | Additional validation                                                                                                                           | Private review output                               |
| --------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| JPEG, PNG, WebP | 10 MiB       | Matching extension, MIME declaration, signature, bounded full decoding; animated images are excluded                                            | Fresh JPEG plus JPEG thumbnail                      |
| MP4, MOV        | 50 MiB       | Recognized modern ISO-BMFF container, signature/probe checks, permitted streams/codecs, bounded dimensions, positive duration up to 120 seconds | H.264/AAC MP4 up to 720p/30 fps plus JPEG thumbnail |

MOV support is intentionally conservative: legacy MOV files without a recognized container signature are rejected. Browser limits provide early feedback; FastAPI and the worker enforce their own checks. A supported filename or declared MIME type does not establish valid content.

Original bytes are retained with SHA-256. Review copies and thumbnails receive independent hashes and a processing-version record. The worker removes source metadata while decoding/transcoding fresh outputs. This is preparation for private review, not visual or audio redaction: faces, voices, number plates, landmarks, and identifying scene content may remain. Hashes support integrity comparison, not factual authenticity, capture-time verification, or anonymity.

## Request flow

```text
Select a local file + enter observation context
                    |
Consent and Submit  v
POST /uploads/intents -- filename, contentType, fileSize, consent
                    |
                    v
PUT /uploads/{id}/content -- scoped bearer + raw binary stream
                    |
                    v
Private quarantine original + hash + durable processing job
                    |
                    +--> POST /observations -- submissionId + owned media reference
                    |
Worker verifies/decode/transcodes
                    v
Private review copy + thumbnail; processingStatus = review_ready
```

The form does not upload on file selection. It validates location/context and obtains consent first. The file uses raw binary streaming through a dedicated Next.js uploads proxy; videos are never placed in JSON or encoded as base64. The ordinary public JSON proxy retains its 16 KiB request limit. The uploads proxy caps intent JSON separately and caps raw content at 50 MiB, including streams without a declared content length. FastAPI additionally checks the upload's expected size and type.

All routes below use the `/api/v1` prefix and `Cache-Control: no-store`.

| Route                       | Scope                                                                                      | Result                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `POST /uploads/intents`     | Anonymous intake with consent, validation, and global capacity budgets                     | One upload ID, a short-lived upload token, canonical same-origin upload URL, expiry, and byte limit |
| `PUT /uploads/{id}/content` | That upload's unexpired bearer capability                                                  | Minimal status after bounded private ingest; accepted uploads cannot be overwritten                 |
| `GET /uploads/{id}`         | That upload's unexpired bearer capability                                                  | Upload ID, processing status, media kind, and an optional safe error code                           |
| `POST /observations`        | Existing intake contract plus optional `submissionId` and `media: {uploadId, uploadToken}` | Pending observation receipt and optional minimal media status                                       |

The 43-character random upload capability expires after 30 minutes. Only its SHA-256 hash is stored in PostgreSQL. The browser keeps the token in memory; it is not put in URLs, local storage, or the rendered receipt. The uploads proxy forwards the capability header only, without browser cookies or general moderator credentials. The token has no media-read or moderator authority. Do not log bearer headers or private request bodies.

The observation transaction verifies attachment ownership, prevents attachment to a different observation, and derives media kind server-side. It does not trust a caller's media classification. A stable submission UUID and payload hash make unchanged submission retries idempotent, while a completed in-memory upload receipt prevents retransmitting the same attachment when only metadata submission needs retrying. These in-memory references are lost on navigation/reload; the public observation ID is not a private media-access credential.

No HTTP route in this milestone returns original files, review copies, thumbnails, private object keys, raw filenames, capture accuracy, or capture geometry. Pending observations remain unavailable through public observation/map reads. There is no authenticated moderator media read yet.

## Storage and database

Migration `0003_private_media` follows the existing geospatial and reference-boundary migrations. It adds:

- `evidence_media`: capability hash, private original filename and object references, declared/detected MIME, expected/actual size, hashes, processing state, dimensions/duration, processing version, expiry, and a unique optional observation association.
- `media_processing_jobs`: one durable job per media record, available time, state, attempts, expiring lease/token, and safe last-error code.
- Nullable observation submission ID/hash columns for unchanged retry idempotency.

`EvidenceStorage` provides the storage boundary. The implemented `filesystem` provider is enabled only for `APP_ENV=development` or `test`. Its default root is ignored `.local/evidence`, with these private namespaces:

```text
.local/evidence/
  quarantine/{server-generated-id}/original
  review/{server-generated-id}/{processing-attempt}/asset.jpg-or-mp4
  review/{server-generated-id}/{processing-attempt}/thumbnail.jpg
  .staging/  -- controlled temporary upload and processing work
```

Object keys are generated by the server and checked for traversal and symlink/junction escapes. Committing an object creates independent bytes and refuses overwrite, including concurrent writes. The root cannot be the filesystem root or a directory inside `apps/web`. Nothing mounts these files into Next.js static assets.

The filesystem provider is development storage under the local operating-system account. It does not implement production encryption/key management or establish hardened Windows ACLs. A production S3-compatible adapter is not implemented; production or unsupported provider configuration fails closed. The abstraction prevents business logic from depending on a future provider's public URLs or bucket layout.

## Durable processing and cleanup

Media processing states are `awaiting_upload`, `uploading`, `quarantined`, `processing`, `review_ready`, `failed`, and `expired`. These technical states are independent of observation approval. Job states are `queued`, `running`, `succeeded`, and `failed`.

The worker claims jobs using PostgreSQL `FOR UPDATE SKIP LOCKED`, with five-minute leases and a maximum of three attempts. Transient operational failures use bounded backoff; malformed or unsupported media fails validation. Lease tokens gate recording completed outputs, preventing an outdated processing attempt from replacing a newer result. Originals are hash-checked before processing. Pillow handles images; FFmpeg/ffprobe handle video with psutil-supported resource monitoring. Tools run outside FastAPI requests, with bounded runtime, memory, input/output limits, and conservative input handling. These controls do not replace a hardened production decoder sandbox.

PostgreSQL transactions and storage writes are separate operations. Attempt-specific immutable keys, lease checks, and maintenance handle interrupted writes and unreferenced derivatives. The continuous worker performs periodic maintenance. Operators can also invoke cleanup explicitly.

Development admission budgets are persistent and global: at most 100 new intents per hour, 32 pending uploads, and 2 GiB of reserved capacity. Reservations include the declared original plus worst-case derivatives for up to three attempts. They release only after confirmed cleanup, rather than merely when permission expires. These controls avoid collecting IP addresses and protect this development instance's capacity; they are not a complete public-beta abuse policy.

Maintenance rules:

- Unused upload intents expire with their 30-minute permission.
- Interrupted `uploading` records are failed after the expired permission plus a ten-minute recovery allowance.
- Abandoned, unattached media becomes eligible for file cleanup 24 hours after its permission expires.
- Unreferenced review-attempt objects and stale controlled staging work become eligible after one hour; live leases and referenced files remain protected.
- Attached evidence remains retained. Its deletion/retention policy and operator workflow must be defined before real sensitive evidence is collected.

Cleanup uses the private storage interface and known ownership records; it does not scan or delete arbitrary system temporary directories. Failures leave capacity reserved or files retained for later recovery instead of assuming deletion succeeded.

## Run locally without Docker

Use the existing Python 3.12+ virtual environment, Node 22, PostgreSQL/PostGIS, and ignored root `.env`. Install FFmpeg and ffprobe on `PATH`; if required, configure `FFMPEG_PATH` and `FFPROBE_PATH` as absolute executable paths. The media Python dependencies are part of the API package.

From the repository root:

```powershell
apps/api/.venv/Scripts/python.exe -m pip install -e "./apps/api[dev]"
python scripts/start_database.py
apps/api/.venv/Scripts/python.exe scripts/run_api.py migrate
apps/api/.venv/Scripts/python.exe scripts/run_api.py serve
```

The starter targets the isolated database prepared for this workspace. On another machine, start your own PostgreSQL service and configure application/test connection URLs from `.env.example`. Native filesystem storage requires `APP_ENV=development`; optional overrides are:

```dotenv
EVIDENCE_STORAGE_PROVIDER=filesystem
EVIDENCE_STORAGE_PATH=.local/evidence
# FFMPEG_PATH=C:/path/to/ffmpeg.exe
# FFPROBE_PATH=C:/path/to/ffprobe.exe
```

Start a continuous worker in a second terminal:

```powershell
apps/api/.venv/Scripts/python.exe scripts/run_api.py worker
```

To process at most one available job, use `worker --once`. To run maintenance explicitly and print its counts, use:

```powershell
apps/api/.venv/Scripts/python.exe scripts/run_api.py media-cleanup
```

Start the web app in another terminal:

```powershell
npm.cmd --prefix apps/web ci
npm.cmd --prefix apps/web run dev
```

Open [the contribution form](http://127.0.0.1:3000/report), select one controlled test file, complete the location/context and consent, and submit. The receipt reports private processing and can reach `review_ready`; that state is not approval or publication. If the worker is stopped, the durable job remains queued subject to capacity limits. Start the worker to resume eligible work.

Docker remains optional and deferred locally. Compose is prepared with FFmpeg in the API image, a separate worker, and a shared private evidence volume. Its execution has not been validated on this workstation.

## Validation and next boundary

The API suite uses an isolated real PostGIS test database and covers upload ownership, limits/type failures, immutable storage, idempotent observation association, durable job/lease behavior, processing outputs, cleanup, private-field isolation, and rejection by the development publication helper. Frontend tests cover consent before transmission, early file rejection, upload failure, attachment/status handling, unchanged retries, scoped headers, and streaming proxy limits. Run the repository's documented API tests, frontend tests/typecheck, and production build; report actual results for the current commit rather than assuming this document's presence proves success.

The next product milestone is authenticated moderation with private review access, reviewed activity geometry, explicit visual/audio disclosure review and redaction, reviewer audit history, and a separate deliberate publication operation. Public derivatives, withdrawal/correction, production storage, retention, tested restore, operational isolation, and external-beta abuse policy remain required before real-world sensitive intake.

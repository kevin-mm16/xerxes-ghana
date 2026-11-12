# Security boundaries (initial)

## Current security posture

This repository is an early scaffold, **not** a secure investigative production environment. Do not use it to collect or store confidential sources or sensitive evidence.

## Non-negotiable principles

- Keep all secrets out of Git and CI logs.
- Development databases bind to loopback; do not expose data services publicly.
- Use separate administrative identities and least privilege in deployed environments.
- Treat all drone telemetry and uploaded media as untrusted.
- Do not place source identities in public logs, tracing, or analytics.
- Plan signed, tamper-evident evidence records, independent backups and tested restores.
- Require threat modeling, independent security review, and proper legal/aviation compliance before real-world high-risk operation.
- Node revocation suspends XERSXES participation; it must not disable in-flight safety mechanisms.

## Production prerequisites (not implemented)

- Identity, MFA and hardware-backed privileged access
- Independent confidential evidence handling, encryption and key separation
- Threat monitoring, audit retention and incident-response runbooks
- Disaster recovery with tested RTO/RPO
- Security assessment, privacy review and operating procedures

## Implemented local boundaries

Capture points and original intake descriptions are stored separately from sanitized public publication records. Public API queries never join capture locations, pending records return 404, and intake cannot set review/publication fields. The contribution UI does not plot exact capture positions through a third-party tile provider. GPS input is untrusted and coverage is validated server-side with accuracy-aware boundary semantics.

Native services bind to loopback. Root `.env` and `.local` artifacts are ignored. SQL parameters are hidden and API access logging is disabled by the local runner. No application identity data is requested; this does not guarantee anonymity. Moderation authentication, reviewer audit trails, external-beta abuse controls, least-privilege database roles, attached-evidence retention/deletion policy, and production infrastructure remain prerequisites. The current local publication helper is development-only and is not an authorization system.

## Private media boundary

- File selection stays local until explicit consent and submission. The initial allowlist is JPEG, PNG, WebP, MP4, and conservatively recognized MOV containers, with separate image/video size limits and a two-minute video limit.
- Upload declarations receive a random, 30-minute capability. The token stays in browser memory and the `Authorization` header; the database stores its hash. It is never placed in a URL. Possession grants only that upload's write/status scope, not moderator access or access to media bytes.
- FastAPI verifies declaration, ownership, bounded streamed size, and file signature independently of the browser and Next.js proxy. The worker performs full decoding/probing before producing review assets. The upload capability cannot select an object key or overwrite a committed original.
- Originals and derivatives have SHA-256 integrity records. A hash establishes byte equality, not authenticity, capture time, or truth of a report. Device location and contributor-supplied context remain untrusted.
- The worker bounds supported input dimensions, video duration, process runtime, memory, and output size. Transient failures have bounded retries; permanent validation failures do not publish originals. These native-process controls are not a complete hostile-code isolation sandbox.
- The private filesystem provider is restricted to development/tests and refuses roots inside the web application. No S3 adapter, public bucket, public media URL, or moderator media HTTP-read endpoint is implemented. Files remain subject to the local account's operating-system permissions; storage encryption/key separation and production permission hardening remain future work.
- Global database-backed intent, queue, and storage reservations limit development intake without retaining contributor IP addresses. These are conservative capacity controls, not a complete public abuse policy.
- Maintenance handles expired unused capabilities, interrupted uploads, abandoned unattached files, and unreferenced processing outputs. Attached evidence is retained pending an explicit retention policy. Cleanup protects live leases and database-referenced review files.
- Review copies retain potentially identifying visual and audio content. Removing metadata, transcoding, and generalizing coordinates do not establish safe publication. The existing development publication helper rejects every media-backed observation until authenticated review, content redaction, disclosure review, and public derivative delivery are implemented.

Use only controlled synthetic or otherwise non-sensitive files during development. Before external intake, define authenticated moderation, deployment isolation, storage access/encryption, retention and deletion, tested backups/restoration, operational monitoring, and proportionate abuse controls. [Private media intake](media-intake.md) documents the implemented API and maintenance limits.

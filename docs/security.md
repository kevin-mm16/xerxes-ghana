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

Native services bind to loopback. Root `.env` and `.local` artifacts are ignored. SQL parameters are hidden and API access logging is disabled by the local runner. No application identity data is requested; this does not guarantee anonymity. Moderation authentication, audit trails, anti-abuse controls, least-privilege database roles, retention/deletion procedures, evidence handling, and production infrastructure remain prerequisites. The current local publication helper is development-only and is not an authorization system.

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

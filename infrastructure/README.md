# Local infrastructure

Native execution is the current validated path. The prepared isolated PostgreSQL/PostGIS runtime lives under `%LOCALAPPDATA%/Xersxes/postgresql18` on loopback port 55432. It does not alter the system PostgreSQL service. Run `python scripts/start_database.py` to restart it after a reboot. Root `.env` holds local connection URLs; never commit it. Configure backups and retention before collecting consequential reports.

The development-only Compose file is prepared to initialize migrations/demo coverage before API readiness and start the web proxy afterward. Host database port 55433 avoids the native instances; application ports remain 8000/3000. Docker execution was explicitly deferred and is not claimed as tested.

Production hosting, independent confidential evidence handling, secret management, least-privilege roles, backup retention, tested restores, and incident recovery are not implemented. Do not expose development services publicly.

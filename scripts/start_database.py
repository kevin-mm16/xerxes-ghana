"""Start the isolated native PostgreSQL instance prepared for this Windows workspace."""

import os
import subprocess
from pathlib import Path

runtime = Path(os.environ["LOCALAPPDATA"]) / "Xersxes/postgresql18"
control = runtime / "bin/pg_ctl.exe"
if not control.exists() or not (runtime / "data/PG_VERSION").exists():
    raise SystemExit(
        "Configure a local PostGIS installation and .env; no isolated runtime was found."
    )
status = subprocess.run(
    [str(control), "-D", str(runtime / "data"), "status"],
    check=False,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
if status.returncode:
    subprocess.run(
        [
            str(control),
            "-D",
            str(runtime / "data"),
            "-l",
            str(runtime / "server.log"),
            "-o",
            "-h 127.0.0.1 -p 55432",
            "-w",
            "start",
        ],
        check=True,
    )
print("Local PostgreSQL: 127.0.0.1:55432; databases xerxes and xerxes_test")

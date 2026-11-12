"""Local API tasks. Run with apps/api/.venv/Scripts/python.exe on Windows."""

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "task",
        choices=[
            "serve",
            "migrate",
            "seed",
            "test",
            "import-boundaries",
            "worker",
            "media-cleanup",
        ],
    )
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--archive", type=Path)
    args = parser.parse_args()
    if args.task == "serve":
        import uvicorn

        uvicorn.run(
            "xerxes_api.main:app", host="127.0.0.1", port=8000, access_log=False
        )
    elif args.task == "media-cleanup":
        from sqlalchemy.orm import Session
        from xerxes_api.db import get_engine
        from xerxes_api.media_maintenance import maintain_uploads

        with Session(get_engine()) as session:
            print(maintain_uploads(session))
    elif args.task == "worker":
        from xerxes_api.media_worker import run_once, run_worker

        if args.once:
            print("Processed one job." if run_once() else "No media jobs available.")
        else:
            run_worker()
    elif args.task == "migrate":
        from alembic import command
        from alembic.config import Config

        command.upgrade(Config(str(ROOT / "apps/api/alembic.ini")), "head")
    elif args.task == "seed":
        from xerxes_api.seed import seed_demo

        seed_demo()
        print("Development coverage seed complete.")
    elif args.task == "import-boundaries":
        from xerxes_api.import_boundaries import import_gss_archive

        if not args.archive:
            parser.error(
                "import-boundaries requires --archive PATH to the GSS geofiles.zip"
            )
        print(import_gss_archive(args.archive))
    else:
        import pytest

        if not os.environ.get("TEST_DATABASE_URL"):
            raise SystemExit(
                "TEST_DATABASE_URL is required for the local integration suite"
            )
        raise SystemExit(pytest.main([str(ROOT / "apps/api/tests"), "-q"]))

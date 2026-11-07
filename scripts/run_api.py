"""Local API tasks. Run with apps/api/.venv/Scripts/python.exe on Windows."""

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("task", choices=["serve", "migrate", "seed", "test"])
    args = parser.parse_args()
    if args.task == "serve":
        import uvicorn

        uvicorn.run(
            "xerxes_api.main:app", host="127.0.0.1", port=8000, access_log=False
        )
    elif args.task == "migrate":
        from alembic import command
        from alembic.config import Config

        command.upgrade(Config(str(ROOT / "apps/api/alembic.ini")), "head")
    elif args.task == "seed":
        from xerxes_api.seed import seed_demo

        seed_demo()
        print("Development coverage seed complete.")
    else:
        import pytest

        if not os.environ.get("TEST_DATABASE_URL"):
            raise SystemExit(
                "TEST_DATABASE_URL is required for the local integration suite"
            )
        raise SystemExit(pytest.main([str(ROOT / "apps/api/tests"), "-q"]))

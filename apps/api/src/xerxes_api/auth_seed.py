"""Explicit development reviewer setup; passwords are prompted, never CLI arguments.

Run from the repository root after migrations:
apps/api/.venv/Scripts/python.exe -m xerxes_api.auth_seed --username local-reviewer
"""

import argparse
import getpass
import os
from datetime import UTC, datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from xerxes_api.auth_models import Reviewer, ReviewerSession
from xerxes_api.auth_schemas import normalize_username
from xerxes_api.db import get_engine


def seed_reviewer(session: Session, username: str, password: str, role: str = "moderator"):
    if os.environ.get("APP_ENV") != "development":
        raise RuntimeError("Reviewer seeding is restricted to development")
    username = normalize_username(username)
    if role not in {"moderator", "admin"}:
        raise ValueError("Use moderator or admin role")
    if not 12 <= len(password) <= 1024:
        raise ValueError("Use a password of 12–1024 characters")
    from xerxes_api.auth import PASSWORD_HASH

    reviewer = session.scalar(select(Reviewer).where(Reviewer.username == username))
    if reviewer is None:
        reviewer = Reviewer(
            username=username, password_hash=PASSWORD_HASH.hash(password), role=role
        )
        session.add(reviewer)
    else:
        reviewer.password_hash = PASSWORD_HASH.hash(password)
        reviewer.role, reviewer.active = role, True
        session.execute(
            update(ReviewerSession)
            .where(ReviewerSession.reviewer_id == reviewer.id)
            .values(revoked_at=datetime.now(UTC))
        )
    session.flush()
    return reviewer


def main():
    load_dotenv(Path(__file__).resolve().parents[4] / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--username", required=True)
    parser.add_argument("--role", choices=("moderator", "admin"), default="moderator")
    args = parser.parse_args()
    password = getpass.getpass("New local reviewer password (at least 12 characters): ")
    if password != getpass.getpass("Confirm password: "):
        raise SystemExit("Passwords do not match")
    try:
        with Session(get_engine()) as session, session.begin():
            seed_reviewer(session, args.username, password, args.role)
    except (ValueError, RuntimeError) as error:
        raise SystemExit(str(error)) from None
    print("Development reviewer saved. Existing sessions for this account were revoked.")


if __name__ == "__main__":
    main()

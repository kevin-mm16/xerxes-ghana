"""Explicit local publication helper; there is no unauthenticated moderation API."""

import argparse
import os
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from xerxes_api.db import get_engine


def publish_sanitized(session: Session, observation_id: UUID, title: str, description: str):
    if not title.strip() or len(title) > 160 or not description.strip() or len(description) > 5000:
        raise ValueError("Provide bounded sanitized title and description")
    row = session.execute(
        text("""
        SELECT o.id, c.name FROM observations o
        JOIN coverage_regions c ON c.id=o.coverage_region_id
        WHERE o.id=:id FOR UPDATE OF o
    """),
        {"id": observation_id},
    ).first()
    if row is None:
        raise ValueError("A reviewer must assign an unambiguous coverage region before publication")
    # Publish the whole monitoring polygon, never a copied or rounded capture point.
    session.execute(
        text("""
        INSERT INTO public_locations
            (observation_id,geometry,label,precision_level,title,description)
        SELECT o.id,c.geometry,c.name,'coverage-region',:title,:description
        FROM observations o JOIN coverage_regions c ON c.id=o.coverage_region_id WHERE o.id=:id
        ON CONFLICT (observation_id) DO UPDATE SET geometry=EXCLUDED.geometry,
            label=EXCLUDED.label, title=EXCLUDED.title, description=EXCLUDED.description,
            generated_at=now()
    """),
        {"id": observation_id, "title": title.strip(), "description": description.strip()},
    )
    session.execute(
        text("UPDATE observations SET status='approved' WHERE id=:id"), {"id": observation_id}
    )
    session.flush()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("observation_id", type=UUID)
    parser.add_argument("--title", required=True)
    parser.add_argument("--description", required=True)
    parser.add_argument("--acknowledge-sanitized", action="store_true", required=True)
    args = parser.parse_args()
    if os.environ.get("APP_ENV") != "development":
        raise RuntimeError("This local publication helper is restricted to development")
    with Session(get_engine()) as session, session.begin():
        publish_sanitized(session, args.observation_id, args.title, args.description)
    print("Sanitized observation published using its monitoring-region polygon.")

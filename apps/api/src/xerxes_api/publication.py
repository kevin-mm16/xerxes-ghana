"""Explicit local publication helper; there is no unauthenticated moderation API."""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def publish_sanitized(session: Session, observation_id: UUID, title: str, description: str):
    if not title.strip() or len(title) > 160 or not description.strip() or len(description) > 5000:
        raise ValueError("Provide bounded sanitized title and description")
    if session.execute(
        text("SELECT 1 FROM evidence_media WHERE observation_id=:id"), {"id": observation_id}
    ).first():
        raise ValueError("Attached media requires authenticated review before publication")
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
    # Compatibility for trusted local metadata-only fixtures. HTTP publication
    # uses the authenticated review service and requires reviewed activity geography.
    session.execute(
        text("""INSERT INTO observation_reviews
      (observation_id,review_status,publication_status,sanitized_title,sanitized_summary,
       media_decision,public_location_policy,summary_reviewed,location_reviewed,published_at)
      VALUES (:id,'approved','published',:title,:description,'exclude','coverage_region',true,true,now())
      ON CONFLICT(observation_id) DO UPDATE SET review_status='approved',publication_status='published',
        sanitized_title=EXCLUDED.sanitized_title,sanitized_summary=EXCLUDED.sanitized_summary,
        media_decision='exclude',summary_reviewed=true,location_reviewed=true,published_at=now()"""),
        {"id": observation_id, "title": title.strip(), "description": description.strip()},
    )
    session.flush()


if __name__ == "__main__":
    raise SystemExit(
        "Use the authenticated operations console for publication; legacy CLI is retired."
    )

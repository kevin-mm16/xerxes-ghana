"""All private review routes enforce server identity and all writes enforce CSRF."""

import json
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError

from xerxes_api.auth import MutatingReviewer, ReadReviewer
from xerxes_api.auth_models import Reviewer
from xerxes_api.db import SessionDep
from xerxes_api.media_delivery import stream_private_media
from xerxes_api.models import EvidenceMedia, Observation
from xerxes_api.moderation_audit import record_event
from xerxes_api.moderation_models import (
    ModerationAuditEvent,
    ObservationLocationRevision,
    ObservationReview,
    PublicationStatus,
    ReviewStatus,
)
from xerxes_api.moderation_schemas import (
    AssignInput,
    DecisionInput,
    DraftInput,
    LocationInput,
    WithdrawInput,
)
from xerxes_api.moderation_service import (
    get_review,
    publish_review,
    queue_item,
    require_assignment,
    require_editable,
    reset_approval,
    review_detail,
    validate_publication,
)
from xerxes_api.public_location import generate_public_location
from xerxes_api.public_media import prepare_public_derivative

router = APIRouter(prefix="/api/v1/moderation", tags=["private moderation"])


@router.get("/observations")
def queue(
    session: SessionDep,
    reviewer: ReadReviewer,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = session.execute(
        select(Observation, ObservationReview)
        .outerjoin(ObservationReview, ObservationReview.observation_id == Observation.id)
        .order_by(Observation.submitted_at.desc(), Observation.id)
        .limit(limit)
        .offset(offset)
    ).all()
    total = session.scalar(select(func.count()).select_from(Observation))
    return {
        "items": [queue_item(session, o, r) for o, r in rows],
        "total": total,
        "hasMore": offset + len(rows) < total,
    }


@router.get("/observations/{observation_id}")
def detail(observation_id: UUID, session: SessionDep, reviewer: ReadReviewer):
    observation, review = get_review(session, observation_id, lock=True)
    recent = session.scalar(
        select(ModerationAuditEvent.id)
        .where(
            ModerationAuditEvent.observation_id == observation.id,
            ModerationAuditEvent.reviewer_id == reviewer.id,
            ModerationAuditEvent.action == "opened_review",
            ModerationAuditEvent.created_at > datetime.now(UTC) - timedelta(minutes=10),
        )
        .limit(1)
    )
    if not recent:
        record_event(session, observation.id, reviewer.id, "opened_review")
    session.commit()
    return review_detail(session, observation, review, reviewer)


def finish(session, observation, review, reviewer):
    session.commit()
    return review_detail(session, observation, review, reviewer)


@router.post("/observations/{observation_id}/assign")
def assign(
    observation_id: UUID, body: AssignInput, session: SessionDep, reviewer: MutatingReviewer
):
    observation, review = get_review(session, observation_id, lock=True)
    target = body.reviewer_id or reviewer.id
    if target != reviewer.id and reviewer.role != "admin":
        raise HTTPException(403, "Only an administrator can assign another reviewer")
    if review.assignee_id and review.assignee_id != reviewer.id and reviewer.role != "admin":
        raise HTTPException(409, "This observation is assigned to another reviewer")
    assignee = session.get(Reviewer, target)
    if not assignee or not assignee.active or assignee.role not in {"moderator", "admin"}:
        raise HTTPException(422, "Choose an active reviewer")
    review.assignee_id = target
    if review.review_status == ReviewStatus.PENDING:
        review.review_status = ReviewStatus.IN_REVIEW
    record_event(session, observation.id, reviewer.id, "assigned", {"reviewerId": str(target)})
    return finish(session, observation, review, reviewer)


@router.post("/observations/{observation_id}/draft")
def draft(observation_id: UUID, body: DraftInput, session: SessionDep, reviewer: MutatingReviewer):
    observation, review = get_review(session, observation_id, lock=True)
    require_assignment(review, reviewer)
    require_editable(review)
    review.sanitized_title, review.sanitized_summary = body.sanitized_title, body.sanitized_summary
    review.media_decision, review.public_location_policy = (
        body.media_decision,
        body.public_location_policy,
    )
    review.summary_reviewed = body.privacy_checklist.summary_reviewed
    review.location_reviewed = body.privacy_checklist.location_reviewed
    review.identifiers_clear = body.privacy_checklist.identifiers_clear
    reset_approval(observation, review)
    record_event(session, observation.id, reviewer.id, "draft_saved")
    return finish(session, observation, review, reviewer)


@router.post("/observations/{observation_id}/location")
def location(
    observation_id: UUID, body: LocationInput, session: SessionDep, reviewer: MutatingReviewer
):
    observation, review = get_review(session, observation_id, lock=True)
    require_assignment(review, reviewer)
    require_editable(review)
    geojson = json.dumps(body.geometry, allow_nan=False)
    try:
        valid = session.execute(
            text("""WITH feature AS (
          SELECT ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326) g)
          SELECT ST_IsValid(g) AND NOT ST_IsEmpty(g) AND ST_NDims(g)=2
            AND ST_CoveredBy(g,ST_MakeEnvelope(-3.6,4.1,1.6,11.5,4326)) FROM feature"""),
            {"geometry": geojson},
        ).scalar_one()
    except SQLAlchemyError:
        session.rollback()
        raise HTTPException(422, "Provide valid two-dimensional Ghana activity geometry") from None
    if not valid:
        raise HTTPException(422, "Provide valid two-dimensional Ghana activity geometry")
    old = session.execute(
        text("SELECT geometry FROM observation_locations WHERE observation_id=:id"),
        {"id": observation.id},
    ).scalar_one_or_none()
    new = session.execute(
        text("SELECT ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326)"), {"geometry": geojson}
    ).scalar_one()
    session.add(
        ObservationLocationRevision(
            observation_id=observation.id,
            reviewer_id=reviewer.id,
            old_geometry=old,
            new_geometry=new,
            reason=body.reason,
        )
    )
    session.execute(
        text("""INSERT INTO observation_locations(observation_id,geometry,reviewed_at,source)
      VALUES (:id,ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326),now(),:reviewer)
      ON CONFLICT(observation_id) DO UPDATE SET geometry=EXCLUDED.geometry,
        reviewed_at=EXCLUDED.reviewed_at,source=EXCLUDED.source"""),
        {"id": observation.id, "geometry": geojson, "reviewer": str(reviewer.id)},
    )
    regions = (
        session.execute(
            text("""SELECT c.id FROM coverage_regions c
      JOIN observation_locations l ON ST_Covers(c.geometry,l.geometry)
      WHERE l.observation_id=:id AND c.status='active' AND c.valid_from<=now()
      AND (c.valid_to IS NULL OR c.valid_to>now())"""),
            {"id": observation.id},
        )
        .scalars()
        .all()
    )
    observation.coverage_region_id = regions[0] if len(regions) == 1 else None
    review.location_reviewed = False
    reset_approval(observation, review)
    record_event(session, observation.id, reviewer.id, "location_changed")
    return finish(session, observation, review, reviewer)


@router.get("/observations/{observation_id}/public-location")
def public_location(observation_id: UUID, session: SessionDep, reviewer: ReadReviewer):
    observation, review = get_review(session, observation_id)
    return generate_public_location(session, observation.id, review.public_location_policy)


@router.post("/observations/{observation_id}/prepare-media")
def prepare_media(observation_id: UUID, session: SessionDep, reviewer: MutatingReviewer):
    observation, review = get_review(session, observation_id, lock=True)
    require_assignment(review, reviewer)
    require_editable(review)
    if review.media_decision != "publish" or not review.identifiers_clear:
        raise HTTPException(409, "Select public media and certify no sensitive identifiers remain")
    prepare_public_derivative(session, observation.id, reviewer.id)
    reset_approval(observation, review)
    record_event(session, observation.id, reviewer.id, "public_derivative_requested")
    return finish(session, observation, review, reviewer)


@router.post("/observations/{observation_id}/decision")
def decision(
    observation_id: UUID, body: DecisionInput, session: SessionDep, reviewer: MutatingReviewer
):
    observation, review = get_review(session, observation_id, lock=True)
    require_assignment(review, reviewer)
    require_editable(review)
    if body.decision == "approve":
        validate_publication(session, observation, review)
        review.review_status = ReviewStatus.APPROVED
    else:
        review.review_status, observation.status = ReviewStatus.REJECTED, "rejected"
    record_event(
        session,
        observation.id,
        reviewer.id,
        "approved" if body.decision == "approve" else "rejected",
        private_note=body.reason,
    )
    return finish(session, observation, review, reviewer)


@router.post("/observations/{observation_id}/publish")
def publish(observation_id: UUID, session: SessionDep, reviewer: MutatingReviewer):
    observation, review = get_review(session, observation_id, lock=True)
    require_assignment(review, reviewer)
    require_editable(review)
    publish_review(session, observation, review, reviewer)
    return finish(session, observation, review, reviewer)


@router.post("/observations/{observation_id}/withdraw")
def withdraw(
    observation_id: UUID, body: WithdrawInput, session: SessionDep, reviewer: MutatingReviewer
):
    observation, review = get_review(session, observation_id, lock=True)
    require_assignment(review, reviewer)
    if review.publication_status != PublicationStatus.PUBLISHED:
        raise HTTPException(409, "This observation is not published")
    review.publication_status, observation.status = PublicationStatus.WITHDRAWN, "pending"
    record_event(session, observation.id, reviewer.id, "withdrawn", private_note=body.reason)
    return finish(session, observation, review, reviewer)


@router.api_route("/observations/{observation_id}/media/{variant}", methods=["GET", "HEAD"])
def private_media(
    observation_id: UUID,
    variant: Literal["original", "review", "thumbnail"],
    request: Request,
    session: SessionDep,
    reviewer: ReadReviewer,
):
    get_review(session, observation_id)
    media = session.scalar(
        select(EvidenceMedia).where(EvidenceMedia.observation_id == observation_id)
    )
    if not media:
        raise HTTPException(404, "Private media unavailable")
    if variant == "original":
        if reviewer.role != "admin":
            raise HTTPException(403, "Original evidence requires administrator access")
        key, mime = media.original_object_key, media.detected_mime_type or media.declared_mime_type
    elif media.processing_status == "review_ready":
        key = media.review_object_key if variant == "review" else media.thumbnail_object_key
        mime = (
            "image/jpeg" if variant == "thumbnail" or media.media_kind == "image" else "video/mp4"
        )
    else:
        raise HTTPException(409, "Private review media is not ready")
    if not key:
        raise HTTPException(404, "Private media unavailable")
    extension = "jpg" if mime == "image/jpeg" else "mp4" if mime == "video/mp4" else "bin"
    return stream_private_media(
        key,
        mime,
        request.headers.get("range"),
        f"private-{variant}.{extension}",
        head=request.method == "HEAD",
    )

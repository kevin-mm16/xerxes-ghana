"""Private review application service; public publication is a distinct transaction."""

import json
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select, text

from xerxes_api.auth_models import Reviewer
from xerxes_api.models import CaptureLocation, CoverageRegion, EvidenceMedia, Observation
from xerxes_api.moderation_audit import record_event
from xerxes_api.moderation_models import (
    MediaDecision,
    ModerationAuditEvent,
    ObservationReview,
    PublicationStatus,
    ReviewStatus,
)
from xerxes_api.public_location import generate_public_location
from xerxes_api.public_media import public_media_status
from xerxes_api.public_media_models import PublishedMedia


def get_review(session, observation_id, *, lock=False):
    query = select(Observation).where(Observation.id == observation_id)
    if lock:
        query = query.with_for_update()
    observation = session.scalar(query)
    if observation is None:
        raise HTTPException(404, "Observation not found")
    review = session.get(ObservationReview, observation.id)
    if review is None:
        review = ObservationReview(observation_id=observation.id)
        session.add(review)
        session.flush()
    return observation, review


def require_assignment(review, reviewer):
    if reviewer.role != "admin" and review.assignee_id != reviewer.id:
        raise HTTPException(403, "Assign this observation to yourself before editing")


def require_editable(review):
    if review.publication_status == PublicationStatus.PUBLISHED:
        raise HTTPException(409, "Withdraw this record before changing its review")


def reset_approval(observation, review):
    review.review_status = ReviewStatus.IN_REVIEW
    review.updated_at = datetime.now(UTC)
    observation.status = "pending"


def queue_item(session, observation, review=None):
    region = (
        session.get(CoverageRegion, observation.coverage_region_id)
        if observation.coverage_region_id
        else None
    )
    media = session.scalar(
        select(EvidenceMedia).where(EvidenceMedia.observation_id == observation.id)
    )
    assignee = session.get(Reviewer, review.assignee_id) if review and review.assignee_id else None
    flags = []
    if observation.coverage_state != "inside":
        flags.append(f"coverage_{observation.coverage_state}")
    if media and media.processing_status != "review_ready":
        flags.append("media_not_ready")
    return {
        "id": str(observation.id),
        "title": observation.title or "Untitled observation",
        "submittedAt": observation.submitted_at,
        "observedAt": observation.observed_at,
        "coverageState": observation.coverage_state,
        "coverageRegion": {"id": str(region.id), "code": region.code, "name": region.name}
        if region
        else None,
        "media": {
            "id": str(media.id),
            "processingStatus": media.processing_status,
            "mediaKind": media.media_kind,
        }
        if media
        else None,
        "reviewStatus": review.review_status if review else "pending",
        "publicationStatus": review.publication_status if review else "not_published",
        "assignee": {"id": str(assignee.id), "username": assignee.username} if assignee else None,
        "riskFlags": flags,
    }


def review_detail(session, observation, review, reviewer):
    result = queue_item(session, observation, review)
    capture = session.get(CaptureLocation, observation.id)
    location = (
        session.execute(
            text("""SELECT ST_AsGeoJSON(geometry) geometry,reviewed_at,source
      FROM observation_locations WHERE observation_id=:id"""),
            {"id": observation.id},
        )
        .mappings()
        .first()
    )
    capture_point = (
        session.execute(
            text("""SELECT ST_X(geometry) longitude,ST_Y(geometry) latitude
      FROM capture_locations WHERE observation_id=:id"""),
            {"id": observation.id},
        )
        .mappings()
        .first()
        if capture
        else None
    )
    media = session.scalar(
        select(EvidenceMedia).where(EvidenceMedia.observation_id == observation.id)
    )
    candidate = session.scalar(
        select(PublishedMedia).where(PublishedMedia.observation_id == observation.id)
    )
    events = session.scalars(
        select(ModerationAuditEvent)
        .where(ModerationAuditEvent.observation_id == observation.id)
        .order_by(ModerationAuditEvent.created_at.desc())
        .limit(100)
    ).all()
    result.update(
        {
            "privateDescription": observation.description,
            "manualLocation": observation.manual_location,
            "captureLocation": {
                **dict(capture_point),
                "accuracyMeters": capture.accuracy_meters,
                "capturedAt": capture.captured_at,
                "source": capture.source,
            }
            if capture
            else None,
            "observationLocation": {
                "geometry": json.loads(location["geometry"]),
                "reviewedAt": location["reviewed_at"],
                "reviewedBy": location["source"],
            }
            if location
            else None,
            "sanitizedTitle": review.sanitized_title,
            "sanitizedSummary": review.sanitized_summary,
            "mediaDecision": review.media_decision,
            "publicLocationPolicy": review.public_location_policy,
            "privacyChecklist": {
                "summaryReviewed": review.summary_reviewed,
                "locationReviewed": review.location_reviewed,
                "identifiersClear": review.identifiers_clear,
            },
            "publicMedia": public_media_status(candidate) if candidate else None,
            "audit": [
                {
                    "id": str(e.id),
                    "action": e.action,
                    "reviewerId": str(e.reviewer_id) if e.reviewer_id else None,
                    "createdAt": e.created_at,
                    "details": e.details,
                    "note": e.private_note,
                }
                for e in events
            ],
        }
    )
    if media:
        prefix = f"/api/v1/moderation/observations/{observation.id}/media"
        result["media"].update(
            {
                "mimeType": media.detected_mime_type or media.declared_mime_type,
                "filename": media.original_filename,
                "fileSize": media.file_size,
                "sha256": media.original_sha256,
                "duplicateCount": max(
                    0,
                    (
                        session.scalar(
                            select(func.count())
                            .select_from(EvidenceMedia)
                            .where(EvidenceMedia.original_sha256 == media.original_sha256)
                        )
                        or 0
                    )
                    - 1,
                )
                if media.original_sha256
                else 0,
                "reviewUrl": prefix + "/review"
                if media.processing_status == "review_ready"
                else None,
                "thumbnailUrl": prefix + "/thumbnail"
                if media.processing_status == "review_ready"
                else None,
                "originalUrl": prefix + "/original" if reviewer.role == "admin" else None,
            }
        )
    return result


def validate_publication(session, observation, review):
    if not review.sanitized_title.strip() or not review.sanitized_summary.strip():
        raise HTTPException(409, "Save a sanitized title and summary first")
    if not review.summary_reviewed or not review.location_reviewed:
        raise HTTPException(409, "Complete the public summary and location privacy checklist")
    location = generate_public_location(session, observation.id, review.public_location_policy)
    if review.media_decision == MediaDecision.UNDECIDED:
        raise HTTPException(409, "Choose whether to publish or exclude media")
    candidate = None
    if review.media_decision == MediaDecision.PUBLISH:
        if not review.identifiers_clear:
            raise HTTPException(409, "Certify that no sensitive visual or audio identifiers remain")
        candidate = session.scalar(
            select(PublishedMedia)
            .where(PublishedMedia.observation_id == observation.id)
            .with_for_update()
        )
        media = session.scalar(
            select(EvidenceMedia).where(EvidenceMedia.observation_id == observation.id)
        )
        if (
            not candidate
            or candidate.processing_status != "ready"
            or not media
            or media.processing_status != "review_ready"
            or candidate.source_review_sha256 != media.review_sha256
            or not candidate.public_object_key
            or not candidate.thumbnail_object_key
        ):
            raise HTTPException(
                409, "Prepare a ready public derivative before approval or publication"
            )
    return location, candidate


def publish_review(session, observation, review, reviewer):
    if review.review_status != ReviewStatus.APPROVED:
        raise HTTPException(409, "Approve the reviewed observation before publication")
    location, candidate = validate_publication(session, observation, review)
    session.execute(
        text("""INSERT INTO public_locations
        (observation_id,geometry,label,precision_level,title,description)
        VALUES (:id,ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326),:label,:precision,:title,:summary)
        ON CONFLICT (observation_id) DO UPDATE SET geometry=EXCLUDED.geometry,label=EXCLUDED.label,
        precision_level=EXCLUDED.precision_level,title=EXCLUDED.title,description=EXCLUDED.description,
        generated_at=now()"""),
        {
            "id": observation.id,
            "geometry": json.dumps(location["geometry"]),
            "label": location["label"],
            "precision": location["precisionLevel"],
            "title": review.sanitized_title,
            "summary": review.sanitized_summary,
        },
    )
    review.publication_status = PublicationStatus.PUBLISHED
    review.published_at = datetime.now(UTC)
    observation.status = "approved"
    if candidate:
        candidate.published_at = review.published_at
    record_event(
        session, observation.id, reviewer.id, "published", {"policy": review.public_location_policy}
    )

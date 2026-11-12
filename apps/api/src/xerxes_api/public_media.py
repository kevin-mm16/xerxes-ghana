"""Certified publication candidates and a leased, independent derivative worker.

Metadata stripping and format normalization do not redact faces, voices, plates
or landmarks. The moderation boundary must obtain a fresh human certification
before calling prepare_public_derivative. These objects remain gated until an
explicit publication transaction; a ready job alone never enables delivery.
"""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from xerxes_api.evidence_storage import StorageError
from xerxes_api.media_delivery import stream_media
from xerxes_api.models import EvidenceMedia
from xerxes_api.public_media_models import PublicMediaJob, PublicMediaState, PublishedMedia
from xerxes_api.public_media_worker import (  # noqa: F401 - integration API
    claim_public_job,
    fail_public_job,
    process_public_claim,
    run_public_once,
)
from xerxes_api.public_storage import get_public_storage


def public_media_status(media: PublishedMedia) -> dict:
    """Moderator candidate metadata. Never include keys, hashes or source URLs."""
    return {
        "id": str(media.id),
        "processingStatus": media.processing_status,
        "mediaKind": media.media_kind,
        "mimeType": media.mime_type,
        "width": media.width,
        "height": media.height,
        "durationSeconds": media.duration_seconds,
        "errorCode": media.processing_error,
    }


def prepare_public_derivative(
    session: Session, observation_id: UUID, reviewer_id: UUID
) -> PublishedMedia:
    """Queue after caller's authorization/checklist; caller commits audit and row.

    Observation-level mutation locking belongs to the moderation service. The
    unique observation constraint additionally prevents competing candidates.
    """
    source = session.scalars(
        select(EvidenceMedia).where(EvidenceMedia.observation_id == observation_id)
    ).one_or_none()
    if (
        source is None
        or source.processing_status != "review_ready"
        or not source.review_object_key
        or not source.review_sha256
    ):
        raise HTTPException(409, "Private media must be review-ready first")
    entry = session.scalars(
        select(PublishedMedia).where(PublishedMedia.observation_id == observation_id)
    ).one_or_none()
    if entry:
        if entry.source_media_id != source.id or entry.source_review_sha256 != source.review_sha256:
            raise HTTPException(409, "Review media changed; a new certification is required")
        if entry.processing_status != PublicMediaState.FAILED:
            return entry
        entry.processing_status, entry.processing_error = PublicMediaState.QUEUED, None
        entry.certified_by, entry.certified_at = reviewer_id, datetime.now(UTC)
        job = session.get(PublicMediaJob, entry.id)
        if job is None:
            session.add(PublicMediaJob(media_id=entry.id, status="queued", attempts=0))
        else:
            job.status, job.attempts, job.last_error = "queued", 0, None
            job.available_at, job.locked_until, job.lease_token = datetime.now(UTC), None, None
        session.flush()
        return entry
    entry = PublishedMedia(
        observation_id=observation_id,
        source_media_id=source.id,
        source_review_sha256=source.review_sha256,
        media_kind=source.media_kind,
        mime_type="video/mp4" if source.media_kind == "video" else "image/jpeg",
        processing_status=PublicMediaState.QUEUED,
        certified_by=reviewer_id,
        certified_at=datetime.now(UTC),
    )
    session.add(entry)
    session.flush()
    session.add(PublicMediaJob(media_id=entry.id, status="queued", attempts=0))
    session.flush()
    return entry


def stream_published_media(
    session: Session,
    media_id: UUID,
    variant: str = "asset",
    range_header: str | None = None,
    *,
    head: bool = False,
):
    if variant not in {"asset", "thumbnail"}:
        raise HTTPException(404, "Published media not found")
    # A candidate's guessed UUID is useless before publication or after
    # withdrawal. Gate each GET/HEAD/range request, including thumbnails.
    row = (
        session.execute(
            text("""
        SELECT m.public_object_key,m.thumbnail_object_key,m.mime_type,m.media_kind
        FROM published_media m JOIN observations o ON o.id=m.observation_id
        JOIN observation_reviews r ON r.observation_id=o.id
        JOIN public_locations p ON p.observation_id=o.id
        WHERE m.id=:id AND m.processing_status='ready'
          AND r.publication_status='published' AND r.review_status='approved'
          AND r.media_decision='publish' AND o.status='approved'
          AND r.summary_reviewed AND r.location_reviewed AND r.identifiers_clear
    """),
            {"id": media_id},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(404, "Published media not found")
    thumbnail = variant == "thumbnail"
    key = row["thumbnail_object_key"] if thumbnail else row["public_object_key"]
    mime = "image/jpeg" if thumbnail else row["mime_type"]
    suffix = "jpg" if thumbnail or row["media_kind"] == "image" else "mp4"
    filename = f"xersxes-{media_id}{'-thumbnail' if thumbnail else ''}.{suffix}"
    try:
        return stream_media(
            get_public_storage().local_copy(key), mime, range_header, filename, head=head
        )
    except StorageError:
        raise HTTPException(404, "Published media not found") from None

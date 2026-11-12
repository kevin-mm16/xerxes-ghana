"""Leased private-media processing, then separately certified public-derivative jobs."""

import argparse
import hashlib
import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from xerxes_api.db import get_engine
from xerxes_api.evidence_storage import StorageError, get_evidence_storage
from xerxes_api.media_processing import ProcessingError, process_media
from xerxes_api.models import EvidenceMedia, MediaProcessingJob

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class JobClaim:
    media_id: UUID
    lease_token: UUID
    original_key: str
    original_hash: str
    declared_mime: str


def claim_next_job(session: Session):
    now = datetime.now(UTC)
    stale = session.scalars(
        select(MediaProcessingJob)
        .where(
            MediaProcessingJob.status == "running",
            MediaProcessingJob.locked_until <= now,
            MediaProcessingJob.attempts >= 3,
        )
        .with_for_update(skip_locked=True)
    ).all()
    for job in stale:
        job.status, job.last_error = "failed", "worker_interrupted"
        media = session.get(EvidenceMedia, job.media_id)
        media.processing_status, media.processing_error = "failed", "worker_interrupted"
    job = session.scalars(
        select(MediaProcessingJob)
        .where(
            MediaProcessingJob.attempts < 3,
            or_(
                and_(MediaProcessingJob.status == "queued", MediaProcessingJob.available_at <= now),
                and_(
                    MediaProcessingJob.status == "running", MediaProcessingJob.locked_until <= now
                ),
            ),
        )
        .order_by(MediaProcessingJob.available_at, MediaProcessingJob.media_id)
        .with_for_update(skip_locked=True)
        .limit(1)
    ).first()
    if job is None:
        session.commit()
        return None
    media = session.get(EvidenceMedia, job.media_id)
    if media.processing_status not in {"quarantined", "processing"}:
        job.status, job.last_error = "failed", "invalid_job_state"
        session.commit()
        return None
    lease = uuid4()
    job.status, job.lease_token = "running", lease
    job.attempts += 1
    job.locked_until = now + timedelta(minutes=5)
    media.processing_status, media.processing_error = "processing", None
    claim = JobClaim(
        media.id, lease, media.original_object_key, media.original_sha256, media.declared_mime_type
    )
    session.commit()
    return claim


def complete_job(session: Session, claim: JobClaim, result, review_key, thumbnail_key):
    job = session.scalars(
        select(MediaProcessingJob)
        .where(MediaProcessingJob.media_id == claim.media_id)
        .with_for_update()
    ).one_or_none()
    if (
        not job
        or job.status != "running"
        or job.lease_token != claim.lease_token
        or job.locked_until <= datetime.now(UTC)
    ):
        session.rollback()
        return False
    media = session.get(EvidenceMedia, claim.media_id)
    media.review_object_key, media.thumbnail_object_key = review_key, thumbnail_key
    media.review_sha256, media.thumbnail_sha256 = result.review_sha256, result.thumbnail_sha256
    media.detected_mime_type, media.media_kind = result.detected_mime_type, result.media_kind
    media.width, media.height, media.duration_seconds = (
        result.width,
        result.height,
        result.duration_seconds,
    )
    media.processing_version = result.processing_version
    media.processing_status, media.processing_error = "review_ready", None
    media.processed_at = datetime.now(UTC)
    job.status, job.last_error, job.locked_until = "succeeded", None, None
    session.commit()
    return True


def fail_job(session: Session, claim: JobClaim, code: str, retryable=False):
    session.rollback()
    job = session.scalars(
        select(MediaProcessingJob)
        .where(MediaProcessingJob.media_id == claim.media_id)
        .with_for_update()
    ).one_or_none()
    if not job or job.status != "running" or job.lease_token != claim.lease_token:
        session.rollback()
        return
    media = session.get(EvidenceMedia, claim.media_id)
    retry = retryable and job.attempts < 3
    job.status, job.last_error, job.locked_until = "queued" if retry else "failed", code, None
    job.available_at = datetime.now(UTC) + timedelta(seconds=30 * job.attempts)
    media.processing_status = "quarantined" if retry else "failed"
    media.processing_error = code
    if not retry:
        media.processed_at = datetime.now(UTC)
    session.commit()


def process_claim(session: Session, claim: JobClaim):
    storage, attempted_keys = None, []
    try:
        storage = get_evidence_storage()
        with storage.local_copy(claim.original_key) as original:
            digest = hashlib.sha256()
            with original.open("rb") as source:
                while chunk := source.read(1024 * 1024):
                    digest.update(chunk)
            if digest.hexdigest() != claim.original_hash:
                raise ProcessingError("integrity_failed")
            with storage.work_directory() as directory:
                result = process_media(original, claim.declared_mime, directory)
                prefix = f"review/{claim.media_id}/{claim.lease_token}"
                review_key = prefix + (
                    "/asset.jpg" if result.media_kind == "image" else "/asset.mp4"
                )
                thumbnail_key = prefix + "/thumbnail.jpg"
                attempted_keys.append(review_key)
                storage.put_file(review_key, result.review_path)
                attempted_keys.append(thumbnail_key)
                storage.put_file(thumbnail_key, result.thumbnail_path)
                complete_job(session, claim, result, review_key, thumbnail_key)
    except ProcessingError as exc:
        fail_job(session, claim, exc.code, exc.retryable)
    except (StorageError, OSError):
        fail_job(session, claim, "storage_unavailable", True)
    except Exception:  # noqa: BLE001 - retry unknown failures without logging private decoder output
        logger.error("media_job_failed", extra={"media_id": str(claim.media_id)})
        fail_job(session, claim, "processing_failed", True)
    finally:
        if storage and attempted_keys:
            from xerxes_api.media_maintenance import cleanup_attempt

            cleanup_attempt(session, storage, attempted_keys)


def run_once(engine=None):
    with Session(engine or get_engine()) as session:
        claim = claim_next_job(session)
        if claim is None:
            # The public queue is distinct: a ready private derivative never
            # schedules publication without an authenticated certification.
            from xerxes_api.public_media import run_public_once

            return run_public_once(engine)
        process_claim(session, claim)
        return True


def run_worker():
    from xerxes_api.media_maintenance import maintain_uploads

    maintained_at = 0.0
    while True:
        try:
            if time.monotonic() - maintained_at >= 60:
                with Session(get_engine()) as session:
                    maintain_uploads(session)
                maintained_at = time.monotonic()
            worked = run_once()
        except Exception:  # noqa: BLE001 - keep durable queue alive on temporary service failures
            logger.error("media_worker_temporarily_unavailable")
            worked = False
        if not worked:
            time.sleep(2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if args.once:
        run_once()
    else:
        run_worker()

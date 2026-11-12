"""Durable re-encoding of certified review media into distinct publication objects."""

import hashlib
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from xerxes_api.db import get_engine
from xerxes_api.evidence_storage import StorageError, get_evidence_storage
from xerxes_api.media_processing import ProcessingError, process_media
from xerxes_api.models import EvidenceMedia
from xerxes_api.public_media_models import PublicMediaJob, PublicMediaState, PublishedMedia
from xerxes_api.public_storage import get_public_storage

PUBLIC_PROCESSING_VERSION = "xersxes-public-media-v1"
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PublicJobClaim:
    media_id: UUID
    lease_token: UUID
    source_media_id: UUID
    review_key: str
    review_hash: str
    mime_type: str


def claim_public_job(session: Session) -> PublicJobClaim | None:
    now = datetime.now(UTC)
    stale = session.scalars(
        select(PublicMediaJob)
        .where(
            PublicMediaJob.status == "running",
            PublicMediaJob.locked_until <= now,
            PublicMediaJob.attempts >= 3,
        )
        .with_for_update(skip_locked=True)
    ).all()
    for job in stale:
        job.status, job.last_error, job.locked_until = "failed", "worker_interrupted", None
        media = session.get(PublishedMedia, job.media_id)
        media.processing_status, media.processing_error = (
            PublicMediaState.FAILED,
            "worker_interrupted",
        )
    job = session.scalars(
        select(PublicMediaJob)
        .where(
            PublicMediaJob.attempts < 3,
            or_(
                and_(PublicMediaJob.status == "queued", PublicMediaJob.available_at <= now),
                and_(PublicMediaJob.status == "running", PublicMediaJob.locked_until <= now),
            ),
        )
        .order_by(PublicMediaJob.available_at, PublicMediaJob.media_id)
        .with_for_update(skip_locked=True)
        .limit(1)
    ).first()
    if job is None:
        session.commit()
        return None
    media = session.get(PublishedMedia, job.media_id)
    source = session.get(EvidenceMedia, media.source_media_id)
    if (
        media.processing_status not in {PublicMediaState.QUEUED, PublicMediaState.PROCESSING}
        or source is None
        or source.processing_status != "review_ready"
        or source.observation_id != media.observation_id
        or source.review_sha256 != media.source_review_sha256
        or not source.review_object_key
    ):
        job.status, job.last_error, job.locked_until = "failed", "source_changed", None
        media.processing_status, media.processing_error = PublicMediaState.FAILED, "source_changed"
        session.commit()
        return None
    lease = uuid4()
    job.status, job.lease_token = "running", lease
    job.attempts += 1
    job.locked_until = now + timedelta(minutes=5)
    media.processing_status, media.processing_error = PublicMediaState.PROCESSING, None
    claim = PublicJobClaim(
        media.id,
        lease,
        source.id,
        source.review_object_key,
        media.source_review_sha256,
        media.mime_type,
    )
    session.commit()
    return claim


def _finish_public_job(session: Session, claim: PublicJobClaim, result, asset_key, thumbnail_key):
    job = session.scalars(
        select(PublicMediaJob).where(PublicMediaJob.media_id == claim.media_id).with_for_update()
    ).one_or_none()
    if (
        not job
        or job.status != "running"
        or job.lease_token != claim.lease_token
        or job.locked_until <= datetime.now(UTC)
    ):
        session.rollback()
        return False
    media = session.get(PublishedMedia, claim.media_id)
    source = session.get(EvidenceMedia, claim.source_media_id)
    if (
        source is None
        or source.processing_status != "review_ready"
        or source.review_sha256 != claim.review_hash
        or source.observation_id != media.observation_id
    ):
        raise ProcessingError("source_changed")
    media.public_object_key, media.thumbnail_object_key = asset_key, thumbnail_key
    media.sha256, media.thumbnail_sha256 = result.review_sha256, result.thumbnail_sha256
    media.media_kind = result.media_kind
    media.width, media.height, media.duration_seconds = (
        result.width,
        result.height,
        result.duration_seconds,
    )
    media.publication_version = f"{PUBLIC_PROCESSING_VERSION};{result.processing_version}"
    media.processing_status, media.processing_error = PublicMediaState.READY, None
    media.processed_at = datetime.now(UTC)
    job.status, job.last_error, job.locked_until = "succeeded", None, None
    from xerxes_api.moderation_audit import record_event

    record_event(
        session,
        media.observation_id,
        media.certified_by,
        "public_derivative_created",
        {"mediaId": str(media.id), "version": PUBLIC_PROCESSING_VERSION},
    )
    session.commit()
    return True


def fail_public_job(session: Session, claim: PublicJobClaim, code: str, retryable: bool = False):
    session.rollback()
    job = session.scalars(
        select(PublicMediaJob).where(PublicMediaJob.media_id == claim.media_id).with_for_update()
    ).one_or_none()
    if not job or job.status != "running" or job.lease_token != claim.lease_token:
        session.rollback()
        return
    media = session.get(PublishedMedia, claim.media_id)
    retry = retryable and job.attempts < 3
    job.status, job.last_error, job.locked_until = "queued" if retry else "failed", code, None
    job.available_at = datetime.now(UTC) + timedelta(seconds=30 * job.attempts)
    media.processing_status = PublicMediaState.QUEUED if retry else PublicMediaState.FAILED
    media.processing_error = code
    if not retry:
        media.processed_at = datetime.now(UTC)
    session.commit()


def _cleanup_attempt(session: Session, storage, keys: list[str]):
    session.rollback()
    retained = {
        key
        for row in session.execute(
            select(PublishedMedia.public_object_key, PublishedMedia.thumbnail_object_key).where(
                or_(
                    PublishedMedia.public_object_key.in_(keys),
                    PublishedMedia.thumbnail_object_key.in_(keys),
                )
            )
        )
        for key in row
        if key
    }
    session.rollback()
    for key in keys:
        if key not in retained:
            try:
                storage.delete(key)
            except StorageError:
                logger.warning("public_media_attempt_cleanup_pending")


def process_public_claim(session: Session, claim: PublicJobClaim):
    storage, attempted = None, []
    try:
        storage = get_public_storage()
        private = get_evidence_storage()
        with private.local_copy(claim.review_key) as source:
            with source.open("rb") as media:
                if hashlib.file_digest(media, "sha256").hexdigest() != claim.review_hash:
                    raise ProcessingError("integrity_failed")
            with storage.work_directory() as directory:
                # Deliberately decode/re-encode the certified review copy. This
                # is a separate object/step, never a review-copy ACL change.
                result = process_media(source, claim.mime_type, directory)
                prefix = f"published/{claim.media_id}/{claim.lease_token}"
                asset_key = prefix + (
                    "/asset.jpg" if result.media_kind == "image" else "/asset.mp4"
                )
                thumbnail_key = prefix + "/thumbnail.jpg"
                attempted.append(asset_key)
                storage.put_file(asset_key, result.review_path)
                attempted.append(thumbnail_key)
                storage.put_file(thumbnail_key, result.thumbnail_path)
                _finish_public_job(session, claim, result, asset_key, thumbnail_key)
    except ProcessingError as exc:
        fail_public_job(session, claim, exc.code, exc.retryable)
    except (StorageError, OSError):
        fail_public_job(session, claim, "storage_unavailable", True)
    except Exception:  # noqa: BLE001 - never log decoder output/private object paths
        logger.error("public_media_job_failed", extra={"media_id": str(claim.media_id)})
        fail_public_job(session, claim, "processing_failed", True)
    finally:
        if storage and attempted:
            _cleanup_attempt(session, storage, attempted)


def run_public_once(engine=None) -> bool:
    with Session(engine or get_engine()) as session:
        claim = claim_public_job(session)
        if claim is None:
            return False
        process_public_claim(session, claim)
        return True

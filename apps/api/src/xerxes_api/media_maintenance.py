"""Conservative private-media retention and orphan recovery.

Only abandoned, unattached uploads are expired. Attached evidence is retained.
Database visibility and live leases are checked before review objects are removed.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import exists, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from xerxes_api.evidence_storage import (
    EvidenceStorage,
    StorageError,
    get_evidence_storage,
    validate_object_key,
)
from xerxes_api.models import EvidenceMedia, MediaProcessingJob

_BUSY = object()


def _lock_owner(session: Session, media_id: UUID):
    # Worker lock order is job -> media. SKIP LOCKED also avoids competing with
    # an attachment transaction or a currently committing worker result.
    job = session.scalars(
        select(MediaProcessingJob)
        .where(MediaProcessingJob.media_id == media_id)
        .with_for_update(skip_locked=True)
    ).one_or_none()
    if job is None and session.scalar(
        select(exists().where(MediaProcessingJob.media_id == media_id))
    ):
        return _BUSY
    media = session.scalars(
        select(EvidenceMedia).where(EvidenceMedia.id == media_id).with_for_update(skip_locked=True)
    ).one_or_none()
    if media is None and session.scalar(select(exists().where(EvidenceMedia.id == media_id))):
        return _BUSY
    return job, media


def _live_lease(job, now):
    return bool(job and job.status == "running" and job.locked_until and job.locked_until > now)


def _referenced_keys(session, keys):
    if not keys:
        return set()
    rows = session.execute(
        select(EvidenceMedia.review_object_key, EvidenceMedia.thumbnail_object_key).where(
            or_(
                EvidenceMedia.review_object_key.in_(keys),
                EvidenceMedia.thumbnail_object_key.in_(keys),
            )
        )
    ).all()
    return {key for row in rows for key in row if key}


def cleanup_attempt(session: Session, storage: EvidenceStorage, keys) -> int:
    """Remove unreferenced review-attempt keys; an uncertain database means no delete.

    Call after recording a failed attempt. A currently live lease is protected,
    as are objects referenced by a commit whose acknowledgement was lost.
    """
    groups = {}
    try:
        for key in set(keys):
            parts = validate_object_key(key)
            if parts[0] != "review" or len(parts) < 4:
                continue
            media_id = UUID(parts[1])
            UUID(parts[2])
            groups.setdefault(media_id, []).append(key)
    except (ValueError, StorageError):
        return 0
    eligible = []
    now = datetime.now(UTC)
    try:
        for media_id in sorted(groups, key=str):
            locked = _lock_owner(session, media_id)
            if locked is _BUSY:
                continue
            job, _media = locked
            live_prefix = f"review/{media_id}/{job.lease_token}/" if _live_lease(job, now) else None
            eligible.extend(
                key
                for key in groups[media_id]
                if not live_prefix or not key.startswith(live_prefix)
            )
        referenced = _referenced_keys(session, eligible)
    except SQLAlchemyError:
        session.rollback()
        return 0
    removed = 0
    try:
        for key in eligible:
            if key not in referenced:
                storage.delete(key)
                removed += 1
    except StorageError:
        pass
    finally:
        try:
            session.commit()
        except SQLAlchemyError:
            session.rollback()
    return removed


def maintain_uploads(session: Session, storage: EvidenceStorage | None = None) -> dict[str, int]:
    storage = storage or get_evidence_storage()
    now = datetime.now(UTC)
    counts = {
        "expired_intents": 0,
        "interrupted_uploads": 0,
        "abandoned_media": 0,
        "orphan_objects": 0,
        "staging_files": 0,
        "storage_failures": 0,
    }
    try:
        candidates = session.scalars(
            select(EvidenceMedia.id)
            .where(EvidenceMedia.observation_id.is_(None), EvidenceMedia.expires_at <= now)
            .order_by(EvidenceMedia.created_at, EvidenceMedia.id)
        ).all()
        for media_id in candidates:
            locked = _lock_owner(session, media_id)
            if locked is _BUSY:
                session.commit()
                continue
            job, media = locked
            if media is None or media.observation_id or _live_lease(job, now):
                session.commit()
                continue
            if media.processing_status == "awaiting_upload":
                # No bytes should exist before the uploading state is committed.
                # A defensive deletion also covers unexpected abandoned objects.
                try:
                    storage.delete(media.original_object_key)
                except StorageError:
                    counts["storage_failures"] += 1
                    session.rollback()
                    continue
                media.processing_status, media.processing_error = "expired", "upload_expired"
                media.file_size = None
                if job:
                    job.status, job.last_error, job.locked_until = "failed", "upload_expired", None
                counts["expired_intents"] += 1
            elif (
                media.expires_at <= now - timedelta(hours=24)
                and media.processing_status != "expired"
            ):
                try:
                    keys = [media.original_object_key, *storage.iter_keys(f"review/{media.id}")]
                    # Never remove an object unexpectedly referenced by another record.
                    other = session.scalar(
                        select(
                            exists().where(
                                EvidenceMedia.id != media.id,
                                or_(
                                    EvidenceMedia.review_object_key.in_(keys),
                                    EvidenceMedia.thumbnail_object_key.in_(keys),
                                ),
                            )
                        )
                    )
                    if other:
                        session.rollback()
                        continue
                    for key in keys:
                        storage.delete(key)
                except StorageError:
                    counts["storage_failures"] += 1
                    session.rollback()
                    continue
                media.processing_status, media.processing_error = "expired", "upload_expired"
                media.file_size = None
                media.review_object_key, media.thumbnail_object_key = None, None
                if job:
                    job.status, job.last_error, job.locked_until = "failed", "upload_expired", None
                counts["abandoned_media"] += 1
            elif media.processing_status == "uploading" and media.expires_at <= now - timedelta(
                minutes=10
            ):
                media.processing_status, media.processing_error = "failed", "upload_interrupted"
                if job:
                    job.status, job.last_error, job.locked_until = (
                        "failed",
                        "upload_interrupted",
                        None,
                    )
                counts["interrupted_uploads"] += 1
            session.commit()

        # Inspect object ages rather than media creation time: a newly written
        # attempt may belong to an observation that is months old.
        retained = session.scalars(select(EvidenceMedia.id).order_by(EvidenceMedia.id)).all()
        for media_id in retained:
            locked = _lock_owner(session, media_id)
            if locked is _BUSY:
                session.commit()
                continue
            job, media = locked
            if media is None:
                session.commit()
                continue
            live_prefix = f"review/{media.id}/{job.lease_token}/" if _live_lease(job, now) else None
            try:
                keys = [
                    key
                    for key in storage.iter_keys(f"review/{media.id}")
                    if key not in {media.review_object_key, media.thumbnail_object_key}
                    and (not live_prefix or not key.startswith(live_prefix))
                    and storage.object_modified_at(key) < now - timedelta(hours=1)
                ]
                referenced = _referenced_keys(session, keys)
                for key in keys:
                    if key not in referenced:
                        storage.delete(key)
                        counts["orphan_objects"] += 1
            except StorageError:
                counts["storage_failures"] += 1
            session.commit()
        counts["staging_files"] = storage.remove_stale_temporary(now - timedelta(hours=1))
    except SQLAlchemyError:
        session.rollback()
        raise
    except StorageError:
        counts["storage_failures"] += 1
    return counts

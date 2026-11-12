"""Recovery preserves attached evidence and reclaims only verified abandoned bytes."""

import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select

from xerxes_api.evidence_storage import FileEvidenceStorage, StorageError
from xerxes_api.media_maintenance import cleanup_attempt, maintain_uploads
from xerxes_api.models import EvidenceMedia, MediaProcessingJob, Observation


def put(storage, key, *, hours_old=0):
    staged = storage.temporary_path()
    staged.write_bytes(b"synthetic private bytes")
    storage.put_file(key, staged)
    staged.unlink()
    if hours_old:
        timestamp = (datetime.now(UTC) - timedelta(hours=hours_old)).timestamp()
        with storage.local_copy(key) as path:
            os.utime(path, (timestamp, timestamp))
    return key


def record(
    session,
    storage,
    *,
    state="failed",
    expiry_age=timedelta(hours=26),
    attached=False,
    ready=False,
    live=False,
    file_size=23,
):
    now = datetime.now(UTC)
    media_id, lease = uuid4(), uuid4()
    observation = None
    if attached:
        observation = Observation(
            description="Synthetic review context",
            manual_location="A test area",
            observed_at=now,
            status="pending",
            media_type="image",
            anonymous=True,
            coverage_state="manual",
        )
        session.add(observation)
        session.flush()
    original = put(storage, f"quarantine/{media_id}/original")
    review = thumbnail = None
    if ready:
        review = put(storage, f"review/{media_id}/{lease}/asset.jpg", hours_old=2)
        thumbnail = put(storage, f"review/{media_id}/{lease}/thumbnail.jpg", hours_old=2)
    media = EvidenceMedia(
        id=media_id,
        observation_id=observation.id if observation else None,
        upload_token_hash="a" * 64,
        original_filename="private-synthetic.jpg",
        declared_mime_type="image/jpeg",
        expected_size=23,
        file_size=file_size,
        original_sha256="b" * 64,
        original_object_key=original,
        review_object_key=review,
        thumbnail_object_key=thumbnail,
        review_sha256="c" * 64 if ready else None,
        thumbnail_sha256="d" * 64 if ready else None,
        processing_version="synthetic-test-v1" if ready else None,
        processing_status="review_ready" if ready else state,
        media_kind="image",
        expires_at=now - expiry_age,
    )
    session.add(media)
    session.flush()
    job = None
    if live:
        job = MediaProcessingJob(
            media_id=media.id,
            status="running",
            attempts=1,
            lease_token=lease,
            locked_until=now + timedelta(minutes=3),
        )
        session.add(job)
    session.commit()
    return media_id, lease


def current(session, media_id):
    session.expire_all()
    return session.scalars(select(EvidenceMedia).where(EvidenceMedia.id == media_id)).one()


def test_attached_original_and_current_derivatives_are_retained(spatial, tmp_path):
    _, session = spatial
    storage = FileEvidenceStorage(tmp_path / "private")
    media_id, _lease = record(session, storage, attached=True, ready=True)
    before = set(storage.iter_keys("review")) | set(storage.iter_keys("quarantine"))
    counts = maintain_uploads(session, storage)
    assert counts["abandoned_media"] == 0
    assert current(session, media_id).processing_status == "review_ready"
    assert set(storage.iter_keys("review")) | set(storage.iter_keys("quarantine")) == before


def test_abandoned_commit_without_file_size_is_reclaimed(spatial, tmp_path):
    _, session = spatial
    storage = FileEvidenceStorage(tmp_path / "private")
    media_id, lease = record(session, storage, state="uploading", file_size=None)
    put(storage, f"review/{media_id}/{lease}/asset.jpg")
    counts = maintain_uploads(session, storage)
    assert counts["abandoned_media"] == 1
    media = current(session, media_id)
    assert media.processing_status == "expired" and media.file_size is None
    assert list(storage.iter_keys(f"quarantine/{media_id}")) == []
    assert list(storage.iter_keys(f"review/{media_id}")) == []


def test_interrupted_upload_and_unused_intent_recover_without_early_byte_deletion(
    spatial, tmp_path
):
    _, session = spatial
    storage = FileEvidenceStorage(tmp_path / "private")
    uploading, _ = record(session, storage, state="uploading", expiry_age=timedelta(minutes=11))
    unused, _ = record(session, storage, state="awaiting_upload", expiry_age=timedelta(seconds=1))
    counts = maintain_uploads(session, storage)
    assert counts["interrupted_uploads"] == 1 and counts["expired_intents"] == 1
    assert current(session, uploading).processing_status == "failed"
    assert list(storage.iter_keys(f"quarantine/{uploading}"))
    assert current(session, unused).processing_status == "expired"
    assert list(storage.iter_keys(f"quarantine/{unused}")) == []


def test_live_lease_is_preserved_and_only_old_unreferenced_attempts_are_removed(spatial, tmp_path):
    _, session = spatial
    storage = FileEvidenceStorage(tmp_path / "private")
    media_id, lease = record(session, storage, state="processing", live=True)
    live = put(storage, f"review/{media_id}/{lease}/asset.jpg", hours_old=2)
    stale = put(storage, f"review/{media_id}/{uuid4()}/asset.jpg", hours_old=2)
    recent = put(storage, f"review/{media_id}/{uuid4()}/asset.jpg")
    counts = maintain_uploads(session, storage)
    assert counts["abandoned_media"] == 0 and counts["orphan_objects"] == 1
    assert set(storage.iter_keys(f"review/{media_id}")) == {live, recent}
    assert stale not in list(storage.iter_keys(f"review/{media_id}"))
    assert current(session, media_id).processing_status == "processing"


def test_attempt_cleanup_keeps_committed_pointers_after_lost_acknowledgement(spatial, tmp_path):
    _, session = spatial
    storage = FileEvidenceStorage(tmp_path / "private")
    media_id, _lease = record(session, storage, ready=True, attached=True)
    media = current(session, media_id)
    stray = put(storage, f"review/{media_id}/{uuid4()}/asset.jpg")
    keys = [media.review_object_key, media.thumbnail_object_key, stray]
    assert cleanup_attempt(session, storage, keys) == 1
    assert set(storage.iter_keys(f"review/{media_id}")) == set(keys[:2])


def test_failed_deletion_does_not_release_the_reservation(spatial, tmp_path, monkeypatch):
    _, session = spatial
    storage = FileEvidenceStorage(tmp_path / "private")
    media_id, _ = record(session, storage)

    def unavailable(_key):
        raise StorageError()

    monkeypatch.setattr(storage, "delete", unavailable)
    counts = maintain_uploads(session, storage)
    assert counts["storage_failures"] >= 1
    media = current(session, media_id)
    assert media.processing_status == "failed" and media.file_size == 23


def test_attempt_cleanup_does_nothing_when_database_cannot_be_checked(tmp_path):
    from sqlalchemy.exc import OperationalError

    storage = FileEvidenceStorage(tmp_path / "private")
    key = put(storage, f"review/{uuid4()}/{uuid4()}/asset.jpg")

    class UnavailableSession:
        def scalars(self, _statement):
            raise OperationalError("", {}, Exception("unavailable"))

        def rollback(self):
            pass

    assert cleanup_attempt(UnavailableSession(), storage, [key]) == 0
    assert list(storage.iter_keys("review")) == [key]

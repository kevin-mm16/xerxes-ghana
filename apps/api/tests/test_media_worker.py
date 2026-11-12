"""Durable job authority, crash recovery and original-byte integrity checks."""

import hashlib
import io
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from PIL import Image
from sqlalchemy import text

from xerxes_api import media_worker
from xerxes_api.evidence_storage import StorageError, get_evidence_storage
from xerxes_api.media_processing import ProcessingError


@pytest.fixture
def queued_upload(spatial, tmp_path, monkeypatch):
    client, session = spatial
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("EVIDENCE_STORAGE_PROVIDER", "filesystem")
    monkeypatch.setenv("EVIDENCE_STORAGE_PATH", str(tmp_path / "private-worker-evidence"))

    def create(payload=None):
        if payload is None:
            output = io.BytesIO()
            exif = Image.Exif()
            exif[315] = "PRIVATE_WORKER_TEST_CREATOR"
            Image.new("RGB", (48, 32), "green").save(output, "JPEG", exif=exif)
            payload = output.getvalue()
        response = client.post(
            "/api/v1/uploads/intents",
            json={
                "filename": "private-worker-test.jpg",
                "contentType": "image/jpeg",
                "fileSize": len(payload),
                "consent": True,
            },
        )
        assert response.status_code == 201, response.text
        intent = response.json()
        uploaded = client.put(
            intent["uploadUrl"],
            content=payload,
            headers={
                "Authorization": "Bearer " + intent["uploadToken"],
                "Content-Type": "application/octet-stream",
            },
        )
        assert uploaded.status_code == 200, uploaded.text
        return SimpleNamespace(
            client=client,
            session=session,
            media_id=UUID(intent["id"]),
            original=payload,
            token=intent["uploadToken"],
        )

    return create


def media(record):
    return (
        record.session.execute(
            text("SELECT * FROM evidence_media WHERE id=:id"), {"id": record.media_id}
        )
        .mappings()
        .one()
    )


def job(record):
    return (
        record.session.execute(
            text("SELECT * FROM media_processing_jobs WHERE media_id=:id"),
            {"id": record.media_id},
        )
        .mappings()
        .one()
    )


def expire_lease(record):
    record.session.execute(
        text(
            "UPDATE media_processing_jobs SET locked_until=now()-interval '1 second' "
            "WHERE media_id=:id"
        ),
        {"id": record.media_id},
    )
    record.session.commit()


def test_review_derivative_stays_private_and_preserves_original_provenance(queued_upload):
    record = queued_upload()
    response = record.client.post(
        "/api/v1/observations",
        json={
            "submissionId": str(uuid4()),
            "description": "Private worker context",
            "manualLocation": "Synthetic approximate landmark",
            "observedAt": datetime.now(UTC).isoformat(),
            "consent": True,
            "media": {"uploadId": str(record.media_id), "uploadToken": record.token},
        },
    )
    assert response.status_code == 201
    observation_id = response.json()["id"]
    claim = media_worker.claim_next_job(record.session)
    assert claim.media_id == record.media_id
    assert job(record)["status"] == "running"
    assert media_worker.claim_next_job(record.session) is None
    media_worker.process_claim(record.session, claim)
    result = media(record)
    assert job(record)["status"] == "succeeded"
    assert job(record)["attempts"] == 1
    assert result["processing_status"] == "review_ready"
    assert result["original_sha256"] == hashlib.sha256(record.original).hexdigest()
    assert result["processing_version"] and result["processed_at"]
    assert result["width"] == 48 and result["height"] == 32
    storage = get_evidence_storage()
    with storage.local_copy(result["original_object_key"]) as original:
        assert original.read_bytes() == record.original
    with storage.local_copy(result["review_object_key"]) as review:
        assert hashlib.sha256(review.read_bytes()).hexdigest() == result["review_sha256"]
        with Image.open(review) as image:
            assert len(image.getexif()) == 0
    with storage.local_copy(result["thumbnail_object_key"]) as thumbnail:
        assert hashlib.sha256(thumbnail.read_bytes()).hexdigest() == result["thumbnail_sha256"]
    assert record.client.get(f"/api/v1/observations/{observation_id}").status_code == 404
    assert record.client.get("/api/v1/map/features?layers=observations").json()["features"] == []
    assert record.session.execute(text("SELECT count(*) FROM public_locations")).scalar() == 0


def test_reclaimed_lease_cannot_publish_or_downgrade_new_worker_outputs(queued_upload):
    record = queued_upload()
    old = media_worker.claim_next_job(record.session)
    expire_lease(record)
    current = media_worker.claim_next_job(record.session)
    assert old.lease_token != current.lease_token
    assert job(record)["attempts"] == 2
    # The slow original worker may finish after a replacement has claimed its job.
    media_worker.process_claim(record.session, old)
    assert job(record)["status"] == "running"
    assert job(record)["lease_token"] == current.lease_token
    assert media(record)["processing_status"] == "processing"
    assert media(record)["review_object_key"] is None
    storage = get_evidence_storage()
    prefix = f"review/{record.media_id}/{old.lease_token}"
    for key in (prefix + "/asset.jpg", prefix + "/thumbnail.jpg"):
        with pytest.raises(StorageError), storage.local_copy(key):
            pass
    media_worker.process_claim(record.session, current)
    assert job(record)["status"] == "succeeded"
    assert str(current.lease_token) in media(record)["review_object_key"]
    media_worker.fail_job(record.session, old, "processing_failed", True)
    assert job(record)["status"] == "succeeded"
    assert media(record)["processing_status"] == "review_ready"


def test_expired_lease_cannot_complete_before_a_replacement_claims_it(queued_upload):
    record = queued_upload()
    expired = media_worker.claim_next_job(record.session)
    expire_lease(record)
    media_worker.process_claim(record.session, expired)
    assert job(record)["status"] == "running"
    assert job(record)["lease_token"] == expired.lease_token
    assert media(record)["processing_status"] == "processing"
    assert media(record)["review_object_key"] is None
    storage = get_evidence_storage()
    prefix = f"review/{record.media_id}/{expired.lease_token}"
    for key in (prefix + "/asset.jpg", prefix + "/thumbnail.jpg"):
        with pytest.raises(StorageError), storage.local_copy(key):
            pass
    replacement = media_worker.claim_next_job(record.session)
    assert replacement.lease_token != expired.lease_token
    media_worker.process_claim(record.session, replacement)
    assert job(record)["status"] == "succeeded"
    assert media(record)["processing_status"] == "review_ready"


def test_failed_thumbnail_storage_cleans_the_attempt_and_allows_a_fresh_retry(
    queued_upload,
    monkeypatch,
):
    record = queued_upload()
    storage = get_evidence_storage()
    written = []

    class BrokenThumbnailStorage:
        def work_directory(self):
            return storage.work_directory()

        def local_copy(self, key):
            return storage.local_copy(key)

        def put_file(self, key, path):
            if key.endswith("/thumbnail.jpg"):
                raise StorageError()
            storage.put_file(key, path)
            written.append(key)

        def delete(self, key):
            storage.delete(key)

    monkeypatch.setattr(media_worker, "get_evidence_storage", BrokenThumbnailStorage)
    failed = media_worker.claim_next_job(record.session)
    media_worker.process_claim(record.session, failed)
    assert len(written) == 1
    assert job(record)["status"] == "queued"
    assert media(record)["processing_error"] == "storage_unavailable"
    assert media(record)["review_object_key"] is None
    for key in (written[0], f"review/{record.media_id}/{failed.lease_token}/thumbnail.jpg"):
        with pytest.raises(StorageError), storage.local_copy(key):
            pass
    monkeypatch.setattr(media_worker, "get_evidence_storage", lambda: storage)
    record.session.execute(
        text(
            "UPDATE media_processing_jobs SET available_at=now()-interval '1 second' "
            "WHERE media_id=:id"
        ),
        {"id": record.media_id},
    )
    record.session.commit()
    replacement = media_worker.claim_next_job(record.session)
    assert replacement.lease_token != failed.lease_token
    media_worker.process_claim(record.session, replacement)
    assert job(record)["status"] == "succeeded"
    assert job(record)["attempts"] == 2
    current = media(record)
    for key in (current["review_object_key"], current["thumbnail_object_key"]):
        with storage.local_copy(key) as path:
            assert path.is_file()


def test_transient_processing_failures_have_bounded_backoff_and_retries(
    queued_upload,
    monkeypatch,
):
    record = queued_upload()

    def unavailable(*_args):
        raise ProcessingError("processor_unavailable", retryable=True)

    monkeypatch.setattr(media_worker, "process_media", unavailable)
    for attempt in range(1, 4):
        claim = media_worker.claim_next_job(record.session)
        assert claim is not None
        media_worker.process_claim(record.session, claim)
        assert job(record)["attempts"] == attempt
        assert media(record)["processing_error"] == "processor_unavailable"
        if attempt < 3:
            assert job(record)["status"] == "queued"
            assert media(record)["processing_status"] == "quarantined"
            assert media_worker.claim_next_job(record.session) is None
            record.session.execute(
                text(
                    "UPDATE media_processing_jobs SET available_at=now()-interval '1 second' "
                    "WHERE media_id=:id"
                ),
                {"id": record.media_id},
            )
            record.session.commit()
    assert job(record)["status"] == "failed"
    assert media(record)["processing_status"] == "failed"
    assert media_worker.claim_next_job(record.session) is None
    assert media(record)["review_object_key"] is None


def test_repeated_worker_crashes_end_in_a_visible_failure(queued_upload):
    record = queued_upload()
    for attempt in range(1, 4):
        assert media_worker.claim_next_job(record.session) is not None
        assert job(record)["attempts"] == attempt
        expire_lease(record)
    assert media_worker.claim_next_job(record.session) is None
    assert job(record)["status"] == "failed"
    assert job(record)["last_error"] == "worker_interrupted"
    assert media(record)["processing_status"] == "failed"
    assert media(record)["review_object_key"] is None


def test_original_integrity_failure_never_produces_a_review_copy(queued_upload):
    record = queued_upload()
    claim = media_worker.claim_next_job(record.session)
    with get_evidence_storage().local_copy(claim.original_key) as original:
        original.write_bytes(record.original + b"synthetic tampering")
    media_worker.process_claim(record.session, claim)
    assert job(record)["status"] == "failed"
    assert job(record)["attempts"] == 1
    assert media(record)["processing_error"] == "integrity_failed"
    assert media(record)["review_object_key"] is None


def test_recognizable_signature_is_not_treated_as_a_valid_image(queued_upload):
    record = queued_upload(b"\xff\xd8\xff" + b"synthetic corrupt JPEG data")
    claim = media_worker.claim_next_job(record.session)
    media_worker.process_claim(record.session, claim)
    assert job(record)["status"] == "failed"
    assert job(record)["attempts"] == 1
    assert media(record)["processing_status"] == "failed"
    assert media(record)["processing_error"] == "invalid_media"
    assert media(record)["review_object_key"] is None

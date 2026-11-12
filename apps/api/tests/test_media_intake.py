"""Real-PostGIS checks for anonymous upload ownership and private media intake."""

import hashlib
import io
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from PIL import Image
from sqlalchemy import text

from xerxes_api import uploads as upload_routes
from xerxes_api.evidence_storage import get_evidence_storage
from xerxes_api.publication import publish_sanitized


@pytest.fixture
def media_api(spatial, tmp_path, monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("EVIDENCE_STORAGE_PROVIDER", "filesystem")
    monkeypatch.setenv("EVIDENCE_STORAGE_PATH", str(tmp_path / "private-evidence"))
    return spatial


@pytest.fixture
def jpeg_bytes():
    output = io.BytesIO()
    image = Image.new("RGB", (32, 24), "forestgreen")
    exif = Image.Exif()
    exif[315] = "PRIVATE_SYNTHETIC_CREATOR"
    image.save(output, "JPEG", exif=exif)
    return output.getvalue()


def create_intent(client, payload, **overrides):
    response = client.post(
        "/api/v1/uploads/intents",
        json={
            "filename": "private-synthetic-evidence.jpg",
            "contentType": "image/jpeg",
            "fileSize": len(payload),
            "consent": True,
            **overrides,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def authorization(intent):
    return {"Authorization": "Bearer " + intent["uploadToken"]}


def upload(client, intent, payload, **headers):
    return client.put(
        intent["uploadUrl"],
        content=payload,
        headers={
            **authorization(intent),
            "Content-Type": "application/octet-stream",
            **headers,
        },
    )


def observation(intent=None, **overrides):
    body = {
        "submissionId": str(uuid4()),
        "title": "Private original title",
        "description": "Private synthetic description",
        "observedAt": datetime.now(UTC).isoformat(),
        "captureLocation": {
            "latitude": 5.5,
            "longitude": -1.5,
            "accuracyMeters": 12,
            "capturedAt": datetime.now(UTC).isoformat(),
            "source": "browser-geolocation",
        },
        "consent": True,
    }
    if intent:
        body["media"] = {"uploadId": intent["id"], "uploadToken": intent["uploadToken"]}
    return {**body, **overrides}


def media_row(session, identifier):
    return (
        session.execute(text("SELECT * FROM evidence_media WHERE id=:id"), {"id": UUID(identifier)})
        .mappings()
        .one()
    )


def assert_private_status(response, intent):
    assert response.status_code == 200, response.text
    data = response.json()
    assert set(data) <= {"id", "processingStatus", "mediaKind", "errorCode"}
    assert data["id"] == intent["id"]
    for forbidden in (
        intent["uploadToken"],
        "private-synthetic-evidence.jpg",
        "PRIVATE_SYNTHETIC_CREATOR",
        "originalObjectKey",
        "reviewObjectKey",
        "thumbnailObjectKey",
        "sha256",
        "captureLocation",
        "accuracyMeters",
    ):
        assert forbidden not in response.text
    assert response.headers["Cache-Control"] == "no-store"
    return data


def test_intent_returns_scoped_capability_without_storage_details(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    assert UUID(intent["id"])
    assert intent["uploadUrl"] == f"/api/v1/uploads/{intent['id']}/content"
    assert len(intent["uploadToken"]) >= 32
    assert intent["maxBytes"] == 10 * 1024 * 1024
    assert datetime.fromisoformat(intent["expiresAt"]) > datetime.now(UTC)
    row = media_row(session, intent["id"])
    assert row["processing_status"] == "awaiting_upload"
    assert row["upload_token_hash"] != intent["uploadToken"]
    assert len(row["upload_token_hash"]) == 64
    assert "originalObjectKey" not in intent and "originalFilename" not in intent
    status = client.get(f"/api/v1/uploads/{intent['id']}", headers=authorization(intent))
    assert_private_status(status, intent)


@pytest.mark.parametrize(
    "patch",
    [
        {"filename": "evidence.html", "contentType": "text/html"},
        {"filename": "evidence.jpg.exe"},
        {"filename": "../evidence.jpg"},
        {"filename": "nested\\evidence.jpg"},
        {"contentType": "image/png"},
        {"fileSize": 0},
        {"fileSize": True},
        {"fileSize": "100"},
        {"fileSize": 10 * 1024 * 1024 + 1},
        {"consent": False},
    ],
)
def test_invalid_intent_never_reserves_storage(media_api, jpeg_bytes, patch):
    client, session = media_api
    response = client.post(
        "/api/v1/uploads/intents",
        json={
            "filename": "evidence.jpg",
            "contentType": "image/jpeg",
            "fileSize": len(jpeg_bytes),
            "consent": True,
            **patch,
        },
    )
    assert response.status_code in {413, 422}
    assert session.execute(text("SELECT count(*) FROM evidence_media")).scalar() == 0


def test_status_and_upload_require_the_correct_capability(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    for headers in ({}, {"Authorization": "Bearer incorrect-token"}):
        assert client.get(f"/api/v1/uploads/{intent['id']}", headers=headers).status_code == 404
        assert (
            client.put(
                intent["uploadUrl"],
                content=jpeg_bytes,
                headers={**headers, "Content-Type": "application/octet-stream"},
            ).status_code
            == 404
        )
    assert (
        client.get(
            f"/api/v1/uploads/{uuid4()}", headers={"Authorization": "Bearer incorrect-token"}
        ).status_code
        == 404
    )
    assert media_row(session, intent["id"])["processing_status"] == "awaiting_upload"
    assert session.execute(text("SELECT count(*) FROM media_processing_jobs")).scalar() == 0


def test_upload_permissions_are_not_accepted_in_urls(media_api, jpeg_bytes):
    client, _ = media_api
    intent = create_intent(client, jpeg_bytes)
    query = {"uploadToken": intent["uploadToken"]}
    assert client.get(f"/api/v1/uploads/{intent['id']}", params=query).status_code == 400
    assert (
        client.put(
            intent["uploadUrl"],
            params=query,
            content=jpeg_bytes,
            headers={"Content-Type": "application/octet-stream"},
        ).status_code
        == 400
    )


def test_upload_declarations_have_an_independent_body_limit(media_api):
    client, session = media_api
    response = client.post(
        "/api/v1/uploads/intents",
        content=b" " * 16385,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert session.execute(text("SELECT count(*) FROM evidence_media")).scalar() == 0


def test_expiry_is_disclosed_only_to_the_upload_capability_holder(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    session.execute(
        text("UPDATE evidence_media SET expires_at=now()-interval '1 second' WHERE id=:id"),
        {"id": UUID(intent["id"])},
    )
    session.commit()
    assert (
        client.get(
            f"/api/v1/uploads/{intent['id']}", headers={"Authorization": "Bearer wrong-token"}
        ).status_code
        == 404
    )
    assert (
        client.get(f"/api/v1/uploads/{intent['id']}", headers=authorization(intent)).status_code
        == 410
    )
    assert upload(client, intent, jpeg_bytes).status_code == 410


def test_upload_persists_original_hash_and_queues_exactly_one_job(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    result = upload(client, intent, jpeg_bytes)
    data = assert_private_status(result, intent)
    assert data["processingStatus"] == "quarantined" and data["mediaKind"] == "image"
    row = media_row(session, intent["id"])
    assert row["file_size"] == len(jpeg_bytes)
    assert row["original_sha256"] == hashlib.sha256(jpeg_bytes).hexdigest()
    assert row["detected_mime_type"] == "image/jpeg"
    with get_evidence_storage().local_copy(row["original_object_key"]) as path:
        assert path.read_bytes() == jpeg_bytes
    assert session.execute(text("SELECT count(*) FROM media_processing_jobs")).scalar() == 1
    # A replay cannot replace bytes that have already passed the intake boundary.
    replay = upload(client, intent, jpeg_bytes[::-1])
    assert_private_status(replay, intent)
    with get_evidence_storage().local_copy(row["original_object_key"]) as path:
        assert path.read_bytes() == jpeg_bytes
    assert session.execute(text("SELECT count(*) FROM media_processing_jobs")).scalar() == 1


def test_an_in_progress_upload_cannot_be_overwritten(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    session.execute(
        text("UPDATE evidence_media SET processing_status='uploading' WHERE id=:id"),
        {"id": UUID(intent["id"])},
    )
    session.commit()
    assert upload(client, intent, jpeg_bytes).status_code == 409
    assert session.execute(text("SELECT count(*) FROM media_processing_jobs")).scalar() == 0


@pytest.mark.parametrize("difference", [-1, 1])
def test_declared_length_must_match_received_bytes(media_api, jpeg_bytes, difference):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes, fileSize=len(jpeg_bytes) + difference)
    response = upload(client, intent, jpeg_bytes)
    assert response.status_code in {400, 413, 422}
    assert session.execute(text("SELECT count(*) FROM media_processing_jobs")).scalar() == 0


def test_signature_mismatch_is_not_queued_for_review(media_api):
    client, session = media_api
    image = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(image, "PNG")
    payload = image.getvalue()
    intent = create_intent(client, payload)
    assert upload(client, intent, payload).status_code == 422
    assert media_row(session, intent["id"])["processing_status"] == "failed"
    assert session.execute(text("SELECT count(*) FROM media_processing_jobs")).scalar() == 0


def test_only_a_completed_owned_upload_can_attach_to_an_observation(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    body = observation(intent)
    assert client.post("/api/v1/observations", json=body).status_code == 409
    assert session.execute(text("SELECT count(*) FROM observations")).scalar() == 0
    assert upload(client, intent, jpeg_bytes).status_code == 200
    forged = observation(intent)
    forged["media"]["uploadToken"] = "x" * 43
    assert client.post("/api/v1/observations", json=forged).status_code == 404
    assert session.execute(text("SELECT count(*) FROM observations")).scalar() == 0
    # The client cannot choose a media kind different from the received signature.
    body["mediaType"] = "video"
    response = client.post("/api/v1/observations", json=body)
    assert response.status_code == 201, response.text
    receipt = response.json()
    assert receipt["media"]["id"] == intent["id"]
    assert receipt["media"]["mediaKind"] == "image"
    row = session.execute(
        text("SELECT media_type FROM observations WHERE id=:id"), {"id": UUID(receipt["id"])}
    ).one()
    assert row.media_type == "image"
    assert media_row(session, intent["id"])["observation_id"] == UUID(receipt["id"])
    assert client.post("/api/v1/observations", json=observation(intent)).status_code == 409
    assert session.execute(text("SELECT count(*) FROM observations")).scalar() == 1


def test_submission_retry_cannot_duplicate_or_change_an_observation(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    assert upload(client, intent, jpeg_bytes).status_code == 200
    body = observation(intent)
    first = client.post("/api/v1/observations", json=body)
    again = client.post("/api/v1/observations", json=body)
    assert first.status_code == again.status_code == 201
    assert first.json()["id"] == again.json()["id"]
    assert session.execute(text("SELECT count(*) FROM observations")).scalar() == 1
    changed = client.post(
        "/api/v1/observations", json={**body, "description": "Changed after submission"}
    )
    assert changed.status_code == 409
    assert session.execute(text("SELECT count(*) FROM observations")).scalar() == 1


def test_media_and_processing_failures_remain_private(media_api, jpeg_bytes):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    assert upload(client, intent, jpeg_bytes).status_code == 200
    response = client.post("/api/v1/observations", json=observation(intent))
    assert response.status_code == 201
    receipt = response.json()
    session.execute(
        text(
            "UPDATE evidence_media SET processing_status='failed',processing_error='invalid_media' "
            "WHERE id=:id"
        ),
        {"id": UUID(intent["id"])},
    )
    session.commit()
    status = assert_private_status(
        client.get(f"/api/v1/uploads/{intent['id']}", headers=authorization(intent)), intent
    )
    assert status["processingStatus"] == "failed" and status["errorCode"] == "invalid_media"
    assert client.get(f"/api/v1/observations/{receipt['id']}").status_code == 404
    assert client.get("/api/v1/map/features?layers=observations").json()["features"] == []
    # There is no public or capability-based raw/review download endpoint.
    assert client.get(intent["uploadUrl"], headers=authorization(intent)).status_code in {404, 405}
    for suffix in ("original", "review", "thumbnail"):
        assert client.get(f"/api/v1/uploads/{intent['id']}/{suffix}").status_code == 404
    with pytest.raises(ValueError, match="media"):
        publish_sanitized(session, UUID(receipt["id"]), "Public title", "Public summary")
    assert client.get(f"/api/v1/observations/{receipt['id']}").status_code == 404


def test_pending_upload_budget_is_bounded(media_api, jpeg_bytes):
    client, session = media_api
    for _ in range(32):
        create_intent(client, jpeg_bytes)
    response = client.post(
        "/api/v1/uploads/intents",
        json={
            "filename": "evidence.jpg",
            "contentType": "image/jpeg",
            "fileSize": len(jpeg_bytes),
            "consent": True,
        },
    )
    assert response.status_code == 429
    assert session.execute(text("SELECT count(*) FROM evidence_media")).scalar() == 32


@pytest.mark.parametrize("state", ["uploading", "failed"])
def test_original_storage_reservation_survives_permission_expiry(
    media_api,
    jpeg_bytes,
    tmp_path,
    monkeypatch,
    state,
):
    client, session = media_api
    intent = create_intent(client, jpeg_bytes)
    row = media_row(session, intent["id"])
    storage = get_evidence_storage()
    source = tmp_path / "interrupted-original.jpg"
    source.write_bytes(jpeg_bytes)
    storage.put_file(row["original_object_key"], source)
    # Simulate a file commit followed by an interrupted database finalization:
    # bytes exist although file_size was never saved and permission has expired.
    session.execute(
        text(
            "UPDATE evidence_media SET processing_status=:state,file_size=NULL,"
            "expires_at=now()-interval '1 second' WHERE id=:id"
        ),
        {"state": state, "id": UUID(intent["id"])},
    )
    session.commit()
    reservation = len(jpeg_bytes) + 3 * (upload_routes.IMAGE_LIMIT + 2 * 1024**2)
    monkeypatch.setattr(upload_routes, "MAX_RESERVED_BYTES", reservation + 1)
    response = client.post(
        "/api/v1/uploads/intents",
        json={
            "filename": "another.jpg",
            "contentType": "image/jpeg",
            "fileSize": len(jpeg_bytes),
            "consent": True,
        },
    )
    assert response.status_code == 429
    assert session.execute(text("SELECT count(*) FROM evidence_media")).scalar() == 1
    with storage.local_copy(row["original_object_key"]) as original:
        assert original.read_bytes() == jpeg_bytes

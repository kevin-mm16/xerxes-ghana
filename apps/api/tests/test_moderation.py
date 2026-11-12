"""Authenticated real-PostGIS lifecycle, deliberate geography and privacy isolation."""

import io
import json
import secrets
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from PIL import Image
from sqlalchemy import text

from xerxes_api.auth import PASSWORD_HASH
from xerxes_api.auth_models import Reviewer
from xerxes_api.media_worker import claim_next_job, process_claim
from xerxes_api.moderation_models import ObservationReview
from xerxes_api.public_media import claim_public_job, process_public_claim

ORIGIN = "http://localhost:3000"
PRIVATE_DESCRIPTION = "PRIVATE_INTAKE_SENTINEL_NEVER_PUBLIC"
PRIVATE_NOTE = "PRIVATE_REVIEWER_NOTE_SENTINEL"
CAPTURE = [5.543219, -1.567891]


@pytest.fixture
def review_api(spatial, monkeypatch, tmp_path):
    client, session = spatial
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("APP_PUBLIC_ORIGINS", ORIGIN)
    monkeypatch.setenv("EVIDENCE_STORAGE_PATH", str(tmp_path / "original-private"))
    monkeypatch.setenv("PUBLIC_MEDIA_STORAGE_PATH", str(tmp_path / "public-derivatives"))
    password = secrets.token_urlsafe(24)
    reviewer = Reviewer(
        username="lifecycle-" + uuid4().hex,
        role="moderator",
        active=True,
        password_hash=PASSWORD_HASH.hash(password),
    )
    session.add(reviewer)
    session.commit()
    login = client.post(
        "/api/v1/auth/login",
        json={"username": reviewer.username, "password": password},
        headers={"Origin": ORIGIN},
    )
    assert login.status_code == 200, login.text
    headers = {"Origin": ORIGIN, "X-CSRF-Token": login.json()["csrfToken"]}
    return client, session, reviewer, headers


def create(client, *, media=None):
    now = datetime.now(UTC).isoformat()
    result = client.post(
        "/api/v1/observations",
        json={
            "title": "Private original title",
            "description": PRIVATE_DESCRIPTION,
            "observedAt": now,
            "consent": True,
            "captureLocation": {
                "latitude": CAPTURE[0],
                "longitude": CAPTURE[1],
                "accuracyMeters": 17,
                "capturedAt": now,
                "source": "browser-geolocation",
            },
            **({"media": media} if media else {}),
        },
    )
    assert result.status_code == 201, result.text
    return result.json()["id"]


def command(api, identifier, action, body=None):
    client, _, _, headers = api
    return client.post(
        f"/api/v1/moderation/observations/{identifier}/{action}",
        json={} if body is None else body,
        headers=headers,
    )


def draft(media="exclude", **patch):
    return {
        "sanitizedTitle": "Reviewed synthetic environmental observation",
        "sanitizedSummary": "Synthetic public summary without contributor details.",
        "mediaDecision": media,
        "publicLocationPolicy": "grid",
        "privacyChecklist": {
            "summaryReviewed": True,
            "locationReviewed": True,
            "identifiersClear": True,
        },
        **patch,
    }


def locate(api, identifier, coordinates=None):
    return command(
        api,
        identifier,
        "location",
        {
            "geometry": {"type": "Point", "coordinates": coordinates or [-1.6, 5.7]},
            "reason": PRIVATE_NOTE,
        },
    )


@pytest.mark.parametrize(
    "method,suffix,body",
    [
        ("GET", "", None),
        ("GET", "/00000000-0000-0000-0000-000000000001", None),
        ("POST", "/00000000-0000-0000-0000-000000000001/assign", {}),
        (
            "POST",
            "/00000000-0000-0000-0000-000000000001/location",
            {"geometry": {"type": "Point", "coordinates": [-1.6, 5.7]}, "reason": "review"},
        ),
        ("POST", "/00000000-0000-0000-0000-000000000001/draft", draft()),
        ("POST", "/00000000-0000-0000-0000-000000000001/decision", {"decision": "approve"}),
        ("POST", "/00000000-0000-0000-0000-000000000001/prepare-media", {}),
        ("POST", "/00000000-0000-0000-0000-000000000001/publish", {}),
        ("POST", "/00000000-0000-0000-0000-000000000001/withdraw", {}),
        ("GET", "/00000000-0000-0000-0000-000000000001/public-location", None),
        ("GET", "/00000000-0000-0000-0000-000000000001/media/review", None),
        ("HEAD", "/00000000-0000-0000-0000-000000000001/media/original", None),
    ],
)
def test_all_moderation_entrypoints_require_server_auth(spatial, method, suffix, body):
    client, _ = spatial
    response = client.request(method, "/api/v1/moderation/observations" + suffix, json=body)
    assert response.status_code == 401


def test_queue_omits_capture_detail_and_assignment_csrf_are_enforced(review_api):
    client, session, reviewer, _ = review_api
    identifier = create(client)
    queue = client.get("/api/v1/moderation/observations").json()
    assert queue["total"] == 1 and queue["items"][0]["reviewStatus"] == "pending"
    assert PRIVATE_DESCRIPTION not in json.dumps(queue) and str(CAPTURE[0]) not in json.dumps(queue)
    assert "accuracyMeters" not in json.dumps(queue)
    assert locate(review_api, identifier).status_code == 403
    assert (
        client.post(f"/api/v1/moderation/observations/{identifier}/assign", json={}).status_code
        == 403
    )
    assert command(review_api, identifier, "assign").status_code == 200
    assert session.get(ObservationReview, UUID(identifier)).assignee_id == reviewer.id
    assert (
        command(review_api, identifier, "assign", {"reviewerId": str(uuid4())}).status_code == 403
    )


def test_capture_never_automatically_establishes_activity_or_public_geography(review_api):
    client, _, _, _ = review_api
    identifier = create(client)
    detail = client.get(f"/api/v1/moderation/observations/{identifier}").json()
    assert detail["captureLocation"]["accuracyMeters"] == 17
    assert detail["observationLocation"] is None
    assert command(review_api, identifier, "assign").status_code == 200
    assert command(review_api, identifier, "publish").status_code == 409
    assert command(review_api, identifier, "draft", draft()).status_code == 200
    assert command(review_api, identifier, "decision", {"decision": "approve"}).status_code == 409
    assert client.get(f"/api/v1/observations/{identifier}").status_code == 404


def test_reviewed_location_is_revised_and_metric_grid_generalization_is_testable(review_api):
    client, session, _, _ = review_api
    identifier = create(client)
    assert command(review_api, identifier, "assign").status_code == 200
    assert locate(review_api, identifier).status_code == 200
    assert locate(review_api, identifier, [-1.59, 5.71]).status_code == 200
    assert (
        session.execute(
            text("SELECT count(*) FROM observation_location_revisions WHERE observation_id=:id"),
            {"id": UUID(identifier)},
        ).scalar_one()
        == 2
    )
    preview = client.get(f"/api/v1/moderation/observations/{identifier}/public-location")
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert data["geometry"]["type"] == "Polygon" and data["precisionLevel"] == "grid-2000m"
    metric = session.execute(
        text("""SELECT ST_Area(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(:g),4326),32630))"""),
        {"g": json.dumps(data["geometry"])},
    ).scalar_one()
    assert metric == pytest.approx(4000000, rel=0.001)
    assert str(CAPTURE[0]) not in preview.text and str(CAPTURE[1]) not in preview.text
    for bad in [[181, 5], [-1.5, 91], [0, 0], [-1.5, 5, 9]]:
        assert locate(review_api, identifier, bad).status_code == 422


def test_publish_and_withdraw_are_atomic_and_public_schema_is_allowlisted(review_api):
    client, session, _, _ = review_api
    identifier = create(client)
    assert command(review_api, identifier, "assign").status_code == 200
    assert locate(review_api, identifier).status_code == 200
    assert command(review_api, identifier, "draft", draft(sanitizedSummary="")).status_code == 200
    assert command(review_api, identifier, "decision", {"decision": "approve"}).status_code == 409
    assert command(review_api, identifier, "draft", draft()).status_code == 200
    assert command(review_api, identifier, "decision", {"decision": "approve"}).status_code == 200
    assert client.get(f"/api/v1/observations/{identifier}").status_code == 404
    result = command(review_api, identifier, "publish")
    assert result.status_code == 200, result.text
    record = client.get(f"/api/v1/observations/{identifier}")
    features = client.get("/api/v1/map/features?layers=observations")
    assert record.status_code == 200 and len(features.json()["features"]) == 1
    for forbidden in [
        PRIVATE_DESCRIPTION,
        PRIVATE_NOTE,
        str(CAPTURE[0]),
        str(CAPTURE[1]),
        "accuracyMeters",
        "captureLocation",
        "reviewerId",
        "original_object_key",
        "review_object_key",
    ]:
        assert forbidden not in record.text + features.text
    assert command(review_api, identifier, "draft", draft()).status_code == 409
    assert command(review_api, identifier, "withdraw").status_code == 200
    assert client.get(f"/api/v1/observations/{identifier}").status_code == 404
    assert client.get("/api/v1/map/features?layers=observations").json()["features"] == []
    actions = (
        session.execute(
            text("SELECT action FROM moderation_audit_events WHERE observation_id=:id"),
            {"id": UUID(identifier)},
        )
        .scalars()
        .all()
    )
    assert {"location_changed", "approved", "published", "withdrawn"} <= set(actions)
    assert (
        session.execute(
            text("SELECT count(*) FROM capture_locations WHERE observation_id=:id"),
            {"id": UUID(identifier)},
        ).scalar_one()
        == 1
    )


def test_sanitized_media_lifecycle_never_publishes_original_or_review_object(review_api):
    client, session, _, _ = review_api
    data = io.BytesIO()
    exif = Image.Exif()
    exif[315] = "PRIVATE_EMBEDDED_METADATA_SENTINEL"
    Image.new("RGB", (100, 80), "blue").save(data, "JPEG", exif=exif)
    intent = client.post(
        "/api/v1/uploads/intents",
        json={
            "filename": "PRIVATE_FILENAME_SENTINEL.jpg",
            "contentType": "image/jpeg",
            "fileSize": len(data.getvalue()),
            "consent": True,
        },
    ).json()
    assert (
        client.put(
            intent["uploadUrl"],
            content=data.getvalue(),
            headers={
                "Content-Type": "application/octet-stream",
                "Authorization": "Bearer " + intent["uploadToken"],
            },
        ).status_code
        == 200
    )
    identifier = create(
        client, media={"uploadId": intent["id"], "uploadToken": intent["uploadToken"]}
    )
    claim = claim_next_job(session)
    process_claim(session, claim)
    assert command(review_api, identifier, "assign").status_code == 200
    assert locate(review_api, identifier).status_code == 200
    assert (
        command(
            review_api,
            identifier,
            "draft",
            draft(
                "publish",
                privacyChecklist={
                    "summaryReviewed": True,
                    "locationReviewed": True,
                    "identifiersClear": False,
                },
            ),
        ).status_code
        == 200
    )
    assert command(review_api, identifier, "prepare-media").status_code == 409
    assert command(review_api, identifier, "draft", draft("publish")).status_code == 200
    assert command(review_api, identifier, "prepare-media").status_code == 200
    candidate = client.get(f"/api/v1/moderation/observations/{identifier}").json()["publicMedia"]
    url = f"/api/v1/public-media/{candidate['id']}/asset"
    assert client.get(url).status_code == 404
    assert command(review_api, identifier, "decision", {"decision": "approve"}).status_code == 409
    public_claim = claim_public_job(session)
    process_public_claim(session, public_claim)
    private_review = client.get(f"/api/v1/moderation/observations/{identifier}/media/review")
    assert (
        private_review.status_code == 200 and private_review.headers["content-type"] == "image/jpeg"
    )
    assert (
        client.get(f"/api/v1/moderation/observations/{identifier}/media/original").status_code
        == 403
    )
    assert command(review_api, identifier, "decision", {"decision": "approve"}).status_code == 200
    assert command(review_api, identifier, "publish").status_code == 200
    public = client.get(url)
    assert public.status_code == 200 and public.content != data.getvalue()
    assert b"PRIVATE_EMBEDDED_METADATA_SENTINEL" not in public.content
    info = session.execute(
        text("""SELECT m.public_object_key,e.original_object_key,e.review_object_key
      FROM published_media m JOIN evidence_media e ON e.observation_id=m.observation_id WHERE m.id=:id"""),
        {"id": UUID(candidate["id"])},
    ).one()
    assert len(set(info)) == 3
    record = client.get(f"/api/v1/observations/{identifier}")
    assert record.json()["media"]["url"] == url
    for secret in [intent["uploadToken"], intent["id"], PRIVATE_DESCRIPTION, PRIVATE_NOTE, *info]:
        assert (
            secret not in record.text + client.get("/api/v1/map/features?layers=observations").text
        )
    assert command(review_api, identifier, "withdraw").status_code == 200
    assert client.get(url).status_code == 404
    assert client.get(url.replace("/asset", "/thumbnail")).status_code == 404
    client.cookies.clear()
    assert (
        client.get(f"/api/v1/moderation/observations/{identifier}/media/review").status_code == 401
    )


def test_validation_errors_do_not_echo_password_or_private_input(spatial):
    client, _ = spatial
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "wrong", "password": "PASSWORD_SENTINEL", "extra": "PRIVATE_SENTINEL"},
    )
    assert response.status_code in {403, 422}
    assert "PASSWORD_SENTINEL" not in response.text and "PRIVATE_SENTINEL" not in response.text


def test_high_risk_override_uses_covering_region_and_rejects_missing_coverage(review_api):
    client, _, _, _ = review_api
    identifier = create(client)
    assert command(review_api, identifier, "assign").status_code == 200
    assert locate(review_api, identifier).status_code == 200
    assert (
        command(
            review_api, identifier, "draft", draft(publicLocationPolicy="coverage_region")
        ).status_code
        == 200
    )
    preview = client.get(f"/api/v1/moderation/observations/{identifier}/public-location")
    assert preview.status_code == 200
    assert preview.json()["precisionLevel"] == "coverage-region"
    assert preview.json()["geometry"]["type"] == "MultiPolygon"
    assert (
        command(
            review_api, identifier, "decision", {"decision": "approve", "reason": PRIVATE_NOTE}
        ).status_code
        == 200
    )
    detail = client.get(f"/api/v1/moderation/observations/{identifier}").json()
    assert any(event.get("note") == PRIVATE_NOTE for event in detail["audit"])
    assert all(PRIVATE_NOTE not in json.dumps(event["details"]) for event in detail["audit"])
    assert command(review_api, identifier, "publish").status_code == 200
    assert (
        client.get(f"/api/v1/observations/{identifier}").json()["precisionLevel"]
        == "coverage-region"
    )
    assert command(review_api, identifier, "withdraw").status_code == 200
    assert locate(review_api, identifier, [-1.62, 6.7]).status_code == 200
    assert (
        client.get(f"/api/v1/moderation/observations/{identifier}/public-location").status_code
        == 409
    )


def test_approved_but_missing_reviewed_location_still_cannot_publish(review_api):
    client, session, _, _ = review_api
    identifier = create(client)
    assert command(review_api, identifier, "assign").status_code == 200
    assert command(review_api, identifier, "draft", draft()).status_code == 200
    review = session.get(ObservationReview, UUID(identifier))
    review.review_status = "approved"
    session.commit()
    assert command(review_api, identifier, "publish").status_code == 409
    assert client.get(f"/api/v1/observations/{identifier}").status_code == 404

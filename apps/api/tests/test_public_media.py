"""Distinct derivatives, durable job authority and gated byte-range delivery."""

import hashlib
import io
import json
import os
import secrets
import shutil
import subprocess
from contextlib import contextmanager
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text

from xerxes_api import media_worker, public_media
from xerxes_api.auth import PASSWORD_HASH
from xerxes_api.auth_models import Reviewer
from xerxes_api.evidence_storage import StorageError, get_evidence_storage
from xerxes_api.media_delivery import stream_media
from xerxes_api.models import Observation
from xerxes_api.moderation_models import ObservationReview
from xerxes_api.public_media_models import PublicMediaJob, PublishedMedia
from xerxes_api.public_storage import PublishedFileStorage, get_public_storage


@pytest.fixture
def media_http(tmp_path):
    path = tmp_path / "PRIVATE_FILENAME_SENTINEL.mp4"
    path.write_bytes(b"0123456789" * 20000)
    events = []

    @contextmanager
    def source():
        events.append("opened")
        try:
            yield path
        finally:
            events.append("closed")

    app = FastAPI()

    @app.api_route("/media", methods=["GET", "HEAD"])
    def media(request: Request):
        return stream_media(
            source(),
            "video/mp4",
            request.headers.get("range"),
            "xersxes-video.mp4",
            head=request.method == "HEAD",
        )

    with TestClient(app) as client:
        yield client, events, path


def test_stream_supports_video_ranges_without_private_metadata_headers(media_http):
    client, events, path = media_http
    response = client.get("/media", headers={"Range": "bytes=1000-1999"})
    assert response.status_code == 206
    assert response.content == path.read_bytes()[1000:2000]
    assert response.headers["content-range"] == f"bytes 1000-1999/{path.stat().st_size}"
    assert response.headers["content-length"] == "1000"
    assert response.headers["content-type"] == "video/mp4"
    assert response.headers["accept-ranges"] == "bytes"
    assert "no-store" in response.headers["cache-control"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "PRIVATE_FILENAME_SENTINEL" not in str(response.headers)
    assert "last-modified" not in response.headers and "etag" not in response.headers
    assert events == ["opened", "closed"]


@pytest.mark.parametrize(
    ("range_header", "expected"),
    [("bytes=-5", b"56789"), ("bytes=199995-", b"56789"), ("bytes=199995-999999", b"56789")],
)
def test_stream_supports_suffix_and_bounded_open_ranges(media_http, range_header, expected):
    client, events, _ = media_http
    response = client.get("/media", headers={"Range": range_header})
    assert response.status_code == 206 and response.content == expected
    assert events[-1] == "closed"


@pytest.mark.parametrize(
    "range_header",
    [
        "bytes=200000-",
        "bytes=9-2",
        "bytes=-0",
        "bytes=0-1,5-7",
        "bytes=-",
        "bytes=" + "9" * 200 + "-",
    ],
)
def test_stream_rejects_unsatisfiable_or_unbounded_ranges(media_http, range_header):
    client, events, _ = media_http
    response = client.get("/media", headers={"Range": range_header})
    assert response.status_code == 416
    assert response.headers["content-range"] == "bytes */200000"
    assert "PRIVATE_FILENAME_SENTINEL" not in response.text
    assert events[-1] == "closed"


def test_stream_head_and_complete_delivery_close_provider_copy(media_http):
    client, events, path = media_http
    response = client.head("/media")
    assert response.status_code == 200 and response.content == b""
    assert response.headers["content-length"] == "200000"
    assert events == ["opened", "closed"]
    response = client.get("/media")
    assert response.content == path.read_bytes()
    assert events == ["opened", "closed", "opened", "closed"]


def test_public_storage_has_separate_strict_namespace_and_immutable_bytes(tmp_path):
    storage = PublishedFileStorage(tmp_path / "public")
    source = tmp_path / "source.jpg"
    source.write_bytes(b"sanitized bytes")
    key = f"published/{uuid4()}/{uuid4()}/asset.jpg"
    storage.put_file(key, source)
    source.write_bytes(b"caller source changed")
    with storage.local_copy(key) as path:
        assert path.read_bytes() == b"sanitized bytes"
    with pytest.raises(StorageError, match="storage_conflict"):
        storage.put_file(key, source)
    assert list(storage.iter_keys("published")) == [key]
    for unsafe in [
        "../private",
        "quarantine/x/original",
        "published/../../original",
        key.replace("asset.jpg", "../../secret"),
        key.replace("asset.jpg", "original"),
    ]:
        with pytest.raises(StorageError), storage.local_copy(unsafe):
            pass


def test_public_storage_rejects_production_and_shared_private_root(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(StorageError):
        get_public_storage()
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("EVIDENCE_STORAGE_PATH", str(tmp_path / "private"))
    monkeypatch.setenv("PUBLIC_MEDIA_STORAGE_PATH", str(tmp_path / "private" / "public"))
    with pytest.raises(StorageError):
        get_public_storage()


@pytest.fixture
def candidate_factory(spatial, tmp_path, monkeypatch):
    client, session = spatial
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("EVIDENCE_STORAGE_PATH", str(tmp_path / "private"))
    monkeypatch.setenv("PUBLIC_MEDIA_STORAGE_PATH", str(tmp_path / "published"))
    reviewer = Reviewer(
        username="media-" + uuid4().hex,
        password_hash=PASSWORD_HASH.hash(secrets.token_urlsafe(24)),
        role="moderator",
        active=True,
    )
    session.add(reviewer)
    session.flush()
    reviewer_id = reviewer.id
    session.commit()

    def create(payload=None, mime="image/jpeg", process_private=True):
        if payload is None:
            data = io.BytesIO()
            exif = Image.Exif()
            exif[315] = "PRIVATE_PUBLIC_MEDIA_CREATOR_SENTINEL"
            Image.new("RGB", (120, 80), "green").save(data, "JPEG", exif=exif)
            payload = data.getvalue()
        intent = client.post(
            "/api/v1/uploads/intents",
            json={
                "filename": "PRIVATE_ORIGINAL_FILENAME.jpg"
                if mime == "image/jpeg"
                else "PRIVATE_ORIGINAL_FILENAME.mp4",
                "contentType": mime,
                "fileSize": len(payload),
                "consent": True,
            },
        )
        assert intent.status_code == 201, intent.text
        permission = intent.json()
        uploaded = client.put(
            permission["uploadUrl"],
            content=payload,
            headers={
                "Content-Type": "application/octet-stream",
                "Authorization": "Bearer " + permission["uploadToken"],
            },
        )
        assert uploaded.status_code == 200, uploaded.text
        observation = client.post(
            "/api/v1/observations",
            json={
                "description": "PRIVATE_PUBLIC_MEDIA_CONTEXT_SENTINEL",
                "manualLocation": "Private synthetic area",
                "observedAt": datetime.now(UTC).isoformat(),
                "consent": True,
                "media": {"uploadId": permission["id"], "uploadToken": permission["uploadToken"]},
            },
        )
        assert observation.status_code == 201, observation.text
        record = SimpleNamespace(
            client=client,
            session=session,
            observation_id=UUID(observation.json()["id"]),
            private_media_id=UUID(permission["id"]),
            reviewer_id=reviewer_id,
            original=payload,
        )
        if process_private:
            claim = media_worker.claim_next_job(session)
            media_worker.process_claim(session, claim)
            state = session.execute(
                text("SELECT processing_status FROM evidence_media WHERE id=:id"),
                {"id": record.private_media_id},
            ).scalar_one()
            assert state == "review_ready"
        return record

    return create


def ready_candidate(record):
    entry = public_media.prepare_public_derivative(
        record.session, record.observation_id, record.reviewer_id
    )
    record.session.commit()
    record.public_id = entry.id
    claim = public_media.claim_public_job(record.session)
    assert claim.media_id == record.public_id
    public_media.process_public_claim(record.session, claim)
    record.session.expire_all()
    entry = record.session.get(PublishedMedia, record.public_id)
    assert entry.processing_status == "ready", entry.processing_error
    return entry


def test_review_ready_is_required_before_public_candidate_can_be_queued(candidate_factory):
    record = candidate_factory(process_private=False)
    with pytest.raises(HTTPException) as error:
        public_media.prepare_public_derivative(
            record.session, record.observation_id, record.reviewer_id
        )
    assert error.value.status_code == 409
    assert record.session.execute(text("SELECT count(*) FROM published_media")).scalar_one() == 0


def test_public_candidate_is_distinct_metadata_stripped_and_inaccessible_before_publication(
    candidate_factory,
):
    record = candidate_factory()
    entry = ready_candidate(record)
    private = (
        record.session.execute(
            text("SELECT * FROM evidence_media WHERE id=:id"), {"id": record.private_media_id}
        )
        .mappings()
        .one()
    )
    assert entry.public_object_key not in {
        private["original_object_key"],
        private["review_object_key"],
    }
    assert entry.sha256 != private["original_sha256"]
    assert entry.source_review_sha256 == private["review_sha256"]
    assert entry.certified_by == record.reviewer_id and entry.certified_at
    assert entry.publication_version.startswith("xersxes-public-media-v1")
    with get_evidence_storage().local_copy(private["original_object_key"]) as path:
        assert path.read_bytes() == record.original
    with get_public_storage().local_copy(entry.public_object_key) as path:
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == entry.sha256
        assert b"PRIVATE_PUBLIC_MEDIA_CREATOR_SENTINEL" not in data
        with Image.open(path) as image:
            assert image.format == "JPEG" and len(image.getexif()) == 0
            assert "icc_profile" not in image.info
    with pytest.raises(HTTPException) as error:
        public_media.stream_published_media(record.session, entry.id)
    assert error.value.status_code == 404
    assert record.client.get(f"/api/v1/observations/{record.observation_id}").status_code == 404
    assert record.client.get("/api/v1/map/features?layers=observations").json()["features"] == []
    assert (
        record.session.query(PublicMediaJob).filter_by(media_id=entry.id).one().status
        == "succeeded"
    )


def test_public_worker_rejects_changed_review_content_and_retains_private_original(
    candidate_factory,
):
    record = candidate_factory()
    entry = public_media.prepare_public_derivative(
        record.session, record.observation_id, record.reviewer_id
    )
    record.session.commit()
    claim = public_media.claim_public_job(record.session)
    with get_evidence_storage().local_copy(claim.review_key) as review:
        review.write_bytes(b"review bytes altered after certification")
    public_media.process_public_claim(record.session, claim)
    record.session.expire_all()
    entry = record.session.get(PublishedMedia, entry.id)
    assert entry.processing_status == "failed" and entry.processing_error == "integrity_failed"
    assert entry.public_object_key is None
    assert list(get_public_storage().iter_keys("published")) == []


def test_public_delivery_rechecks_publication_on_get_head_range_and_withdrawal(candidate_factory):
    record = candidate_factory()
    entry = ready_candidate(record)
    app = FastAPI()

    @app.api_route("/media/{variant}", methods=["GET", "HEAD"])
    def asset(variant: str, request: Request):
        return public_media.stream_published_media(
            record.session,
            entry.id,
            variant,
            request.headers.get("range"),
            head=request.method == "HEAD",
        )

    with TestClient(app) as client:
        assert client.get("/media/asset").status_code == 404
        assert client.get("/media/thumbnail").status_code == 404
        review = record.session.get(ObservationReview, record.observation_id)
        if review is None:
            review = ObservationReview(observation_id=record.observation_id)
            record.session.add(review)
        review.review_status, review.publication_status = "approved", "published"
        review.media_decision = "publish"
        review.sanitized_title, review.sanitized_summary = (
            "Safe public title",
            "Sanitized public summary",
        )
        review.summary_reviewed = review.location_reviewed = review.identifiers_clear = True
        record.session.get(Observation, record.observation_id).status = "approved"
        record.session.execute(
            text("""
            INSERT INTO public_locations(observation_id,geometry,label,precision_level,title,description)
            SELECT :id,geometry,'Synthetic generalized area','coverage-region',
              'Safe public title','Sanitized public summary' FROM coverage_regions LIMIT 1
            ON CONFLICT (observation_id) DO NOTHING
        """),
            {"id": record.observation_id},
        )
        record.session.commit()
        full = client.get("/media/asset")
        assert full.status_code == 200 and full.headers["content-type"] == "image/jpeg"
        assert "no-store" in full.headers["cache-control"]
        assert b"PRIVATE_PUBLIC_MEDIA_CREATOR_SENTINEL" not in full.content
        partial = client.get("/media/asset", headers={"Range": "bytes=0-2"})
        assert partial.status_code == 206 and partial.content == full.content[:3]
        assert client.head("/media/asset").status_code == 200
        assert client.get("/media/thumbnail").status_code == 200
        review.publication_status = "withdrawn"
        record.session.commit()
        assert client.get("/media/asset").status_code == 404
        assert client.get("/media/asset", headers={"Range": "bytes=0-2"}).status_code == 404
        assert client.head("/media/asset").status_code == 404
        assert client.get("/media/thumbnail").status_code == 404
        assert (
            record.session.execute(
                text("SELECT count(*) FROM evidence_media WHERE id=:id"),
                {"id": record.private_media_id},
            ).scalar_one()
            == 1
        )
        assert (
            record.session.execute(
                text(
                    "SELECT count(*) FROM moderation_audit_events WHERE observation_id=:id AND action='public_derivative_created'"
                ),
                {"id": record.observation_id},
            ).scalar_one()
            == 1
        )


def test_expired_public_worker_cannot_replace_current_derivative(candidate_factory):
    record = candidate_factory()
    entry = public_media.prepare_public_derivative(
        record.session, record.observation_id, record.reviewer_id
    )
    record.session.commit()
    old = public_media.claim_public_job(record.session)
    record.session.execute(
        text(
            "UPDATE public_media_jobs SET locked_until=now()-interval '1 second' WHERE media_id=:id"
        ),
        {"id": entry.id},
    )
    record.session.commit()
    current = public_media.claim_public_job(record.session)
    assert old.lease_token != current.lease_token
    public_media.process_public_claim(record.session, old)
    record.session.expire_all()
    assert record.session.get(PublishedMedia, entry.id).processing_status == "processing"
    assert list(get_public_storage().iter_keys(f"published/{entry.id}/{old.lease_token}")) == []
    public_media.process_public_claim(record.session, current)
    record.session.expire_all()
    completed = record.session.get(PublishedMedia, entry.id)
    assert completed.processing_status == "ready"
    assert str(current.lease_token) in completed.public_object_key
    public_media.fail_public_job(record.session, old, "processing_failed", True)
    assert record.session.get(PublishedMedia, entry.id).processing_status == "ready"


def test_actual_video_public_derivative_reencodes_certified_review_and_strips_source_tags(
    candidate_factory, tmp_path
):
    binary = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg")
    probe = os.environ.get("FFPROBE_PATH") or shutil.which("ffprobe")
    if not binary or not probe:
        pytest.skip("FFmpeg and ffprobe required for real public-video processing")
    source = tmp_path / "synthetic.mp4"
    subprocess.run(
        [
            binary,
            "-nostdin",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=green:s=128x96:r=10:d=1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-threads",
            "1",
            "-metadata",
            "title=PRIVATE_PUBLIC_VIDEO_SENTINEL",
            str(source),
        ],
        check=True,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        timeout=20,
    )
    record = candidate_factory(source.read_bytes(), "video/mp4")
    entry = ready_candidate(record)
    assert entry.media_kind == "video" and entry.mime_type == "video/mp4"
    assert 0 < entry.duration_seconds <= 2
    with get_public_storage().local_copy(entry.public_object_key) as path:
        tags = subprocess.run(
            [
                probe,
                "-v",
                "error",
                "-show_entries",
                "format_tags:stream_tags",
                "-of",
                "json",
                str(path),
            ],
            check=True,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            timeout=10,
        )
        assert "PRIVATE_PUBLIC_VIDEO_SENTINEL" not in json.dumps(json.loads(tags.stdout))
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry.sha256
    with (
        get_public_storage().local_copy(entry.thumbnail_object_key) as path,
        Image.open(path) as image,
    ):
        assert image.format == "JPEG" and len(image.getexif()) == 0

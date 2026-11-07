"""Real spatial boundaries, persistence, and public/private separation."""

from datetime import UTC, datetime
from uuid import UUID

import pytest
from alembic import command
from sqlalchemy import text

from xerxes_api.publication import publish_sanitized


def capture(latitude=5.5, longitude=-1.5, accuracy=10):
    return {
        "latitude": latitude,
        "longitude": longitude,
        "accuracyMeters": accuracy,
        "capturedAt": datetime.now(UTC).isoformat(),
        "source": "browser-geolocation",
    }


def intake(**overrides):
    return {
        "title": "Private original title",
        "description": "Private unsanitized context",
        "observedAt": datetime.now(UTC).isoformat(),
        "captureLocation": capture(),
        "consent": True,
        **overrides,
    }


def test_coverage_read(spatial):
    client, _ = spatial
    data = client.get("/api/v1/coverage").json()
    assert data["type"] == "FeatureCollection"
    feature = data["features"][0]
    assert feature["geometry"]["type"] == "MultiPolygon"
    assert feature["properties"]["code"] == "GHA-XER-T001"
    assert feature["properties"]["isDemo"] is True
    assert client.get("/api/v1/coverage/" + feature["id"]).status_code == 200


@pytest.mark.parametrize(
    "lat,lng,accuracy,inside,state",
    [
        (5.5, -1.5, 10, True, "inside"),
        (7, -3, 10, False, "outside"),
        (5.5, -2, 0, True, "uncertain"),
        (5.5, -1.99995, 20, True, "uncertain"),
        (5.5, -2.00005, 20, False, "uncertain"),
        (5.5, -1.99, 1, True, "inside"),
    ],
)
def test_spatial_check(spatial, lat, lng, accuracy, inside, state):
    client, _ = spatial
    response = client.post("/api/v1/coverage/check", json=capture(lat, lng, accuracy))
    assert response.status_code == 200
    data = response.json()
    assert data["insideCoverage"] is inside
    assert data["state"] == state
    assert data["boundaryAmbiguous"] is (state == "uncertain")
    assert bool(data["matchedRegions"]) is inside
    assert "latitude" not in response.text and "longitude" not in response.text


@pytest.mark.parametrize(
    "patch",
    [
        {"latitude": 91},
        {"longitude": -181},
        {"accuracyMeters": -1},
        {"accuracyMeters": 10001},
        {"capturedAt": "2026-01-01"},
        {"source": "invented"},
    ],
)
def test_invalid_capture(spatial, patch):
    client, _ = spatial
    assert client.post("/api/v1/coverage/check", json={**capture(), **patch}).status_code == 422


def test_pending_intake_is_private_and_publication_is_independent(spatial):
    client, session = spatial
    response = client.post("/api/v1/observations", json=intake())
    assert response.status_code == 201
    identifier = response.json()["id"]
    assert response.json()["status"] == "pending"
    assert "capture" not in response.text.lower()
    assert client.get("/api/v1/observations/" + identifier).status_code == 404
    assert client.get("/api/v1/map/features?layers=observations").json()["features"] == []
    row = session.execute(
        text(
            "SELECT ST_X(geometry),ST_Y(geometry),accuracy_meters,source "
            "FROM capture_locations WHERE observation_id=:id"
        ),
        {"id": UUID(identifier)},
    ).one()
    assert tuple(row) == (-1.5, 5.5, 10.0, "browser-geolocation")
    publish_sanitized(session, UUID(identifier), "Reviewed public title", "Sanitized summary")
    session.commit()
    public = client.get("/api/v1/observations/" + identifier)
    assert public.status_code == 200
    data = public.json()
    assert data["title"] == "Reviewed public title"
    assert data["description"] == "Sanitized summary"
    assert data["publicLocation"]["type"] == "MultiPolygon"
    assert data["precisionLevel"] == "coverage-region"
    for forbidden in [
        "captureLocation",
        "accuracyMeters",
        "capturedAt",
        "Private original",
        "Private unsanitized",
        "manualLocation",
    ]:
        assert forbidden not in public.text
    features = client.get("/api/v1/map/features?layers=observations").json()["features"]
    assert len(features) == 1
    assert features[0]["properties"]["reviewState"] == "approved"
    assert features[0]["geometry"] == data["publicLocation"]


def test_manual_location_and_server_assignment(spatial):
    client, session = spatial
    response = client.post(
        "/api/v1/observations",
        json=intake(captureLocation=None, manualLocation="Approximate landmark"),
    )
    assert response.status_code == 201
    assert response.json()["coverageState"] == "manual"
    assert session.execute(text("SELECT count(*) FROM capture_locations")).scalar() == 0
    assert (
        client.post(
            "/api/v1/observations",
            json=intake(coverageRegionId="00000000-0000-0000-0000-000000000000"),
        ).status_code
        == 422
    )
    assert client.post("/api/v1/observations", json=intake(status="approved")).status_code == 422


def test_map_bounds_filters_and_private_status(spatial):
    client, _ = spatial
    assert client.get("/api/v1/map/features?bbox=0,0,1,1").json()["features"] == []
    assert len(client.get("/api/v1/map/features?bbox=-3,4,0,7").json()["features"]) == 1
    for query in [
        "bbox=nan,0,1,2",
        "bbox=2,1,0,0",
        "layers=private",
        "status=pending",
        "confidence_min=2",
        "limit=10001",
        "from=2026-01-02T00:00:00Z&to=2026-01-01T00:00:00Z",
    ]:
        assert client.get("/api/v1/map/features?" + query).status_code == 422
    assert client.get("/api/v1/map/features?layers=ai,satellite").json()["features"] == []


def test_expired_coverage_not_eligible(spatial):
    client, session = spatial
    session.execute(text("UPDATE coverage_regions SET valid_to='2021-01-01T00:00:00Z'"))
    session.commit()
    assert client.get("/api/v1/coverage").json()["features"] == []
    assert client.post("/api/v1/coverage/check", json=capture()).json()["state"] == "outside"


def test_schema_indexes_and_srid(db_engine):
    with db_engine.connect() as connection:
        version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
        assert version == "0001_geospatial"
        indexes = connection.execute(
            text("SELECT indexdef FROM pg_indexes WHERE indexname='ix_coverage_geometry'")
        ).scalar()
        assert "gist" in indexes
        assert (
            connection.execute(
                text("SELECT Find_SRID('public','capture_locations','geometry')")
            ).scalar()
            == 4326
        )


def test_migration_roundtrip(db_engine, migration_config, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", str(db_engine.url.render_as_string(hide_password=False)))
    command.downgrade(migration_config, "base")
    command.upgrade(migration_config, "head")
    with db_engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM coverage_regions")).scalar() == 0

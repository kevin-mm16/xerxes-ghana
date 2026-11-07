"""Reference geography provenance, repair limits, and separation from monitoring."""

import pytest
from sqlalchemy import text

from xerxes_api.import_boundaries import read_gss_archive, store_boundaries


def district(*, spike=False):
    points = [[-2, 5], [-1, 5], [-1, 6]]
    if spike:
        points += [[-1.5, 6], [-1.5, 6.2], [-1.5, 6]]
    points += [[-2, 6], [-2, 5]]
    return {
        "code": "Test region/Test district",
        "name": "Test district",
        "region": "Test region",
        "geometry": {"type": "Polygon", "coordinates": [points]},
    }


def test_reference_boundaries_provenance_bbox_and_coverage_separation(spatial):
    client, session = spatial
    first = store_boundaries(session, [district()])
    session.commit()
    assert first == {"imported": 1, "existing": 0, "repaired": 0}
    assert store_boundaries(session, [district()])["existing"] == 1
    data = client.get("/api/v1/map/features?layers=boundaries").json()
    assert len(data["features"]) == 1
    feature = data["features"][0]
    assert feature["geometry"]["type"] == "MultiPolygon"
    assert feature["properties"]["featureType"] == "administrative_boundary"
    assert feature["properties"]["layer"] == "boundaries"
    assert feature["properties"]["isDemo"] is False
    assert "gss-phc2021" in feature["properties"]["datasetVersion"]
    assert feature["properties"]["sourceUrl"].startswith("https://statsbank.statsghana.gov.gh/")
    assert feature["properties"]["sourceDate"] == "2023-10-05"
    assert "licence" in feature["properties"]["licenseNote"]
    assert "observedAt" not in feature["properties"]
    assert (
        client.get("/api/v1/map/features?layers=boundaries&bbox=0,0,1,1").json()["features"] == []
    )
    # Reference outlines must never expand monitoring eligibility or replace demo polygons.
    coverage = client.get("/api/v1/coverage").json()["features"]
    assert len(coverage) == 1 and coverage[0]["properties"]["isDemo"] is True


def test_minor_geometry_repair_is_recorded(spatial):
    _, session = spatial
    assert store_boundaries(session, [district(spike=True)])["repaired"] == 1
    row = session.execute(
        text("SELECT ST_IsValid(geometry),geometry_repaired FROM administrative_boundaries")
    ).one()
    assert tuple(row) == (True, True)


def test_import_rejects_different_archive(tmp_path):
    archive = tmp_path / "unreviewed.zip"
    archive.write_bytes(b"unreviewed source")
    with pytest.raises(ValueError, match="checksum"):
        read_gss_archive(archive)


def test_large_repair_is_rejected(spatial):
    _, session = spatial
    feature = district()
    feature["geometry"]["coordinates"] = [[[-2, 5], [-1, 6], [-1, 5], [-2, 6], [-2, 5]]]
    with pytest.raises(ValueError, match="Unsafe or empty"), session.begin_nested():
        store_boundaries(session, [feature])
    assert session.execute(text("SELECT count(*) FROM boundary_datasets")).scalar() == 0

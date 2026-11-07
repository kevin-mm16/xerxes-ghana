"""Public reference outlines, never monitoring coverage or observation geometry."""

import json

from sqlalchemy import text

from xerxes_api.schemas import FeatureProperties, GeoFeature


def boundary_features(session, *, bbox=None, limit=501):
    params = {"limit": limit}
    clause = ""
    if bbox:
        clause = "AND ST_Intersects(b.geometry,ST_MakeEnvelope(:west,:south,:east,:north,4326))"
        params.update(bbox)
    rows = session.execute(
        text(
            """
            SELECT b.id,b.name,b.region,b.level,d.version,d.source_name,d.source_url,
                d.source_date,d.license_note,
                ST_AsGeoJSON(ST_Multi(ST_SimplifyPreserveTopology(b.geometry,0.0003)),6) AS geojson
            FROM administrative_boundaries b JOIN boundary_datasets d ON d.id=b.dataset_id
            WHERE d.id=(SELECT id FROM boundary_datasets ORDER BY imported_at DESC,id DESC LIMIT 1)
        """
            + clause
            + " ORDER BY b.name,b.id LIMIT :limit"
        ),
        params,
    ).mappings()
    return [
        GeoFeature(
            id=row["id"],
            geometry=json.loads(row["geojson"]),
            properties=FeatureProperties(
                feature_type="administrative_boundary",
                layer="boundaries",
                title=row["name"],
                source=row["source_name"],
                source_url=row["source_url"],
                source_date=row["source_date"].isoformat(),
                dataset_version=row["version"],
                boundary_level=row["level"],
                license_note=row["license_note"],
                region=row["region"],
                public_label=f"{row['name']}, {row['region']}",
                summary="GSS census district outline. Not a town boundary or a monitoring area. "
                "Display geometry is simplified; full source geometry is retained in PostGIS.",
            ),
        )
        for row in rows
    ]

"""Authoritative PostGIS coverage queries. No capture coordinates are returned."""

import json
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from xerxes_api.db import SessionDep
from xerxes_api.schemas import (
    CaptureInput,
    CoverageResult,
    FeatureCollection,
    FeatureProperties,
    GeoFeature,
    RegionRef,
)

router = APIRouter(prefix="/api/v1/coverage", tags=["coverage"])
ACTIVE = "status = 'active' AND valid_from <= now() AND (valid_to IS NULL OR valid_to > now())"


def coverage_check(session: Session, capture: CaptureInput) -> CoverageResult:
    rows = (
        session.execute(
            text(f"""
        WITH point AS (SELECT ST_SetSRID(ST_MakePoint(:lng,:lat),4326) AS geom)
        SELECT id,code,name,version,is_demo,
            ST_Covers(geometry,point.geom) AS covered,
            ST_DWithin(ST_Boundary(geometry)::geography,
                       point.geom::geography,:accuracy) AS ambiguous
        FROM coverage_regions CROSS JOIN point WHERE {ACTIVE}
        ORDER BY code
    """),
            {
                "lat": capture.latitude,
                "lng": capture.longitude,
                "accuracy": capture.accuracy_meters,
            },
        )
        .mappings()
        .all()
    )
    matched = [
        RegionRef(**{k: row[k] for k in ("id", "code", "name", "version", "is_demo")})
        for row in rows
        if row["covered"]
    ]
    nearby = [
        RegionRef(**{k: row[k] for k in ("id", "code", "name", "version", "is_demo")})
        for row in rows
        if row["ambiguous"] and not row["covered"]
    ]
    ambiguous = any(row["ambiguous"] for row in rows)
    return CoverageResult(
        inside_coverage=bool(matched),
        state="uncertain" if ambiguous else "inside" if matched else "outside",
        boundary_ambiguous=ambiguous,
        matched_regions=matched,
        nearby_regions=nearby,
    )


def coverage_features(session: Session, bbox=None, region_id=None, limit=501):
    clauses = [ACTIVE]
    params = {"limit": limit}
    if bbox:
        clauses.append("ST_Intersects(geometry,ST_MakeEnvelope(:west,:south,:east,:north,4326))")
        params.update(bbox)
    if region_id:
        clauses.append("id=:id")
        params["id"] = region_id
    rows = session.execute(
        text(f"""
        SELECT id,code,name,description,version,is_demo,ST_AsGeoJSON(geometry) AS geojson
        FROM coverage_regions WHERE {" AND ".join(clauses)} ORDER BY code LIMIT :limit
    """),
        params,
    ).mappings()
    return [
        GeoFeature(
            id=row["id"],
            geometry=json.loads(row["geojson"]),
            properties=FeatureProperties(
                feature_type="coverage_region",
                layer="coverage",
                title=row["name"],
                source="XERSXES development geometry" if row["is_demo"] else "XERSXES",
                summary=row["description"],
                code=row["code"],
                version=row["version"],
                is_demo=row["is_demo"],
                status="active",
            ),
        )
        for row in rows
    ]


@router.get("", response_model=FeatureCollection, response_model_exclude_none=True)
def list_coverage(session: SessionDep):
    features = coverage_features(session)
    return FeatureCollection(features=features[:500], truncated=len(features) > 500)


@router.post("/check", response_model=CoverageResult)
def check_coverage(capture: CaptureInput, session: SessionDep):
    return coverage_check(session, capture)


@router.get("/{region_id}", response_model=GeoFeature, response_model_exclude_none=True)
def get_coverage(region_id: UUID, session: SessionDep):
    features = coverage_features(session, region_id=region_id)
    if not features:
        raise HTTPException(404, "Coverage region not found")
    return features[0]

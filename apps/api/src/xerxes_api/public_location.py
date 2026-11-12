"""Explicit geographic generalization from reviewed geography, never capture data."""

import json
import os

from fastapi import HTTPException
from sqlalchemy import text


def generate_public_location(session, observation_id, policy):
    reviewed = session.execute(
        text("""SELECT ST_AsGeoJSON(geometry) FROM observation_locations
      WHERE observation_id=:id"""),
        {"id": observation_id},
    ).scalar_one_or_none()
    if reviewed is None:
        raise HTTPException(409, "Save a reviewed activity location first")
    if policy == "coverage_region":
        row = (
            session.execute(
                text("""SELECT ST_AsGeoJSON(c.geometry) geometry,c.name label
          FROM observations o JOIN coverage_regions c ON c.id=o.coverage_region_id
          JOIN observation_locations l ON l.observation_id=o.id
          WHERE o.id=:id AND ST_Covers(c.geometry,l.geometry)"""),
                {"id": observation_id},
            )
            .mappings()
            .first()
        )
        if not row:
            raise HTTPException(
                409,
                "Coverage-region policy requires an assigned area covering the reviewed location",
            )
        return {
            "geometry": json.loads(row["geometry"]),
            "label": row["label"],
            "precisionLevel": "coverage-region",
            "policy": policy,
        }
    try:
        size = int(os.environ.get("PUBLIC_GRID_METERS", "2000"))
    except ValueError:
        raise HTTPException(503, "Public location policy is not configured") from None
    if size not in {1000, 2000, 5000}:
        raise HTTPException(503, "Public location policy is not configured")
    # UTM30N provides a fixed metric grid for Ghana. Publish full cells covering
    # reviewed geometry; polygons crossing cells expand rather than shrink to a centroid.
    geometry = session.execute(
        text("""
        WITH metric AS (SELECT ST_Transform(geometry,32630) g FROM observation_locations
          WHERE observation_id=:id), bounds AS (SELECT
            floor(ST_XMin(Box2D(g))/:size)*:size x1,
            floor(ST_YMin(Box2D(g))/:size)*:size y1,
            (floor(ST_XMax(Box2D(g))/:size)+1)*:size x2,
            (floor(ST_YMax(Box2D(g))/:size)+1)*:size y2 FROM metric)
        SELECT ST_AsGeoJSON(ST_Transform(ST_MakeEnvelope(x1,y1,x2,y2,32630),4326)) FROM bounds
    """),
        {"id": observation_id, "size": size},
    ).scalar_one()
    return {
        "geometry": json.loads(geometry),
        "label": f"Generalized {size // 1000} km grid area",
        "precisionLevel": f"grid-{size}m",
        "policy": policy,
    }

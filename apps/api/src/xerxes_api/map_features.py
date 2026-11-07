"""Stable public GeoJSON boundary; future inference workers do not own map rendering."""

import json
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import AwareDatetime
from sqlalchemy import text

from xerxes_api.coverage import coverage_features
from xerxes_api.db import SessionDep
from xerxes_api.observations import PUBLIC_SELECT
from xerxes_api.schemas import FeatureCollection, FeatureProperties, GeoFeature, parse_bbox

router = APIRouter(prefix="/api/v1/map", tags=["map"])


@router.get("/features", response_model=FeatureCollection, response_model_exclude_none=True)
def map_features(
    session: SessionDep,
    bbox: str | None = None,
    layers: str = "coverage,observations",
    from_: Annotated[AwareDatetime | None, Query(alias="from")] = None,
    to: AwareDatetime | None = None,
    status: Literal["approved"] = "approved",
    confidence_min: float | None = Query(default=None, ge=0, le=1),
    limit: int = Query(default=500, ge=1, le=1000),
):
    try:
        bounds = parse_bbox(bbox)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    requested = set(layers.split(","))
    if not requested or requested - {"coverage", "observations", "ai", "satellite"}:
        raise HTTPException(422, "Unknown map layer")
    if from_ and to and from_ > to:
        raise HTTPException(422, "from must be before to")
    features = (
        coverage_features(session, bbox=bounds, limit=limit + 1) if "coverage" in requested else []
    )
    if "observations" in requested and not confidence_min:
        params = {"limit": limit + 1}
        clauses = []
        if bounds:
            clauses.append(
                "ST_Intersects(p.geometry,ST_MakeEnvelope(:west,:south,:east,:north,4326))"
            )
            params.update(bounds)
        if from_:
            clauses.append("o.observed_at >= :from")
            params["from"] = from_
        if to:
            clauses.append("o.observed_at <= :to")
            params["to"] = to
        query = PUBLIC_SELECT + "".join(" AND " + clause for clause in clauses)
        rows = session.execute(
            text(query + " ORDER BY o.observed_at DESC,o.id LIMIT :limit"), params
        ).mappings()
        for row in rows:
            features.append(
                GeoFeature(
                    id=row["id"],
                    geometry=json.loads(row["geojson"]),
                    properties=FeatureProperties(
                        feature_type="citizen_observation",
                        layer="observations",
                        title=row["title"],
                        source="Human-reviewed observation",
                        status=status,
                        summary=row["description"],
                        public_label=row["label"],
                        precision_level=row["precision_level"],
                        observation_id=row["id"],
                        observed_at=row["observed_at"].date().isoformat(),
                        review_state="approved",
                    ),
                )
            )
    # Reserved AI/satellite layers return no fabricated predictions or confidence scores.
    return FeatureCollection(features=features[:limit], truncated=len(features) > limit)

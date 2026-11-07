"""Private intake and explicitly published, sanitized reads."""

import json
from uuid import UUID

from fastapi import APIRouter, HTTPException
from geoalchemy2.elements import WKTElement
from sqlalchemy import text

from xerxes_api.coverage import coverage_check
from xerxes_api.db import SessionDep
from xerxes_api.models import CaptureLocation, Observation
from xerxes_api.schemas import ObservationInput, PublicObservation, SubmissionReceipt

router = APIRouter(prefix="/api/v1/observations", tags=["observations"])
PUBLIC_SELECT = """
    SELECT o.id, o.observed_at, p.title, p.description, p.label, p.precision_level,
           ST_AsGeoJSON(p.geometry) AS geojson
    FROM observations o JOIN public_locations p ON p.observation_id=o.id
    WHERE o.status='approved'
"""


def public_observation(row):
    return PublicObservation(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        observed_at=row["observed_at"].date().isoformat(),
        status="approved",
        public_location=json.loads(row["geojson"]),
        public_label=row["label"],
        precision_level=row["precision_level"],
    )


@router.post("", status_code=201, response_model=SubmissionReceipt)
def create_observation(body: ObservationInput, session: SessionDep):
    capture = body.capture_location
    result = coverage_check(session, capture) if capture else None
    # Multiple overlapping regions or boundary uncertainty require human assignment.
    region_id = (
        result.matched_regions[0].id
        if result and result.state == "inside" and len(result.matched_regions) == 1
        else None
    )
    observation = Observation(
        coverage_region_id=region_id,
        title=body.title,
        description=body.description,
        manual_location=body.manual_location,
        observed_at=body.observed_at,
        anonymous=body.anonymous,
        media_type=body.media_type,
        status="pending",
        coverage_state=result.state if result else "manual",
    )
    session.add(observation)
    session.flush()
    if capture:
        session.add(
            CaptureLocation(
                observation_id=observation.id,
                geometry=WKTElement(f"POINT({capture.longitude} {capture.latitude})", srid=4326),
                accuracy_meters=capture.accuracy_meters,
                captured_at=capture.captured_at,
                source=capture.source,
            )
        )
    session.commit()
    session.refresh(observation)
    return SubmissionReceipt(
        id=observation.id,
        status="pending",
        submitted_at=observation.submitted_at,
        coverage_state=observation.coverage_state,
    )


@router.get("/{observation_id}", response_model=PublicObservation)
def get_observation(observation_id: UUID, session: SessionDep):
    row = (
        session.execute(text(PUBLIC_SELECT + " AND o.id=:id"), {"id": observation_id})
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(404, "Published observation not found")
    return public_observation(row)

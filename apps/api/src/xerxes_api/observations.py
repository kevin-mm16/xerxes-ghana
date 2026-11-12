"""Private intake and explicitly published, sanitized reads."""

import hashlib
import json
from uuid import UUID

from fastapi import APIRouter, HTTPException
from geoalchemy2.elements import WKTElement
from sqlalchemy import text

from xerxes_api.coverage import coverage_check
from xerxes_api.db import SessionDep
from xerxes_api.models import CaptureLocation, EvidenceMedia, Observation
from xerxes_api.schemas import ObservationInput, PublicObservation, SubmissionReceipt
from xerxes_api.uploads import ACCEPTED_UPLOAD_STATES, authorized_media, media_status

router = APIRouter(prefix="/api/v1/observations", tags=["observations"])
PUBLIC_SELECT = """
    SELECT o.id, o.observed_at, p.title, p.description, p.label, p.precision_level,
           ST_AsGeoJSON(p.geometry) AS geojson
    FROM observations o JOIN public_locations p ON p.observation_id=o.id
    WHERE o.status='approved'
"""


def receipt(session, observation):
    media = session.query(EvidenceMedia).filter_by(observation_id=observation.id).one_or_none()
    return SubmissionReceipt(
        id=observation.id,
        status="pending",
        submitted_at=observation.submitted_at,
        coverage_state=observation.coverage_state,
        media=media_status(media) if media else None,
    )


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


@router.post(
    "", status_code=201, response_model=SubmissionReceipt, response_model_exclude_none=True
)
def create_observation(body: ObservationInput, session: SessionDep):
    fingerprint = hashlib.sha256(
        body.model_dump_json(exclude={"submission_id"}).encode()
    ).hexdigest()
    if body.submission_id:
        session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
            {"key": "xerxes:submission:" + str(body.submission_id)},
        )
        existing = (
            session.query(Observation).filter_by(submission_id=body.submission_id).one_or_none()
        )
        if existing:
            if existing.submission_hash != fingerprint:
                raise HTTPException(
                    409, "This submission reference was already used for different details"
                )
            if body.media:
                media = authorized_media(session, body.media.upload_id, body.media.upload_token)
                if media.observation_id != existing.id:
                    raise HTTPException(409, "This upload belongs to another observation")
            return receipt(session, existing)
    media = None
    if body.media:
        media = authorized_media(session, body.media.upload_id, body.media.upload_token, lock=True)
        if media.observation_id:
            raise HTTPException(409, "This upload is already attached to an observation")
        if media.processing_status not in ACCEPTED_UPLOAD_STATES:
            raise HTTPException(409, "Complete a valid upload before submitting this observation")
    capture = body.capture_location
    result = coverage_check(session, capture) if capture else None
    # Multiple overlapping regions or boundary uncertainty require human assignment.
    region_id = (
        result.matched_regions[0].id
        if result and result.state == "inside" and len(result.matched_regions) == 1
        else None
    )
    observation = Observation(
        submission_id=body.submission_id,
        submission_hash=fingerprint if body.submission_id else None,
        coverage_region_id=region_id,
        title=body.title,
        description=body.description,
        manual_location=body.manual_location,
        observed_at=body.observed_at,
        anonymous=body.anonymous,
        media_type=media.media_kind if media else "none",
        status="pending",
        coverage_state=result.state if result else "manual",
    )
    session.add(observation)
    session.flush()
    if media:
        media.observation_id = observation.id
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
    return receipt(session, observation)


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

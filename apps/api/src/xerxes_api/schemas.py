"""Validated intake and deliberately separate public API representations."""

import math
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        str_strip_whitespace=True,
        allow_inf_nan=False,
    )


class CaptureInput(ApiModel):
    latitude: float = Field(ge=-90, le=90, strict=True)
    longitude: float = Field(ge=-180, le=180, strict=True)
    accuracy_meters: float = Field(ge=0, le=10000, strict=True)
    captured_at: AwareDatetime
    source: Literal["browser-geolocation", "manual", "drone"] = "browser-geolocation"

    @field_validator("captured_at")
    @classmethod
    def not_in_future(cls, value):
        if value > datetime.now(UTC) + timedelta(minutes=5):
            raise ValueError("Capture timestamp is in the future")
        return value


class RegionRef(ApiModel):
    id: UUID
    code: str
    name: str
    version: int
    is_demo: bool


class CoverageResult(ApiModel):
    inside_coverage: bool
    state: Literal["inside", "outside", "uncertain"]
    boundary_ambiguous: bool
    matched_regions: list[RegionRef]
    nearby_regions: list[RegionRef]


class ObservationInput(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=5000)
    observed_at: AwareDatetime
    capture_location: CaptureInput | None = None
    manual_location: str | None = Field(default=None, min_length=1, max_length=500)
    media_type: Literal["none", "image", "video", "mixed"] = "none"
    anonymous: bool = True
    consent: Literal[True]

    @model_validator(mode="after")
    def valid_context(self):
        if not self.capture_location and not self.manual_location:
            raise ValueError("Provide a capture location or a manual location description")
        if self.observed_at > datetime.now(UTC) + timedelta(minutes=5):
            raise ValueError("Observation date is in the future")
        return self


class SubmissionReceipt(ApiModel):
    id: UUID
    status: Literal["pending"]
    submitted_at: datetime
    coverage_state: str


class PublicObservation(ApiModel):
    id: UUID
    title: str
    description: str
    observed_at: str
    status: Literal["approved"]
    public_location: dict
    public_label: str
    precision_level: str


class FeatureProperties(ApiModel):
    feature_type: Literal[
        "coverage_region",
        "citizen_observation",
        "approved_video",
        "ai_candidate",
        "satellite_change",
    ]
    layer: Literal["coverage", "observations", "ai", "satellite"]
    title: str
    source: str
    summary: str | None = None
    code: str | None = None
    version: int | None = None
    status: str | None = None
    is_demo: bool = False
    public_label: str | None = None
    precision_level: str | None = None
    observed_at: str | None = None
    observation_id: UUID | None = None
    model_version: str | None = None
    inference_timestamp: datetime | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source_imagery: list[str] | None = None
    review_state: str | None = None


class GeoFeature(ApiModel):
    type: Literal["Feature"] = "Feature"
    id: UUID
    geometry: dict
    properties: FeatureProperties


class FeatureCollection(ApiModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[GeoFeature]
    truncated: bool = False


def parse_bbox(value: str | None):
    if value is None:
        return None
    try:
        parts = [float(part) for part in value.split(",")]
        west, south, east, north = parts
        if (
            not all(math.isfinite(v) for v in parts)
            or not -180 <= west < east <= 180
            or not -90 <= south < north <= 90
        ):
            raise ValueError
        return {"west": west, "south": south, "east": east, "north": north}
    except (ValueError, TypeError):
        raise ValueError("bbox must be west,south,east,north with increasing valid coordinates")

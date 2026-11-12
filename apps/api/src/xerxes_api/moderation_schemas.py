"""Bounded private review commands; no arbitrary storage keys or media URLs."""

from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from xerxes_api.schemas import ApiModel


class AssignInput(ApiModel):
    reviewer_id: UUID | None = None


class LocationInput(ApiModel):
    geometry: dict
    reason: str = Field(min_length=3, max_length=1000)

    @field_validator("geometry")
    @classmethod
    def valid_geojson(cls, value):
        # PostGIS validates topology and coordinates after this bounded shape check.
        import json

        if (
            set(value) != {"type", "coordinates"}
            or value.get("type") not in {"Point", "Polygon", "MultiPolygon"}
            or len(json.dumps(value, allow_nan=False)) > 48000
        ):
            raise ValueError("Provide a bounded Point, Polygon or MultiPolygon geometry")
        return value


class PrivacyChecklist(ApiModel):
    summary_reviewed: bool = False
    location_reviewed: bool = False
    identifiers_clear: bool = False


class DraftInput(ApiModel):
    sanitized_title: str = Field(max_length=160)
    sanitized_summary: str = Field(max_length=5000)
    media_decision: Literal["undecided", "exclude", "publish"]
    public_location_policy: Literal["grid", "coverage_region"] = "grid"
    privacy_checklist: PrivacyChecklist


class DecisionInput(ApiModel):
    decision: Literal["approve", "reject"]
    reason: str = Field(default="", max_length=1000)


class WithdrawInput(ApiModel):
    reason: str = Field(default="", max_length=1000)

"""Input contracts can be checked without a running database."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from xerxes_api.schemas import CaptureInput, ObservationInput, parse_bbox


def test_nonfinite_coordinates_rejected():
    with pytest.raises(ValidationError):
        CaptureInput(
            latitude=float("nan"), longitude=0, accuracy_meters=10, captured_at=datetime.now(UTC)
        )


def test_consent_and_location_required():
    with pytest.raises(ValidationError):
        ObservationInput(description="Context", observed_at=datetime.now(UTC), consent=True)
    with pytest.raises(ValidationError):
        ObservationInput(
            description="Context",
            observed_at=datetime.now(UTC),
            manual_location="Nearby landmark",
            consent=False,
        )


def test_bbox_validation():
    assert parse_bbox("-3,4,1,12")["west"] == -3
    for value in ["1,2,3", "-181,0,1,2", "0,2,1,1", "nan,0,1,2"]:
        with pytest.raises(ValueError):
            parse_bbox(value)

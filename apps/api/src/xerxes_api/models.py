"""Private storage models. Public representations are constructed separately."""

from datetime import datetime
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from xerxes_api.db import Base


class CoverageRegion(Base):
    __tablename__ = "coverage_regions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    geometry = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="active")
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    coverage_region_id: Mapped[UUID | None] = mapped_column(ForeignKey("coverage_regions.id"))
    title: Mapped[str | None] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    manual_location: Mapped[str | None] = mapped_column(String(500))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    status: Mapped[str] = mapped_column(String(16), default="pending")
    media_type: Mapped[str] = mapped_column(String(16), default="none")
    anonymous: Mapped[bool] = mapped_column(Boolean, default=True)
    coverage_state: Mapped[str] = mapped_column(String(16), default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CaptureLocation(Base):
    __tablename__ = "capture_locations"

    observation_id: Mapped[UUID] = mapped_column(ForeignKey("observations.id"), primary_key=True)
    geometry = mapped_column(Geometry("POINT", srid=4326, spatial_index=False), nullable=False)
    accuracy_meters: Mapped[float] = mapped_column(Float)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(32))


class ObservationLocation(Base):
    """Optional reviewed activity geometry; never inferred from a device position."""

    __tablename__ = "observation_locations"

    observation_id: Mapped[UUID] = mapped_column(ForeignKey("observations.id"), primary_key=True)
    geometry = mapped_column(Geometry("GEOMETRY", srid=4326, spatial_index=False), nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(80))


class PublicLocation(Base):
    """A publication record containing independently sanitized text and generalized geometry."""

    __tablename__ = "public_locations"

    observation_id: Mapped[UUID] = mapped_column(ForeignKey("observations.id"), primary_key=True)
    geometry = mapped_column(Geometry("GEOMETRY", srid=4326, spatial_index=False), nullable=False)
    label: Mapped[str] = mapped_column(String(160))
    precision_level: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

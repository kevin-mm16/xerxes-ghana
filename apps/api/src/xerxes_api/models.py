"""Private storage models. Public representations are constructed separately."""

from datetime import date, datetime
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from xerxes_api.db import Base


class BoundaryDataset(Base):
    __tablename__ = "boundary_datasets"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    version: Mapped[str] = mapped_column(String(100), unique=True)
    source_name: Mapped[str] = mapped_column(String(160))
    source_url: Mapped[str] = mapped_column(Text)
    download_url: Mapped[str] = mapped_column(Text)
    source_date: Mapped[date] = mapped_column(Date)
    census_year: Mapped[int] = mapped_column(Integer)
    archive_sha256: Mapped[str] = mapped_column(String(64))
    license_note: Mapped[str] = mapped_column(Text)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AdministrativeBoundary(Base):
    __tablename__ = "administrative_boundaries"
    __table_args__ = (
        UniqueConstraint("dataset_id", "source_code"),
        Index("ix_administrative_geometry", "geometry", postgresql_using="gist"),
        Index("ix_administrative_dataset", "dataset_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    dataset_id: Mapped[UUID] = mapped_column(ForeignKey("boundary_datasets.id", ondelete="CASCADE"))
    source_code: Mapped[str] = mapped_column(String(180))
    name: Mapped[str] = mapped_column(String(160))
    region: Mapped[str] = mapped_column(String(160))
    level: Mapped[str] = mapped_column(String(32))
    geometry = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False
    )
    geometry_repaired: Mapped[bool] = mapped_column(Boolean, default=False)


class CoverageRegion(Base):
    __tablename__ = "coverage_regions"
    __table_args__ = (
        Index("ix_coverage_geometry", "geometry", postgresql_using="gist"),
        Index("ix_coverage_validity", "status", "valid_from", "valid_to"),
    )

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
    __table_args__ = (
        Index("ix_observations_public", "status", "observed_at"),
        Index("ix_observations_coverage", "coverage_region_id"),
    )

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

    observation_id: Mapped[UUID] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True
    )
    geometry = mapped_column(Geometry("POINT", srid=4326, spatial_index=False), nullable=False)
    accuracy_meters: Mapped[float] = mapped_column(Float)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(32))


class ObservationLocation(Base):
    """Optional reviewed activity geometry; never inferred from a device position."""

    __tablename__ = "observation_locations"

    observation_id: Mapped[UUID] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True
    )
    geometry = mapped_column(Geometry("GEOMETRY", srid=4326, spatial_index=False), nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(80))


class PublicLocation(Base):
    """A publication record containing independently sanitized text and generalized geometry."""

    __tablename__ = "public_locations"
    __table_args__ = (Index("ix_public_geometry", "geometry", postgresql_using="gist"),)

    observation_id: Mapped[UUID] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True
    )
    geometry = mapped_column(Geometry("GEOMETRY", srid=4326, spatial_index=False), nullable=False)
    label: Mapped[str] = mapped_column(String(160))
    precision_level: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

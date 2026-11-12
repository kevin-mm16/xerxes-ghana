"""Distinct publication candidates; private review bytes never become public by ACL."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from xerxes_api.db import Base


class PublicMediaState(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class PublishedMedia(Base):
    __tablename__ = "published_media"
    __table_args__ = (Index("ix_published_media_state", "processing_status", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    observation_id: Mapped[UUID] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), unique=True
    )
    source_media_id: Mapped[UUID] = mapped_column(ForeignKey("evidence_media.id"))
    processing_status: Mapped[str] = mapped_column(String(16), default=PublicMediaState.QUEUED)
    processing_error: Mapped[str | None] = mapped_column(String(40))
    public_object_key: Mapped[str | None] = mapped_column(String(240), unique=True)
    thumbnail_object_key: Mapped[str | None] = mapped_column(String(240), unique=True)
    media_kind: Mapped[str] = mapped_column(String(8))
    mime_type: Mapped[str] = mapped_column(String(32))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    sha256: Mapped[str | None] = mapped_column(String(64))
    thumbnail_sha256: Mapped[str | None] = mapped_column(String(64))
    publication_version: Mapped[str | None] = mapped_column(String(200))
    source_review_sha256: Mapped[str] = mapped_column(String(64))
    certified_by: Mapped[UUID] = mapped_column(ForeignKey("reviewers.id"))
    certified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PublicMediaJob(Base):
    __tablename__ = "public_media_jobs"
    __table_args__ = (Index("ix_public_media_jobs_available", "status", "available_at"),)

    media_id: Mapped[UUID] = mapped_column(
        ForeignKey("published_media.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(16), default="queued")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[UUID | None] = mapped_column()
    last_error: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

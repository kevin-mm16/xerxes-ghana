"""Private review state, durable decisions and separate geographic revision history."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from xerxes_api.db import Base


class ReviewStatus(StrEnum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class PublicationStatus(StrEnum):
    NOT_PUBLISHED = "not_published"
    PUBLISHED = "published"
    WITHDRAWN = "withdrawn"


class MediaDecision(StrEnum):
    UNDECIDED = "undecided"
    EXCLUDE = "exclude"
    PUBLISH = "publish"


class ObservationReview(Base):
    __tablename__ = "observation_reviews"
    __table_args__ = (Index("ix_review_queue", "review_status", "publication_status"),)

    observation_id: Mapped[UUID] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True
    )
    review_status: Mapped[str] = mapped_column(String(16), default=ReviewStatus.PENDING)
    publication_status: Mapped[str] = mapped_column(
        String(16), default=PublicationStatus.NOT_PUBLISHED
    )
    assignee_id: Mapped[UUID | None] = mapped_column(ForeignKey("reviewers.id"))
    sanitized_title: Mapped[str] = mapped_column(String(160), default="")
    sanitized_summary: Mapped[str] = mapped_column(Text, default="")
    media_decision: Mapped[str] = mapped_column(String(16), default=MediaDecision.UNDECIDED)
    public_location_policy: Mapped[str] = mapped_column(String(24), default="grid")
    summary_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    location_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    identifiers_clear: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ModerationAuditEvent(Base):
    __tablename__ = "moderation_audit_events"
    __table_args__ = (Index("ix_moderation_audit_observation", "observation_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    observation_id: Mapped[UUID] = mapped_column(ForeignKey("observations.id", ondelete="CASCADE"))
    reviewer_id: Mapped[UUID | None] = mapped_column(ForeignKey("reviewers.id"))
    action: Mapped[str] = mapped_column(String(40))
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    private_note: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ObservationLocationRevision(Base):
    __tablename__ = "observation_location_revisions"
    __table_args__ = (Index("ix_location_revisions_observation", "observation_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    observation_id: Mapped[UUID] = mapped_column(ForeignKey("observations.id", ondelete="CASCADE"))
    reviewer_id: Mapped[UUID] = mapped_column(ForeignKey("reviewers.id"))
    old_geometry = mapped_column(Geometry("GEOMETRY", srid=4326, spatial_index=False))
    new_geometry = mapped_column(
        Geometry("GEOMETRY", srid=4326, spatial_index=False), nullable=False
    )
    reason: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

"""Certified public derivatives and durable processing, separate from private evidence."""

from alembic import op

revision = "0006_public_media"
down_revision = "0005_moderation_publication"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE published_media (
            id uuid PRIMARY KEY,
            observation_id uuid UNIQUE NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
            source_media_id uuid NOT NULL REFERENCES evidence_media(id),
            processing_status varchar(16) NOT NULL DEFAULT 'queued'
                CHECK (processing_status IN ('queued','processing','ready','failed')),
            processing_error varchar(40),
            public_object_key varchar(240) UNIQUE,
            thumbnail_object_key varchar(240) UNIQUE,
            media_kind varchar(8) NOT NULL CHECK (media_kind IN ('image','video')),
            mime_type varchar(32) NOT NULL CHECK (mime_type IN ('image/jpeg','video/mp4')),
            width integer CHECK (width > 0), height integer CHECK (height > 0),
            duration_seconds double precision CHECK (duration_seconds > 0 AND duration_seconds <= 120),
            sha256 varchar(64), thumbnail_sha256 varchar(64), publication_version varchar(200),
            source_review_sha256 varchar(64) NOT NULL,
            certified_by uuid NOT NULL REFERENCES reviewers(id), certified_at timestamptz NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
            published_at timestamptz,
            CHECK (processing_status <> 'ready' OR (
                public_object_key IS NOT NULL AND thumbnail_object_key IS NOT NULL
                AND sha256 IS NOT NULL AND thumbnail_sha256 IS NOT NULL
                AND width IS NOT NULL AND height IS NOT NULL
                AND processed_at IS NOT NULL AND publication_version IS NOT NULL))
        )
    """)
    op.execute(
        "CREATE INDEX ix_published_media_state ON published_media(processing_status,created_at)"
    )
    op.execute("""
        CREATE TABLE public_media_jobs (
            media_id uuid PRIMARY KEY REFERENCES published_media(id) ON DELETE CASCADE,
            status varchar(16) NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','running','succeeded','failed')),
            attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
            available_at timestamptz NOT NULL DEFAULT now(),
            locked_until timestamptz, lease_token uuid, last_error varchar(40),
            created_at timestamptz NOT NULL DEFAULT now(),
            CHECK (status <> 'running' OR (locked_until IS NOT NULL AND lease_token IS NOT NULL))
        )
    """)
    op.execute(
        "CREATE INDEX ix_public_media_jobs_available ON public_media_jobs(status,available_at)"
    )


def downgrade():
    op.execute("DROP TABLE public_media_jobs")
    op.execute("DROP TABLE published_media")

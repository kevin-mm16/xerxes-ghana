"""Private capability-scoped ingestion and durable media jobs."""

from alembic import op

revision = "0003_private_media"
down_revision = "0002_administrative_boundaries"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE observations ADD COLUMN submission_id uuid UNIQUE")
    op.execute("ALTER TABLE observations ADD COLUMN submission_hash varchar(64)")
    op.execute("""
        CREATE TABLE evidence_media (
            id uuid PRIMARY KEY,
            observation_id uuid UNIQUE REFERENCES observations(id) ON DELETE SET NULL,
            upload_token_hash varchar(64) NOT NULL,
            original_filename varchar(255) NOT NULL,
            declared_mime_type varchar(80) NOT NULL,
            detected_mime_type varchar(80),
            expected_size bigint NOT NULL CHECK (expected_size > 0 AND expected_size <= 52428800),
            file_size bigint CHECK (file_size > 0 AND file_size <= expected_size),
            original_sha256 varchar(64),
            original_object_key varchar(240) UNIQUE NOT NULL,
            review_object_key varchar(240), thumbnail_object_key varchar(240),
            review_sha256 varchar(64), thumbnail_sha256 varchar(64),
            processing_status varchar(24) NOT NULL CHECK (processing_status IN (
                'awaiting_upload','uploading','quarantined','processing','review_ready',
                'failed','expired')),
            processing_error varchar(40),
            media_kind varchar(8) NOT NULL CHECK (media_kind IN ('image','video')),
            width integer CHECK (width > 0), height integer CHECK (height > 0),
            duration_seconds double precision CHECK (duration_seconds > 0 AND duration_seconds <= 120),
            processing_version varchar(100),
            expires_at timestamptz NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
            CHECK (processing_status <> 'review_ready' OR (
                review_object_key IS NOT NULL AND thumbnail_object_key IS NOT NULL
                AND review_sha256 IS NOT NULL AND thumbnail_sha256 IS NOT NULL
                AND original_sha256 IS NOT NULL AND processing_version IS NOT NULL))
        )
    """)
    op.execute("CREATE INDEX ix_media_processing ON evidence_media(processing_status,created_at)")
    op.execute("CREATE INDEX ix_media_hash ON evidence_media(original_sha256)")
    op.execute("""
        CREATE TABLE media_processing_jobs (
            media_id uuid PRIMARY KEY REFERENCES evidence_media(id) ON DELETE CASCADE,
            status varchar(16) NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','running','succeeded','failed')),
            attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
            available_at timestamptz NOT NULL DEFAULT now(),
            locked_until timestamptz, lease_token uuid, last_error varchar(40),
            created_at timestamptz NOT NULL DEFAULT now(),
            CHECK (status <> 'running' OR (locked_until IS NOT NULL AND lease_token IS NOT NULL))
        )
    """)
    op.execute("CREATE INDEX ix_media_jobs_available ON media_processing_jobs(status,available_at)")


def downgrade():
    op.execute("DROP TABLE media_processing_jobs")
    op.execute("DROP TABLE evidence_media")
    op.execute("ALTER TABLE observations DROP COLUMN submission_hash")
    op.execute("ALTER TABLE observations DROP COLUMN submission_id")

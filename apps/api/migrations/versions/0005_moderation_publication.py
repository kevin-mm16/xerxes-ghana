"""Separate review/publication states and keep private geography revision history."""

from alembic import op

revision = "0005_moderation_publication"
down_revision = "0004_moderator_sessions"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE observation_reviews (
            observation_id uuid PRIMARY KEY REFERENCES observations(id) ON DELETE CASCADE,
            review_status varchar(16) NOT NULL DEFAULT 'pending'
              CHECK (review_status IN ('pending','in_review','approved','rejected')),
            publication_status varchar(16) NOT NULL DEFAULT 'not_published'
              CHECK (publication_status IN ('not_published','published','withdrawn')),
            assignee_id uuid REFERENCES reviewers(id),
            sanitized_title varchar(160) NOT NULL DEFAULT '',
            sanitized_summary text NOT NULL DEFAULT '',
            media_decision varchar(16) NOT NULL DEFAULT 'undecided'
              CHECK (media_decision IN ('undecided','exclude','publish')),
            public_location_policy varchar(24) NOT NULL DEFAULT 'grid'
              CHECK (public_location_policy IN ('grid','coverage_region')),
            summary_reviewed boolean NOT NULL DEFAULT false,
            location_reviewed boolean NOT NULL DEFAULT false,
            identifiers_clear boolean NOT NULL DEFAULT false,
            published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
            CHECK(publication_status <> 'published' OR review_status='approved')
        )
    """)
    op.execute(
        "CREATE INDEX ix_review_queue ON observation_reviews(review_status,publication_status)"
    )
    op.execute("""
        INSERT INTO observation_reviews(observation_id,review_status,publication_status,
          sanitized_title,sanitized_summary,media_decision,public_location_policy,
          summary_reviewed,location_reviewed,published_at)
        SELECT o.id,'approved','published',p.title,p.description,'exclude','coverage_region',
          true,true,p.generated_at FROM observations o
        JOIN public_locations p ON p.observation_id=o.id WHERE o.status='approved'
    """)
    op.execute("""
        CREATE TABLE moderation_audit_events (
            id uuid PRIMARY KEY,
            observation_id uuid NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
            reviewer_id uuid REFERENCES reviewers(id), action varchar(40) NOT NULL,
            details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("""CREATE INDEX ix_moderation_audit_observation
      ON moderation_audit_events(observation_id,created_at)""")
    op.execute("""
        CREATE TABLE observation_location_revisions (
            id uuid PRIMARY KEY,
            observation_id uuid NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
            reviewer_id uuid NOT NULL REFERENCES reviewers(id),
            old_geometry geometry(Geometry,4326),
            new_geometry geometry(Geometry,4326) NOT NULL
              CHECK (ST_IsValid(new_geometry) AND NOT ST_IsEmpty(new_geometry)),
            reason varchar(1000) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("""CREATE INDEX ix_location_revisions_observation
      ON observation_location_revisions(observation_id,created_at)""")


def downgrade():
    op.execute("DROP TABLE observation_location_revisions")
    op.execute("DROP TABLE moderation_audit_events")
    op.execute("DROP TABLE observation_reviews")
